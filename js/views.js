import { icon, taskIcon, TASK_GLYPHS, searchSvgl } from './icons.js';
import { esc, $, $$, uid, toast, sheet, confirmSheet, ring, plural } from './ui.js';
import { userData, update, exportJSON, importJSON, getState, save } from './store.js';
import { profile, logout, login, register } from './auth.js';
import {
  todayKey, prettyDate, todayBuckets, frequencyLabel, perDay, countOn, statusOn, daySummary,
  addDays, weekday, keyOf, parseKey, MONTHS, DAY_SHORT, taskStats, streak, dailySeries, insights,
  weekdayMisses, DAY_NAMES, isFixed, activeTasks,
} from './schedule.js';
import * as notify from './notify.js';
import { playIntro } from './intro.js';

// ============================================================ presets
export const PRESETS = [
  { title: 'Nahrát Pinterest piny', icon: { kind: 'svgl', value: 'https://svgl.app/library/pinterest.svg' }, perWeek: 7, goal: { target: 200, unit: 'pinů', step: 5, done: 0 } },
  { title: 'Stáhnout nová Marvel Rivals videa', icon: { kind: 'glyph', value: 'gamepad' }, perWeek: 3 },
  { title: 'Vyčistit zuby', icon: { kind: 'glyph', value: 'tooth' }, perWeek: 7, timesPerDay: 2 },
  { title: 'Mezizubní kartáčky', icon: { kind: 'glyph', value: 'interdental' }, perWeek: 7 },
  { title: 'Nasadit rovnátka přes noc', icon: { kind: 'glyph', value: 'braces' }, perWeek: 7 },
  { title: 'Vypít 2 litry vody', icon: { kind: 'glyph', value: 'drop' }, perWeek: 7 },
  { title: 'Cvičení', icon: { kind: 'glyph', value: 'dumbbell' }, perWeek: 3 },
  { title: 'Číst 20 minut', icon: { kind: 'glyph', value: 'book' }, perWeek: 5 },
];

function makeTask(p) {
  return {
    id: uid(), title: p.title, note: p.note || '', icon: p.icon || { kind: 'glyph', value: 'star' },
    perWeek: p.perWeek ?? 7, days: p.days || null, timesPerDay: p.timesPerDay || 1,
    goal: p.goal ? { ...p.goal } : null, createdAt: todayKey(), archivedAt: null, finishedAt: null,
  };
}

// ============================================================ actions
export function toggleTask(taskId, k = todayKey(), { decrement = false } = {}) {
  let message = null;
  update((d) => {
    const t = d.tasks.find((x) => x.id === taskId);
    if (!t) return;
    const max = perDay(t);
    const before = countOn(d, t, k);
    let after;
    if (decrement) after = Math.max(0, before - 1);
    else after = before >= max ? 0 : before + 1;
    d.log[k] = d.log[k] || {};
    if (after) d.log[k][t.id] = after; else delete d.log[k][t.id];
    if (t.goal) {
      const step = t.goal.step || 1;
      if (before < max && after >= max) t.goal.done = (t.goal.done || 0) + step;
      if (before >= max && after < max) t.goal.done = Math.max(0, (t.goal.done || 0) - step);
      if (t.goal.done >= t.goal.target && !t.finishedAt) { t.finishedAt = k; message = `Cíl „${t.title}“ je splněný. Skvělá práce.`; }
      if (t.goal.done < t.goal.target && t.finishedAt) t.finishedAt = null;
    }
  });
  if (message) toast(message, { tone: 'good' });
  notify.syncBadge();
}

// ============================================================ shell
const TABS = [
  ['today', 'Dnes', 'today'],
  ['calendar', 'Kalendář', 'calendar'],
  ['stats', 'Statistiky', 'chart'],
  ['tasks', 'Úkoly', 'list'],
];

export function renderShell(route) {
  const p = profile();
  const app = $('#app');
  if (!$('.shell', app)) {
    app.innerHTML = `
      <div class="shell">
        <header class="topbar">
          <a class="brand" href="#/today" aria-label="Check It — domů">
            <span class="brand-mark"><svg viewBox="0 0 64 64"><rect x="2" y="2" width="60" height="60" rx="16"/><path d="M19 33.5l8.5 8.5L45.5 23"/></svg></span>
            <span>Check It</span>
          </a>
          <nav class="tabs" aria-label="Hlavní navigace">
            ${TABS.map(([r, l, ic]) => `<a href="#/${r}" data-r="${r}">${icon(ic, 18)}<span>${l}</span></a>`).join('')}
          </nav>
          <a class="avatar" href="#/settings" data-r="settings" aria-label="Nastavení">${esc((p?.name || '?').slice(0, 1).toUpperCase())}</a>
        </header>
        <main id="view" tabindex="-1"></main>
        <nav class="tabbar" aria-label="Navigace">
          ${[...TABS, ['settings', 'Nastavení', 'gear']].map(([r, l, ic]) => `<a href="#/${r}" data-r="${r}">${icon(ic, 22)}<span>${l}</span></a>`).join('')}
        </nav>
      </div>`;
  }
  $$('[data-r]', app).forEach((a) => a.classList.toggle('active', a.dataset.r === route));
  const view = $('#view');
  view.classList.remove('enter');
  void view.offsetWidth;
  view.classList.add('enter');
  ({ today: viewToday, calendar: viewCalendar, stats: viewStats, tasks: viewTasks, settings: viewSettings }[route] || viewToday)(view);
}

export function rerender() {
  const r = (location.hash.replace('#/', '') || 'today').split('?')[0];
  const view = $('#view');
  if (!view) return;
  ({ today: viewToday, calendar: viewCalendar, stats: viewStats, tasks: viewTasks, settings: viewSettings }[r] || viewToday)(view);
}

