// Weekly recaps. Every Monday from 00:01 the previous week (Mon–Sun) is summed up and saved,
// shown once on the dashboard, and kept on the Recaps page. Recaps can be downloaded as Markdown.
import { icon, taskIcon } from './icons.js';
import { esc, $, $$, sheet, toast } from './ui.js';
import { userData, update } from './store.js';
import { register, go, rerender } from './router.js';
import {
  todayKey, addDays, parseKey, weekStart, weekday, doneOn, daySummary, missesInRange, DAY_NAMES, activeOn,
} from './schedule.js';

const hhmm = (ts) => { const d = new Date(ts); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const minsOf = (ts) => { const d = new Date(ts); return d.getHours() * 60 + d.getMinutes(); };
const fmtMins = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.round(m % 60)).padStart(2, '0')}`;
export const rangeLabel = (ws) => {
  const a = parseKey(ws); const b = parseKey(addDays(ws, 6));
  const sameMonth = a.getMonth() === b.getMonth();
  return `${a.getDate()}${sameMonth ? '' : ` ${a.toLocaleDateString('en-GB', { month: 'short' })}`} – ${b.getDate()} ${b.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`;
};

// Stats for one week, up to `until` (inclusive). Used for recaps and for "Your week" on Home.
export function weekStats(d, ws, until = addDays(ws, 6)) {
  const end = until < addDays(ws, 6) ? until : addDays(ws, 6);
  const days = [];
  for (let k = ws; k <= end; k = addDays(k, 1)) days.push(k);
  let done = 0; let planned = 0;
  const perDay = days.map((k) => { const s = daySummary(d, k); done += s.done; planned += s.total; return { k, done: s.done, total: s.total }; });
  const times = [];
  let earliest = null;
  for (const k of days) {
    const day = (d.doneAt || {})[k] || {};
    for (const [id, ts] of Object.entries(day)) {
      const t = d.tasks.find((x) => x.id === id);
      times.push(minsOf(ts));
      if (!earliest || minsOf(ts) < minsOf(earliest.ts)) earliest = { ts, k, title: t ? t.title : 'A task' };
    }
  }
  const yesterday = addDays(todayKey(), -1);
  const missEnd = end < yesterday ? end : yesterday;
  const misses = missEnd >= ws ? missesInRange(d, ws, missEnd) : [];
  const perTask = d.tasks.filter((t) => days.some((k) => activeOn(t, k))).map((t) => {
    const dn = days.filter((k) => doneOn(d, t, k)).length;
    const ms = misses.filter((m) => m.taskId === t.id).length;
    return { id: t.id, title: t.title, icon: t.icon, done: dn, missed: ms };
  });
  const best = [...perDay].filter((x) => x.total).sort((a, b) => b.done / b.total - a.done / a.total || b.done - a.done)[0];
  const consistent = [...perTask].filter((x) => x.done).sort((a, b) => b.done - a.done || a.missed - b.missed)[0];
  const skipped = [...perTask].filter((x) => x.missed).sort((a, b) => b.missed - a.missed)[0];
  const journal = days.map((k) => (d.journal || {})[k]).filter((e) => e && (e.text || '').trim());
  const moods = journal.filter((e) => e.mood).map((e) => e.mood);
  const notes = (d.notes || []).filter((n) => { const k = todayKeyOf(n.createdAt); return k >= ws && k <= end; }).length;
  const messages = (d.messages || []).filter((m) => { const k = todayKeyOf(m.ts); return k >= ws && k <= end; }).length;
  return {
    ws, until: end, done, planned, rate: planned ? done / planned : null, perDay, perTask,
    earliest: earliest ? { time: hhmm(earliest.ts), day: DAY_NAMES[weekday(earliest.k)], title: earliest.title } : null,
    avgTime: times.length ? fmtMins(times.reduce((a, b) => a + b, 0) / times.length) : null,
    beforeNoon: times.filter((m) => m < 12 * 60).length,
    best: best ? { day: DAY_NAMES[weekday(best.k)], done: best.done, total: best.total } : null,
    consistent, skipped, missed: misses.length,
    journal: journal.length, mood: moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : null, notes, messages,
  };
}
const todayKeyOf = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

const hadActivity = (d, ws) => d.tasks.some((t) => [0, 1, 2, 3, 4, 5, 6].some((i) => activeOn(t, addDays(ws, i))));

// Create recaps for finished weeks. A week is finished from Monday 00:01 of the next week.
export function ensureRecaps() {
  const d = userData();
  if (!d) return [];
  d.recaps = d.recaps || {};
  const now = new Date();
  const thisWs = weekStart(todayKey());
  const ready = !(weekday(todayKey()) === 0 && now.getHours() === 0 && now.getMinutes() < 1);
  const lastFinished = ready ? addDays(thisWs, -7) : addDays(thisWs, -14);
  const made = [];
  for (let i = 0; i < 8; i++) {
    const ws = addDays(lastFinished, -7 * i);
    if (d.recaps[ws]) continue;
    if (!hadActivity(d, ws)) continue;
    const st = weekStats(d, ws);
    if (!st.planned && !st.done && !st.journal) continue;
    made.push(ws);
    d.recaps[ws] = { ...st, createdAt: Date.now(), seen: i > 0, saved: false };
  }
  if (made.length) update(() => {});
  return made;
}

export const unseenRecaps = (d = userData()) => Object.values((d && d.recaps) || {}).filter((r) => !r.seen);
export function recapBadge() { const n = unseenRecaps().length; return n || 0; }

export function recapMarkdown(r) {
  const pct = r.rate == null ? '–' : `${Math.round(r.rate * 100)}%`;
  const lines = [
    `# Week recap · ${rangeLabel(r.ws)}`, '',
    `- **Done:** ${r.done} of ${r.planned} planned (${pct})`,
    `- **Skipped:** ${r.missed}`,
    r.best ? `- **Best day:** ${r.best.day} (${r.best.done}/${r.best.total})` : '',
    r.earliest ? `- **Earliest finish:** ${r.earliest.time} on ${r.earliest.day}, ${r.earliest.title}` : '',
    r.avgTime ? `- **Usual time you finish tasks:** ${r.avgTime}` : '',
    r.consistent ? `- **Most consistent:** ${r.consistent.title} (${r.consistent.done}×)` : '',
    r.skipped ? `- **Skipped most:** ${r.skipped.title} (${r.skipped.missed}×)` : '',
    `- **Journal entries:** ${r.journal}${r.mood ? ` · average mood ${r.mood.toFixed(1)} / 5` : ''}`,
    `- **Notes written:** ${r.notes} · **Channel messages:** ${r.messages}`, '',
    '## Tasks', '', '| Task | Done | Skipped |', '| --- | --- | --- |',
    ...r.perTask.map((t) => `| ${t.title.replace(/\|/g, '/')} | ${t.done} | ${t.missed} |`), '',
    '## Days', '', ...r.perDay.map((x) => `- ${DAY_NAMES[weekday(x.k)]}: ${x.done}/${x.total}`),
  ];
  return lines.filter((l) => l !== '').join('\n').replace(/\n## /g, '\n\n## ').replace(/\n\| Task/, '\n\n| Task') + '\n';
}