// ============================================================ rows
function taskRow(t, k, s, { compact = false } = {}) {
  const d = userData();
  const c = countOn(d, t, k);
  const max = perDay(t);
  const done = c >= max;
  let sub = frequencyLabel(t);
  if (s && s.kind === 'flexible' && !done && s.remaining) sub = `Ještě ${s.remaining}× tento týden · dnes volitelné`;
  if (s && s.kind === 'required' && s.need && s.need < 7 && !isFixed(t) && !done) sub = `Ještě ${s.remaining}× tento týden · musíš dnes`;
  const goal = t.goal ? `<div class="goal"><div class="goal-bar"><i style="width:${Math.min(100, (t.goal.done / t.goal.target) * 100)}%"></i></div><small>${t.goal.done} / ${t.goal.target} ${esc(t.goal.unit || '')}</small></div>` : '';
  const dots = max > 1 ? `<span class="dots" aria-label="${c} z ${max}">${Array.from({ length: max }, (_, i) => `<i class="${i < c ? 'on' : ''}"></i>`).join('')}</span>` : '';
  return `
    <li class="task ${done ? 'is-done' : ''} ${s && s.kind === 'required' && !done && k < todayKey() ? 'is-missed' : ''}" data-id="${t.id}">
      <button class="check ${c && !done ? 'partial' : ''}" data-toggle="${t.id}" aria-pressed="${done}" aria-label="${done ? 'Označit jako nesplněné' : 'Splnit'}: ${esc(t.title)}">
        ${max > 1 && !done ? ring(c / max, 30, 2.5, 'mini') : ''}
        <svg viewBox="0 0 24 24" class="tick"><path d="M6 12.5l4 4L18 8"/></svg>
      </button>
      <span class="tile">${taskIcon(t.icon, 22)}</span>
      <div class="task-main" data-toggle="${t.id}">
        <span class="task-title">${esc(t.title)}</span>
        <span class="task-sub">${esc(sub)} ${dots}</span>
        ${compact ? '' : goal}
      </div>
      ${compact ? '' : `<button class="icon-btn subtle" data-edit="${t.id}" aria-label="Upravit ${esc(t.title)}">${icon('edit', 18)}</button>`}
    </li>`;
}

function bindRows(root, k, after) {
  $$('[data-toggle]', root).forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    const row = b.closest('.task');
    const wasDone = row.classList.contains('is-done');
    toggleTask(b.dataset.toggle, k);
    if (!wasDone) row.classList.add('pop');
    setTimeout(() => (after || rerender)(), wasDone ? 0 : 260);
  }));
  $$('[data-edit]', root).forEach((b) => (b.onclick = () => openEditor(b.dataset.edit)));
}

// ============================================================ today
function viewToday(view) {
  const d = userData();
  const k = todayKey();
  const b = todayBuckets(d, k);
  const sum = daySummary(d, k);
  const p = profile();
  const hour = new Date().getHours();
  const greet = hour < 5 ? 'Dobrou noc' : hour < 11 ? 'Dobré ráno' : hour < 18 ? 'Dobré odpoledne' : 'Dobrý večer';
  const tip = insights(d).find((i) => i.tone === 'bad' || i.tone === 'warn');
  const needsPerm = notify.supported() && notify.permission() === 'default';
  const pct = sum.total ? Math.round((sum.done / sum.total) * 100) : 0;

  view.innerHTML = `
    <section class="page">
      <div class="hero-head with-ring">
        <div>
          <p class="eyebrow">${esc(prettyDate(k))}</p>
          <h1 class="large-title">${greet}${p?.name ? `, ${esc(p.name)}` : ''}.</h1>
          <p class="lead">${sum.total ? (sum.done === sum.total ? 'Všechno hotovo. Užij si zbytek dne.' : `Zbývá ${sum.total - sum.done} ${plural(sum.total - sum.done, 'úkol', 'úkoly', 'úkolů')} z ${sum.total}.`) : 'Na dnešek nemáš nic naplánovaného.'}</p>
        </div>
        <div class="today-ring" aria-label="Splněno ${pct} %">
          ${ring(sum.ratio, 120, 11, 'big')}
          <div class="tr-label"><b>${pct}<small>%</small></b><span>${sum.done}/${sum.total}</span></div>
        </div>
      </div>

      ${needsPerm && d.tasks.length ? `
        <div class="callout blue">
          <span class="callout-ic">${icon('bell', 20)}</span>
          <div class="grow"><b>Zapni upozornění</b><p>Po otevření prohlížeče ti Check It připomene, co ještě nemáš hotové.</p></div>
          <button class="btn primary small" id="perm">Zapnout</button>
        </div>` : ''}

      ${tip ? `
        <div class="callout ${tip.tone === 'bad' ? 'red' : 'amber'}">
          <span class="callout-ic">${icon('flag', 20)}</span>
          <div class="grow"><b>${esc(tip.title)}</b><p>${esc(tip.body)}</p></div>
          <a class="btn ghost small" href="#/stats">Statistiky</a>
        </div>` : ''}

      <div class="section-head">
        <h2>Musíš dnes</h2>
        <button class="btn primary small" id="add">${icon('plus', 16)} Nový úkol</button>
      </div>
      ${b.required.length ? `<ul class="list">${b.required.map(({ t, s }) => taskRow(t, k, s)).join('')}</ul>`
        : `<div class="empty">${d.tasks.length ? `<span class="empty-ic">${icon('check', 28)}</span><p>Povinné úkoly na dnešek máš splněné.</p>` : emptyIllustration()}</div>`}

      ${b.flexible.length ? `
        <div class="section-head"><h2>Tento týden</h2><span class="muted small">Udělej, až se ti to hodí</span></div>
        <ul class="list">${b.flexible.map(({ t, s }) => taskRow(t, k, s)).join('')}</ul>` : ''}

      ${b.done.length ? `
        <div class="section-head"><h2>Hotovo</h2><span class="muted small">${b.done.length}</span></div>
        <ul class="list done-list">${b.done.map(({ t, s }) => taskRow(t, k, s)).join('')}</ul>` : ''}
    </section>`;

  bindRows(view, k);
  $('#add', view).onclick = () => openEditor();
  const perm = $('#perm', view);
  if (perm) perm.onclick = async () => { const r = await notify.requestPermission(); if (r === 'granted') { toast('Upozornění zapnutá'); notify.startupReminder(); } rerender(); };
  const emptyBtn = $('#empty-presets', view);
  if (emptyBtn) emptyBtn.onclick = () => openPresets();
}

function emptyIllustration() {
  return `
    <div class="illus">
      <svg viewBox="0 0 220 140" aria-hidden="true">
        <rect x="40" y="18" width="140" height="104" rx="18" class="il-card"/>
        <rect x="58" y="40" width="16" height="16" rx="8" class="il-dot on"/><rect x="84" y="44" width="70" height="8" rx="4" class="il-line"/>
        <rect x="58" y="64" width="16" height="16" rx="8" class="il-dot"/><rect x="84" y="68" width="56" height="8" rx="4" class="il-line"/>
        <rect x="58" y="88" width="16" height="16" rx="8" class="il-dot"/><rect x="84" y="92" width="64" height="8" rx="4" class="il-line"/>
        <path d="M62 48l3 3 6-6" class="il-tick"/>
      </svg>
    </div>
    <p><b>Zatím tu nic není.</b><br>Přidej první úkol nebo začni z připravených.</p>
    <button class="btn ghost" id="empty-presets">${icon('sparkle', 16)} Vybrat z návrhů</button>`;
}

// ============================================================ calendar
let calCursor = null;
let calSelected = null;

function viewCalendar(view) {
  const d = userData();
  const today = todayKey();
  if (!calCursor) calCursor = today.slice(0, 7);
  if (!calSelected) calSelected = today;
  const [y, m] = calCursor.split('-').map(Number);
  const first = keyOf(new Date(y, m - 1, 1));
  const daysInMonth = new Date(y, m, 0).getDate();
  const offset = weekday(first);
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push('<span class="cal-cell blank"></span>');
  let monthDone = 0; let monthTotal = 0;
  for (let i = 1; i <= daysInMonth; i++) {
    const k = keyOf(new Date(y, m - 1, i));
    const s = daySummary(d, k);
    const future = k > today;
    if (!future) { monthDone += s.done; monthTotal += s.total; }
    const cls = ['cal-cell', k === today ? 'today' : '', k === calSelected ? 'sel' : '', future ? 'future' : '',
      !future && s.total && s.done === s.total ? 'full' : '', !future && k < today && s.total && s.done < s.total ? 'miss' : ''].join(' ');
    cells.push(`<button class="${cls}" data-day="${k}" aria-label="${prettyDate(k)}: ${s.done} z ${s.total}">
      ${ring(future ? 0 : s.ratio, 40, 3.5, s.total && s.done === s.total && !future ? 'full' : '')}
      <span class="cal-num">${i}</span>
    </button>`);
  }
  const sel = daySummary(d, calSelected);
  const selItems = d.tasks.map((t) => ({ t, s: statusOn(d, t, calSelected) })).filter(({ s }) => !['inactive', 'off', 'met'].includes(s.kind));
  const isFuture = calSelected > today;

  view.innerHTML = `
    <section class="page">
      <div class="hero-head">
        <div>
          <p class="eyebrow">Kalendář</p>
          <h1 class="large-title">${MONTHS[m - 1]} <span class="soft">${y}</span></h1>
          <p class="lead">${monthTotal ? `Tento měsíc splněno ${Math.round((monthDone / monthTotal) * 100)} % úkolů.` : 'Tento měsíc zatím bez dat.'}</p>
        </div>
        <div class="seg-nav">
          <button class="icon-btn" id="prev" aria-label="Předchozí měsíc">${icon('chevL', 20)}</button>
          <button class="btn ghost small" id="now">Dnes</button>
          <button class="icon-btn" id="next" aria-label="Další měsíc">${icon('chevR', 20)}</button>
        </div>
      </div>
      <div class="cal-layout">
        <div class="card cal-card">
          <div class="cal-grid head">${DAY_SHORT.map((x) => `<span>${x}</span>`).join('')}</div>
          <div class="cal-grid">${cells.join('')}</div>
          <div class="legend"><span><i class="lg full"></i>Vše splněno</span><span><i class="lg part"></i>Částečně</span><span><i class="lg miss"></i>Něco vynecháno</span></div>
        </div>
        <div class="card day-card">
          <p class="eyebrow">${calSelected === today ? 'Dnes' : isFuture ? 'Naplánováno' : 'Historie'}</p>
          <h3>${esc(prettyDate(calSelected))}</h3>
          <p class="muted">${sel.total ? `${sel.done} z ${sel.total} splněno` : 'Žádné povinné úkoly.'}</p>
          ${selItems.length ? `<ul class="list compact">${selItems.map(({ t, s }) => taskRow(t, calSelected, s, { compact: true })).join('')}</ul>` : ''}
          ${isFuture ? '<p class="muted small">Budoucí dny nelze odškrtnout předem.</p>' : calSelected < today ? '<p class="muted small">Zapomněl jsi něco odškrtnout? Můžeš to doplnit zpětně.</p>' : ''}
        </div>
      </div>
    </section>`;

  const move = (n) => { const dt = new Date(y, m - 1 + n, 1); calCursor = keyOf(dt).slice(0, 7); viewCalendar(view); };
  $('#prev', view).onclick = () => move(-1);
  $('#next', view).onclick = () => move(1);
  $('#now', view).onclick = () => { calCursor = today.slice(0, 7); calSelected = today; viewCalendar(view); };
  $$('[data-day]', view).forEach((b) => (b.onclick = () => { calSelected = b.dataset.day; viewCalendar(view); }));
  if (isFuture) $$('[data-toggle]', view).forEach((b) => (b.disabled = true));
  else bindRows($('.day-card', view), calSelected, () => viewCalendar(view));
}