export function downloadRecap(r) {
  const blob = new Blob([recapMarkdown(r)], { type: 'text/markdown;charset=utf-8' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `checkit-recap-${r.ws}.md` });
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400);
}

function setFlag(ws, patch) { update((d) => { d.recaps[ws] = { ...d.recaps[ws], ...patch }; }); }

// Visual blocks shared by the popup and the detail page
function recapBody(r, { compact = false } = {}) {
  const pct = r.rate == null ? 0 : Math.round(r.rate * 100);
  const max = Math.max(1, ...r.perDay.map((x) => x.total));
  return `
    <div class="rc-hero">
      <div class="rc-ring" style="--p:${pct}"><b>${pct}<small>%</small></b><span>done</span></div>
      <div class="rc-kpis">
        <div><b>${r.done}</b><span>tasks done</span></div>
        <div><b>${r.planned}</b><span>planned</span></div>
        <div><b>${r.missed}</b><span>skipped</span></div>
        <div><b>${r.journal}</b><span>journal days</span></div>
      </div>
    </div>
    <div class="rc-days">${r.perDay.map((x) => `<div class="rc-day"><div class="rc-bar"><i style="height:${x.total ? Math.max(6, (x.done / max) * 100) : 0}%"></i><em style="height:${(x.total / max) * 100}%"></em></div><span>${DAY_NAMES[weekday(x.k)].slice(0, 2)}</span></div>`).join('')}</div>
    <div class="rc-facts">
      ${r.best ? `<div class="rc-fact"><span>${icon('star', 16)}</span><div><small>Best day</small><b>${r.best.day} · ${r.best.done}/${r.best.total}</b></div></div>` : ''}
      ${r.earliest ? `<div class="rc-fact"><span>${icon('sun', 16)}</span><div><small>Earliest finish</small><b>${r.earliest.time} · ${esc(r.earliest.title)}</b></div></div>` : ''}
      ${r.avgTime ? `<div class="rc-fact"><span>${icon('clock', 16)}</span><div><small>You usually finish at</small><b>${r.avgTime}</b></div></div>` : ''}
      ${r.consistent ? `<div class="rc-fact"><span>${icon('flame', 16)}</span><div><small>Most consistent</small><b>${esc(r.consistent.title)} · ${r.consistent.done}×</b></div></div>` : ''}
      ${r.skipped ? `<div class="rc-fact warn"><span>${icon('flag', 16)}</span><div><small>Skipped most</small><b>${esc(r.skipped.title)} · ${r.skipped.missed}×</b></div></div>` : ''}
      ${r.mood ? `<div class="rc-fact"><span>${icon('heart', 16)}</span><div><small>Average mood</small><b>${r.mood.toFixed(1)} / 5</b></div></div>` : ''}
    </div>
    ${compact ? '' : `
    <h3 class="rc-sub">Every task</h3>
    <div class="rc-tasks">${r.perTask.map((t) => `<div class="rc-task"><span class="tile">${taskIcon(t.icon, 18)}</span><b>${esc(t.title)}</b><span class="rc-n ok">${t.done} done</span><span class="rc-n ${t.missed ? 'bad' : ''}">${t.missed} skipped</span></div>`).join('')}</div>`}`;
}