// ============================================================ stats
function viewStats(view) {
  const d = userData();
  const series = dailySeries(d, 14);
  const stats = taskStats(d, 30).sort((a, b) => b.missed - a.missed || (a.rate ?? 1) - (b.rate ?? 1));
  const ins = insights(d);
  const st = streak(d);
  const totalDone = stats.reduce((a, s) => a + s.done, 0);
  const totalMiss = stats.reduce((a, s) => a + s.missed, 0);
  const rate30 = totalDone + totalMiss ? Math.round((totalDone / (totalDone + totalMiss)) * 100) : null;
  const today = daySummary(d, todayKey());
  const wd = weekdayMisses(d);
  const maxBar = Math.max(1, ...series.map((s) => s.total));
  const wdMax = Math.max(1, ...wd.counts);

  view.innerHTML = `
    <section class="page">
      <div class="hero-head">
        <div>
          <p class="eyebrow">Statistiky</p>
          <h1 class="large-title">Tvůj rytmus.</h1>
          <p class="lead">Posledních 30 dní na jednom místě.</p>
        </div>
      </div>

      <div class="kpis">
        <div class="kpi"><span>Dnes</span><b>${today.done}<small>/${today.total}</small></b></div>
        <div class="kpi"><span>Série</span><b>${st}<small> ${plural(st, 'den', 'dny', 'dní')}</small></b></div>
        <div class="kpi"><span>Úspěšnost 30 dní</span><b>${rate30 == null ? '—' : rate30}<small>${rate30 == null ? '' : ' %'}</small></b></div>
        <div class="kpi"><span>Vynecháno 30 dní</span><b class="${totalMiss ? 'red-t' : ''}">${totalMiss}</b></div>
      </div>

      ${ins.length ? `<div class="section-head"><h2>Co ti radím</h2></div>
        <div class="insights">${ins.map((i) => `
          <div class="insight ${i.tone}">
            <span class="ins-ic">${icon(i.tone === 'good' ? 'sparkle' : i.tone === 'info' ? 'info' : 'flag', 18)}</span>
            <div><b>${esc(i.title)}</b><p>${esc(i.body)}</p></div>
          </div>`).join('')}</div>` : ''}

      <div class="grid-2">
        <div class="card">
          <div class="card-head"><h3>Posledních 14 dní</h3><span class="muted small">splněno / naplánováno</span></div>
          <div class="barchart" role="img" aria-label="Graf splněných úkolů za 14 dní">
            ${series.map((s) => `
              <div class="bc-col" title="${prettyDate(s.k)}: ${s.done}/${s.total}">
                <div class="bc-track" style="height:${(s.total / maxBar) * 100}%">
                  <div class="bc-fill ${s.total && s.done < s.total && s.k < todayKey() ? 'has-miss' : ''}" style="height:${s.total ? (s.done / s.total) * 100 : 0}%"></div>
                </div>
                <span>${parseKey(s.k).getDate()}</span>
              </div>`).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Kdy vynecháváš</h3><span class="muted small">posledních 8 týdnů</span></div>
          <div class="wd-chart">
            ${wd.counts.map((c, i) => `
              <div class="wd-row"><span>${DAY_SHORT[i]}</span><div class="wd-bar"><i style="width:${(c / wdMax) * 100}%"></i></div><b>${c}</b></div>`).join('')}
          </div>
        </div>
      </div>

      <div class="section-head"><h2>Úkoly podle vynechání</h2><span class="muted small">30 dní</span></div>
      ${stats.length ? `<div class="card flush"><ul class="stat-list">
        ${stats.map((s) => `
          <li>
            <span class="tile sm">${taskIcon(s.t.icon, 18)}</span>
            <div class="sl-main"><b>${esc(s.t.title)}</b><div class="rate"><i style="width:${(s.rate ?? 0) * 100}%" class="${(s.rate ?? 1) < 0.6 ? 'low' : ''}"></i></div></div>
            <div class="sl-num"><span>${s.rate == null ? '—' : Math.round(s.rate * 100) + ' %'}</span><small>${s.done} ✓ · <em class="${s.missed ? 'red-t' : ''}">${s.missed} ✕</em></small></div>
          </li>`).join('')}
      </ul></div>` : '<div class="empty"><p>Až budeš plnit úkoly, uvidíš tady statistiky.</p></div>'}
    </section>`;
}

// ============================================================ tasks
function viewTasks(view) {
  const d = userData();
  const active = activeTasks(d);
  const finished = d.tasks.filter((t) => t.finishedAt && !t.archivedAt);
  const archived = d.tasks.filter((t) => t.archivedAt);
  const row = (t) => `
    <li class="task" data-id="${t.id}">
      <span class="tile">${taskIcon(t.icon, 22)}</span>
      <div class="task-main" data-edit="${t.id}">
        <span class="task-title">${esc(t.title)}</span>
        <span class="task-sub">${esc(frequencyLabel(t))}${t.goal ? ` · cíl ${t.goal.done}/${t.goal.target} ${esc(t.goal.unit || '')}` : ''}</span>
      </div>
      <button class="icon-btn subtle" data-edit="${t.id}" aria-label="Upravit">${icon('edit', 18)}</button>
    </li>`;
  view.innerHTML = `
    <section class="page">
      <div class="hero-head">
        <div>
          <p class="eyebrow">Úkoly</p>
          <h1 class="large-title">Tvůj seznam.</h1>
          <p class="lead">${active.length} ${plural(active.length, 'aktivní úkol', 'aktivní úkoly', 'aktivních úkolů')}. Každému nastav, kolikrát týdně ho musíš splnit.</p>
        </div>
        <div class="row gap">
          <button class="btn ghost" id="presets">${icon('sparkle', 16)} Návrhy</button>
          <button class="btn primary" id="add">${icon('plus', 16)} Nový úkol</button>
        </div>
      </div>
      ${active.length ? `<ul class="list">${active.map(row).join('')}</ul>` : `<div class="empty">${emptyIllustration()}</div>`}
      ${finished.length ? `<div class="section-head"><h2>Splněné cíle</h2></div><ul class="list done-list">${finished.map(row).join('')}</ul>` : ''}
      ${archived.length ? `<div class="section-head"><h2>Archiv</h2></div><ul class="list done-list">${archived.map(row).join('')}</ul>` : ''}
    </section>`;
  $('#add', view).onclick = () => openEditor();
  $('#presets', view).onclick = () => openPresets();
  const eb = $('#empty-presets', view); if (eb) eb.onclick = () => openPresets();
  $$('[data-edit]', view).forEach((b) => (b.onclick = () => openEditor(b.dataset.edit)));
}

// ============================================================ settings
function viewSettings(view) {
  const d = userData();
  const p = profile();
  const perm = notify.permission();
  const permLabel = { granted: 'Zapnuto', denied: 'Zablokováno v prohlížeči', default: 'Vypnuto', unsupported: 'Prohlížeč nepodporuje' }[perm];
  view.innerHTML = `
    <section class="page narrow">
      <div class="hero-head"><div><p class="eyebrow">Nastavení</p><h1 class="large-title">${esc(p.name)}</h1><p class="lead">@${esc(p.id)} · účet uložený v tomto prohlížeči</p></div></div>

      <h2 class="group-title">Upozornění</h2>
      <div class="card group">
        <div class="g-row"><div><b>Systémová upozornění</b><small>${permLabel}</small></div>
          ${perm === 'granted' ? `<button class="btn ghost small" id="test">Vyzkoušet</button>` : perm === 'default' ? `<button class="btn primary small" id="perm">Zapnout</button>` : ''}</div>
        <div class="g-row"><div><b>Večerní připomínka</b><small>Když máš otevřený Check It a něco zbývá</small></div>
          <input type="time" id="rt" value="${esc(d.settings.reminderTime || '20:00')}" class="time-input"></div>
        <div class="g-row col"><div><b>Upozornění hned po spuštění prohlížeče</b>
          <small>Web se sám spustit nemůže, ale stačí jedna z těchto možností a Check It se otevře s prohlížečem a hned ti napíše, co nemáš splněné:</small></div>
          <ol class="howto">
            <li><b>Chrome / Edge:</b> Nastavení → Při spuštění → Otevřít konkrétní stránku → vlož <code>${esc(location.origin + location.pathname)}</code></li>
            <li><b>Nainstaluj jako aplikaci</b> (ikona v adresním řádku) a v nastavení aplikace zapni „Spustit při přihlášení“.</li>
            <li><b>Safari:</b> Nastavení → Obecné → Domovská stránka.</li>
          </ol>
          ${'BeforeInstallPromptEvent' in window ? '<button class="btn ghost small" id="install" hidden>Nainstalovat aplikaci</button>' : ''}
        </div>
      </div>

      <h2 class="group-title">Data</h2>
      <div class="card group">
        <div class="g-row"><div><b>Úložiště</b><small>localStorage + IndexedDB. Zmizí jen když smažeš data webu (cookies).</small></div><span class="pill" id="persist">…</span></div>
        <div class="g-row"><div><b>Záloha</b><small>Stáhni si data do souboru nebo je obnov.</small></div>
          <div class="row gap"><button class="btn ghost small" id="exp">Exportovat</button><label class="btn ghost small">Importovat<input type="file" id="imp" accept="application/json" hidden></label></div></div>
        <div class="g-row"><div><b>Úvodní animace</b><small>Přehraj si znovu prohlídku aplikace.</small></div><button class="btn ghost small" id="intro">${icon('play', 14)} Přehrát</button></div>
      </div>

      <h2 class="group-title">Účet</h2>
      <div class="card group">
        <button class="g-row link" id="logout"><b>Odhlásit se</b>${icon('logout', 18)}</button>
        <button class="g-row link danger" id="del"><b>Smazat účet a všechna data</b>${icon('trash', 18)}</button>
      </div>
      <p class="muted small center">Check It · data nikdy neopouští tvůj prohlížeč</p>
    </section>`;

  const permBtn = $('#perm', view);
  if (permBtn) permBtn.onclick = async () => { await notify.requestPermission(); viewSettings(view); };
  const test = $('#test', view);
  if (test) test.onclick = async () => { const ok = await notify.testNotification(); if (!ok) toast('Upozornění se nepodařilo zobrazit'); };
  $('#rt', view).onchange = (e) => { update((x) => { x.settings.reminderTime = e.target.value; x.lastNotified = null; }); toast('Uloženo'); };
  $('#exp', view).onclick = () => {
    const blob = new Blob([exportJSON()], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `checkit-${todayKey()}.json` });
    a.click(); URL.revokeObjectURL(a.href);
  };
  $('#imp', view).onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { importJSON(await f.text()); toast('Data obnovena'); viewSettings(view); } catch (err) { toast(err.message, { tone: 'bad' }); }
  };
  $('#intro', view).onclick = () => playIntro({ name: p.name });
  $('#logout', view).onclick = () => { logout(); location.hash = '#/'; location.reload(); };
  $('#del', view).onclick = async () => {
    if (!(await confirmSheet('Smazat účet?', 'Smažou se všechny úkoly, historie i statistiky. Tohle nejde vrátit.', 'Smazat účet'))) return;
    const s = getState(); delete s.data[s.session]; delete s.users[s.session]; s.session = null; save(); location.hash = '#/'; location.reload();
  };
  (async () => {
    let txt = 'Trvalé';
    try { txt = navigator.storage && (await navigator.storage.persisted()) ? 'Trvalé' : 'Standardní'; } catch {}
    const el = $('#persist', view); if (el) el.textContent = txt;
  })();
  const inst = $('#install', view);
  if (inst && window.__installPrompt) { inst.hidden = false; inst.onclick = () => window.__installPrompt.prompt(); }
}