// Shown once, the first time the dashboard opens after Monday 00:01.
export function showNewRecap() {
  const r = unseenRecaps().sort((a, b) => (a.ws < b.ws ? 1 : -1))[0];
  if (!r) return false;
  setFlag(r.ws, { seen: true });
  // older unseen ones are marked seen too, so only the latest pops up
  unseenRecaps().forEach((x) => setFlag(x.ws, { seen: true }));
  const s = sheet(`
    <div class="sheet-body recap-pop">
      <p class="eyebrow date">Your week in review</p>
      <h3 class="rc-title">${esc(rangeLabel(r.ws))}</h3>
      ${recapBody(r, { compact: true })}
      <div class="row gap rc-actions">
        <button class="btn ghost grow" id="rc-dl">${icon('download', 15)} Download</button>
        <button class="btn primary grow" id="rc-save">${icon('archive', 15)} Save to Recaps</button>
      </div>
      <button class="btn text small full" data-close>Close</button>
    </div>`, { wide: true });
  $('#rc-dl', s.el).onclick = () => downloadRecap(r);
  $('#rc-save', s.el).onclick = () => { setFlag(r.ws, { saved: true }); s.close(); toast('You’ll find it under Recaps.', { title: 'Recap saved', icon: 'archive', action: 'Open', onAction: () => go('recaps', r.ws) }); };
  return true;
}

// ------------------------------------------------------------ pages
function viewRecaps(view, ws) {
  const d = userData();
  ensureRecaps();
  const all = Object.values(d.recaps || {}).sort((a, b) => (a.ws < b.ws ? 1 : -1));
  if (ws && d.recaps && d.recaps[ws]) return viewRecap(view, d.recaps[ws]);
  const live = weekStats(d, weekStart(todayKey()), todayKey());
  view.innerHTML = `
    <section class="page recaps">
      <div class="hero-head"><div><h1 class="large-title">Your weeks.</h1><p class="lead">A new recap arrives every Monday just after midnight.</p></div></div>
      <a class="rc-live card" href="#/home">
        <div><small>This week so far</small><b>${live.done} of ${live.planned} done</b></div>
        <div class="rc-live-bar"><i style="width:${live.planned ? (live.done / live.planned) * 100 : 0}%"></i></div>
        <span class="muted small">Next recap: Monday 00:01</span>
      </a>
      ${all.length ? `<div class="rc-list">${all.map((r, i) => { const pct = r.rate == null ? 0 : Math.round(r.rate * 100); return `
        <a class="rc-card" href="#/recaps/${r.ws}" style="--i:${i}">
          <div class="rc-card-top"><b>${esc(rangeLabel(r.ws))}</b>${r.saved ? `<span class="chip small blue">${icon('archive', 12)} Saved</span>` : ''}</div>
          <div class="rc-card-mid"><span class="rc-mini" style="--p:${pct}"><i>${pct}%</i></span><div><b>${r.done}/${r.planned}</b><small>tasks done</small></div><div><b>${r.missed}</b><small>skipped</small></div><div><b>${r.journal}</b><small>journal</small></div></div>
          <p class="muted small">${r.best ? `Best day: ${r.best.day}` : ''}${r.skipped ? ` · Skipped most: ${esc(r.skipped.title)}` : ''}</p>
        </a>`; }).join('')}</div>`
        : `<div class="empty"><span class="empty-ic">${icon('archive', 26)}</span><p>Your first recap shows up next Monday.</p></div>`}
    </section>`;
}

function viewRecap(view, r) {
  view.innerHTML = `
    <section class="page narrow recaps">
      <div class="note-toolbar"><a class="back-link inline" href="#/recaps">${icon('chevL', 16)} Recaps</a>
        <div class="row gap"><button class="btn ghost small" id="rc-dl">${icon('download', 14)} Download</button><button class="btn small ${r.saved ? 'ghost' : 'primary'}" id="rc-save">${icon('archive', 14)} ${r.saved ? 'Saved' : 'Save'}</button></div></div>
      <p class="eyebrow date">Week recap</p>
      <h1 class="large-title">${esc(rangeLabel(r.ws))}</h1>
      <div class="card rc-detail">${recapBody(r)}</div>
    </section>`;
  $('#rc-dl', view).onclick = () => downloadRecap(r);
  $('#rc-save', view).onclick = () => { setFlag(r.ws, { saved: !r.saved }); rerender(); };
}

register('recaps', (v, p) => viewRecaps(v, p));