// ============================================================ editor
export function openEditor(taskId) {
  const d = userData();
  const existing = taskId ? d.tasks.find((t) => t.id === taskId) : null;
  const t = existing ? JSON.parse(JSON.stringify(existing)) : makeTask({ title: '', perWeek: 7 });
  let mode = isFixed(t) ? 'days' : 'count';
  let iconTab = t.icon.kind === 'svgl' ? 'svgl' : 'glyph';

  const s = sheet(`
    <form class="editor" novalidate>
      <div class="sheet-header">
        <button type="button" class="btn text" data-close>Zrušit</button>
        <h3>${existing ? 'Upravit úkol' : 'Nový úkol'}</h3>
        <button type="submit" class="btn text strong">Uložit</button>
      </div>
      <div class="sheet-body">
        <div class="ed-top">
          <span class="tile xl" id="ed-preview">${taskIcon(t.icon, 30)}</span>
          <label class="field grow"><span>Název</span><input id="ed-title" maxlength="80" placeholder="Např. Nasadit rovnátka přes noc" value="${esc(t.title)}" required></label>
        </div>

        <div class="field"><span>Ikona</span>
          <div class="seg" role="tablist"><button type="button" data-itab="glyph">Symboly</button><button type="button" data-itab="svgl">Loga (SVGL)</button></div>
          <div id="icon-panel"></div>
        </div>

        <div class="field"><span>Jak často</span>
          <div class="seg"><button type="button" data-mode="count">Počet za týden</button><button type="button" data-mode="days">Konkrétní dny</button></div>
          <div id="freq-panel"></div>
        </div>

        <div class="field"><span>Kolikrát za den</span>
          <div class="stepper" id="tpd"><button type="button" data-d="-1" aria-label="Méně">−</button><b>${perDay(t)}</b><button type="button" data-d="1" aria-label="Více">+</button></div>
          <small class="hint">Třeba čištění zubů ráno a večer = 2.</small>
        </div>

        <div class="field">
          <label class="switch-row"><span><b>Cíl, po jehož splnění úkol skončí</b><small>Např. nahrávat piny, dokud jich nebude 200.</small></span>
            <input type="checkbox" id="goal-on" class="switch" ${t.goal ? 'checked' : ''}></label>
          <div id="goal-panel" class="goal-grid" ${t.goal ? '' : 'hidden'}>
            <label class="field"><span>Cílový počet</span><input type="number" min="1" id="g-target" value="${t.goal?.target ?? 100}"></label>
            <label class="field"><span>Jednotka</span><input id="g-unit" value="${esc(t.goal?.unit ?? 'pinů')}" maxlength="20"></label>
            <label class="field"><span>Za jedno splnění</span><input type="number" min="1" id="g-step" value="${t.goal?.step ?? 1}"></label>
            <label class="field"><span>Už hotovo</span><input type="number" min="0" id="g-done" value="${t.goal?.done ?? 0}"></label>
          </div>
        </div>

        <label class="field"><span>Poznámka</span><textarea id="ed-note" rows="2" maxlength="300" placeholder="Volitelné">${esc(t.note || '')}</textarea></label>

        ${existing ? `<div class="row gap ed-actions">
          <button type="button" class="btn ghost grow" id="ed-archive">${icon('archive', 16)} ${existing.archivedAt ? 'Obnovit' : 'Archivovat'}</button>
          <button type="button" class="btn danger-ghost grow" id="ed-del">${icon('trash', 16)} Smazat</button></div>` : ''}
      </div>
    </form>`, { wide: true });

  const el = s.el;
  const preview = () => ($('#ed-preview', el).innerHTML = taskIcon(t.icon, 30));

  const renderIcons = () => {
    $$('[data-itab]', el).forEach((b) => b.classList.toggle('on', b.dataset.itab === iconTab));
    const panel = $('#icon-panel', el);
    if (iconTab === 'glyph') {
      panel.innerHTML = `<div class="icon-grid">${TASK_GLYPHS.map((g) => `<button type="button" class="ig ${t.icon.kind === 'glyph' && t.icon.value === g ? 'on' : ''}" data-g="${g}" aria-label="${g}">${icon(g, 22)}</button>`).join('')}</div>`;
      $$('[data-g]', panel).forEach((b) => (b.onclick = () => { t.icon = { kind: 'glyph', value: b.dataset.g }; preview(); renderIcons(); }));
    } else {
      panel.innerHTML = `
        <div class="search"><span>${icon('search', 18)}</span><input id="svgl-q" placeholder="Hledej logo: pinterest, youtube, discord…" autocomplete="off"></div>
        <div class="icon-grid logos" id="svgl-res"><p class="muted small">Loga z knihovny <a href="https://svgl.app" target="_blank" rel="noopener">svgl.app</a>.</p></div>`;
      const q = $('#svgl-q', panel);
      const res = $('#svgl-res', panel);
      let timer;
      const run = async () => {
        const v = q.value.trim();
        if (!v) return;
        res.innerHTML = '<p class="muted small">Hledám…</p>';
        try {
          const items = await searchSvgl(v);
          res.innerHTML = items.length ? items.map((i) => `<button type="button" class="ig logo ${t.icon.value === i.src ? 'on' : ''}" data-src="${esc(i.src)}" title="${esc(i.title)}"><img src="${esc(i.src)}" alt="${esc(i.title)}" loading="lazy"></button>`).join('')
            : '<p class="muted small">Nic nenalezeno.</p>';
          $$('[data-src]', res).forEach((b) => (b.onclick = () => { t.icon = { kind: 'svgl', value: b.dataset.src }; preview(); $$('.ig', res).forEach((x) => x.classList.toggle('on', x === b)); }));
        } catch {
          const slug = v.toLowerCase().replace(/[^a-z0-9-]/g, '');
          res.innerHTML = `<p class="muted small">SVGL hledání teď nejde. Zkusím přímo <code>${esc(slug)}.svg</code>:</p>
            <button type="button" class="ig logo" data-src="https://svgl.app/library/${slug}.svg"><img src="https://svgl.app/library/${slug}.svg" alt=""></button>`;
          $$('[data-src]', res).forEach((b) => (b.onclick = () => { t.icon = { kind: 'svgl', value: b.dataset.src }; preview(); b.classList.add('on'); }));
        }
      };
      q.oninput = () => { clearTimeout(timer); timer = setTimeout(run, 300); };
      q.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); run(); } };
    }
  };

  const renderFreq = () => {
    $$('[data-mode]', el).forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
    const panel = $('#freq-panel', el);
    if (mode === 'count') {
      panel.innerHTML = `
        <div class="freq-pick">
          ${[1, 2, 3, 4, 5, 6, 7].map((n) => `<button type="button" class="fp ${t.perWeek === n ? 'on' : ''}" data-n="${n}">${n}×</button>`).join('')}
        </div>
        <small class="hint">${t.perWeek >= 7 ? 'Každý den.' : `${t.perWeek}× týdně — dny si vybíráš sám. Když už to jinak nestihneš, Check It ti řekne, že musíš dnes.`}</small>`;
      $$('[data-n]', panel).forEach((b) => (b.onclick = () => { t.perWeek = +b.dataset.n; renderFreq(); }));
    } else {
      const days = t.days || [];
      panel.innerHTML = `
        <div class="freq-pick days">${DAY_SHORT.map((x, i) => `<button type="button" class="fp ${days.includes(i) ? 'on' : ''}" data-day="${i}" aria-label="${DAY_NAMES[i]}">${x}</button>`).join('')}</div>
        <small class="hint">${days.length ? `${days.length}× týdně, vždy ve vybrané dny.` : 'Vyber aspoň jeden den.'}</small>`;
      $$('[data-day]', panel).forEach((b) => (b.onclick = () => {
        const i = +b.dataset.day; const set = new Set(t.days || []);
        set.has(i) ? set.delete(i) : set.add(i);
        t.days = [...set].sort(); t.perWeek = t.days.length || t.perWeek; renderFreq();
      }));
    }
  };

  $$('[data-itab]', el).forEach((b) => (b.onclick = () => { iconTab = b.dataset.itab; renderIcons(); }));
  $$('[data-mode]', el).forEach((b) => (b.onclick = () => { mode = b.dataset.mode; if (mode === 'days' && !t.days) t.days = [0, 1, 2, 3, 4, 5, 6].slice(0, Math.min(t.perWeek, 7)); renderFreq(); }));
  $$('#tpd [data-d]', el).forEach((b) => (b.onclick = () => { t.timesPerDay = Math.max(1, Math.min(6, perDay(t) + +b.dataset.d)); $('#tpd b', el).textContent = t.timesPerDay; }));
  $('#goal-on', el).onchange = (e) => { $('#goal-panel', el).hidden = !e.target.checked; };
  renderIcons(); renderFreq();

  $('form', el).onsubmit = (e) => {
    e.preventDefault();
    const title = $('#ed-title', el).value.trim();
    if (!title) { $('#ed-title', el).focus(); $('#ed-title', el).classList.add('shake'); setTimeout(() => $('#ed-title', el).classList.remove('shake'), 400); return; }
    if (mode === 'days' && !(t.days && t.days.length)) { toast('Vyber aspoň jeden den'); return; }
    t.title = title;
    t.note = $('#ed-note', el).value.trim();
    if (mode === 'count') t.days = null;
    if ($('#goal-on', el).checked) {
      t.goal = { target: Math.max(1, +$('#g-target', el).value || 1), unit: $('#g-unit', el).value.trim(), step: Math.max(1, +$('#g-step', el).value || 1), done: Math.max(0, +$('#g-done', el).value || 0) };
      t.finishedAt = t.goal.done >= t.goal.target ? (t.finishedAt || todayKey()) : null;
    } else { t.goal = null; t.finishedAt = null; }
    update((x) => {
      const i = x.tasks.findIndex((y) => y.id === t.id);
      if (i >= 0) x.tasks[i] = t; else x.tasks.push(t);
    });
    s.close();
    toast(existing ? 'Úkol upraven' : 'Úkol přidán');
    notify.syncBadge();
    rerender();
  };

  const del = $('#ed-del', el);
  if (del) del.onclick = async () => {
    s.close();
    const removed = existing;
    update((x) => { x.tasks = x.tasks.filter((y) => y.id !== t.id); });
    toast('Úkol smazán', { action: 'Vrátit', onAction: () => { update((x) => x.tasks.push(removed)); rerender(); } });
    notify.syncBadge();
    rerender();
  };
  const arch = $('#ed-archive', el);
  if (arch) arch.onclick = () => {
    update((x) => { const y = x.tasks.find((z) => z.id === t.id); y.archivedAt = y.archivedAt ? null : todayKey(); });
    s.close(); toast(existing.archivedAt ? 'Úkol obnoven' : 'Úkol archivován'); notify.syncBadge(); rerender();
  };
}

// ============================================================ presets sheet
export function openPresets({ first = false } = {}) {
  const d = userData();
  const have = new Set(d.tasks.map((t) => t.title));
  const chosen = new Set(first ? PRESETS.slice(0, 5).map((_, i) => i) : []);
  const s = sheet(`
    <div class="sheet-header">
      <button type="button" class="btn text" data-close>${first ? 'Přeskočit' : 'Zrušit'}</button>
      <h3>${first ? 'Začni s těmito' : 'Návrhy úkolů'}</h3>
      <button type="button" class="btn text strong" id="pr-add">Přidat</button>
    </div>
    <div class="sheet-body">
      <p class="muted">${first ? 'Vybrali jsme pár věcí, které jsi zmínil. Frekvenci si pak můžeš upravit.' : 'Vyber, co chceš přidat.'}</p>
      <ul class="list selectable">
        ${PRESETS.map((p, i) => `
          <li class="task ${have.has(p.title) ? 'disabled' : ''}">
            <button type="button" class="check ${chosen.has(i) ? 'sel' : ''}" data-i="${i}" ${have.has(p.title) ? 'disabled' : ''} aria-pressed="${chosen.has(i)}" aria-label="${esc(p.title)}"><svg viewBox="0 0 24 24" class="tick"><path d="M6 12.5l4 4L18 8"/></svg></button>
            <span class="tile">${taskIcon(p.icon, 22)}</span>
            <div class="task-main" data-i="${i}"><span class="task-title">${esc(p.title)}</span><span class="task-sub">${esc(frequencyLabel(p))}${p.goal ? ` · cíl ${p.goal.target} ${p.goal.unit}` : ''}${have.has(p.title) ? ' · už máš' : ''}</span></div>
          </li>`).join('')}
      </ul>
    </div>`, { wide: true });
  $$('[data-i]', s.el).forEach((b) => (b.onclick = () => {
    const i = +b.dataset.i; if (have.has(PRESETS[i].title)) return;
    chosen.has(i) ? chosen.delete(i) : chosen.add(i);
    const c = $(`.check[data-i="${i}"]`, s.el); c.classList.toggle('sel', chosen.has(i)); c.setAttribute('aria-pressed', chosen.has(i));
  }));
  $('#pr-add', s.el).onclick = () => {
    update((x) => { [...chosen].sort().forEach((i) => x.tasks.push(makeTask(PRESETS[i]))); });
    s.close();
    if (chosen.size) toast(`Přidáno ${chosen.size} ${plural(chosen.size, 'úkol', 'úkoly', 'úkolů')}`);
    notify.syncBadge();
    rerender();
  };
}

// ============================================================ auth screen
export function renderAuth(onDone, initialMode) {
  let mode = initialMode || 'login';
  const app = $('#app');
  app.innerHTML = `
    <div class="auth">
      <div class="auth-hero" aria-hidden="true">
        <div class="float-cards">
          ${[['tooth', 'Vyčistit zuby', 'Každý den'], ['pin', 'Pinterest piny', '120 / 200'], ['braces', 'Rovnátka přes noc', 'Každý den'], ['gamepad', 'Marvel Rivals videa', '3× týdně']]
            .map(([ic, t, f], i) => `<div class="fc" style="--i:${i}"><span class="fc-check ${i % 2 ? '' : 'on'}"><svg viewBox="0 0 24 24"><path d="M6 12.5l4 4L18 8"/></svg></span><span class="fc-ic">${icon(ic, 18)}</span><span><b>${t}</b><small>${f}</small></span></div>`).join('')}
        </div>
        <div class="auth-copy">
          <h1>Check It.</h1>
          <p>Denní checklist, který tě nenechá zapomenout.</p>
        </div>
      </div>
      <div class="auth-panel">
        <form class="auth-card" novalidate>
          <div class="brand-mark lg"><svg viewBox="0 0 64 64"><rect x="2" y="2" width="60" height="60" rx="16"/><path d="M19 33.5l8.5 8.5L45.5 23"/></svg></div>
          <h2 id="auth-title"></h2>
          <p class="muted" id="auth-sub"></p>
          <div class="seg full"><button type="button" data-m="login">Přihlásit</button><button type="button" data-m="register">Registrovat</button></div>
          <label class="field reg-only"><span>Jméno</span><input id="a-name" autocomplete="given-name" placeholder="Jak ti máme říkat?"></label>
          <label class="field"><span>Uživatelské jméno</span><input id="a-user" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="napr. danko" required></label>
          <label class="field"><span>Heslo</span><input id="a-pass" type="password" placeholder="Aspoň 6 znaků" required></label>
          <p class="error" id="a-err" role="alert"></p>
          <button class="btn primary large full" id="a-submit" type="submit"></button>
          <p class="muted small center">Účet i data se ukládají jen v tomto prohlížeči.</p>
        </form>
      </div>
    </div>`;
  const form = $('.auth-card', app);
  const setMode = (m) => {
    mode = m;
    $$('[data-m]', form).forEach((b) => b.classList.toggle('on', b.dataset.m === m));
    form.classList.toggle('is-register', m === 'register');
    $('#auth-title', form).textContent = m === 'login' ? 'Vítej zpět' : 'Vytvoř si účet';
    $('#auth-sub', form).textContent = m === 'login' ? 'Přihlas se a pokračuj ve svém rytmu.' : 'Zabere to deset vteřin.';
    $('#a-submit', form).textContent = m === 'login' ? 'Přihlásit se' : 'Vytvořit účet';
    $('#a-pass', form).autocomplete = m === 'login' ? 'current-password' : 'new-password';
    $('#a-err', form).textContent = '';
  };
  $$('[data-m]', form).forEach((b) => (b.onclick = () => setMode(b.dataset.m)));
  setMode(mode);
  form.onsubmit = async (e) => {
    e.preventDefault();
    const btn = $('#a-submit', form);
    btn.disabled = true;
    try {
      const u = $('#a-user', form).value; const pw = $('#a-pass', form).value;
      if (mode === 'register') await register(u, $('#a-name', form).value, pw);
      else await login(u, pw);
      onDone(mode);
    } catch (err) {
      $('#a-err', form).textContent = err.message;
      form.classList.add('shake'); setTimeout(() => form.classList.remove('shake'), 400);
      btn.disabled = false;
    }
  };
}
