// Export activity, stats and everything else as files.
import { userData, exportJSON, parseBackup, backupSummary, importBackup } from './store.js';
import { profile } from './auth.js';
import { icon } from './icons.js';
import { popover, closePopover, toast, sheet, $, esc } from './ui.js';
import { todayKey, addDays, statusOn, countOn, perDay, frequencyLabel, taskStats, streak, prettyDate, DAY_NAMES, weekday } from './schedule.js';

const pad = (n) => String(n).padStart(2, '0');
const time = (ts) => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

function csv(rows) {
  const cell = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n');
}

function download(name, text, type) {
  const blob = new Blob([text], { type });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

// One row per task per day it was planned or done.
export function activityRows(d = userData()) {
  const today = todayKey();
  const starts = d.tasks.map((t) => t.createdAt).filter(Boolean).sort();
  const logDays = Object.keys(d.log).sort();
  let k = [starts[0], logDays[0]].filter(Boolean).sort()[0] || today;
  const rows = [];
  for (let i = 0; k <= today && i < 3700; i++, k = addDays(k, 1)) {
    for (const t of d.tasks) {
      const s = statusOn(d, t, k);
      const c = countOn(d, t, k);
      if (s.kind === 'inactive' || (s.kind === 'off' && !c) || (s.kind === 'met' && !c)) continue;
      const done = c >= perDay(t);
      const at = d.doneAt && d.doneAt[k] && d.doneAt[k][t.id];
      let status;
      if (done) status = 'done';
      else if (k === today) status = c ? 'in progress' : 'open';
      else status = s.kind === 'required' ? 'skipped' : 'optional';
      if (status === 'optional' && !c) continue;
      rows.push({ date: k, weekday: DAY_NAMES[weekday(k)], task: t.title, status, completedAt: at ? time(at) : '', times: `${c}/${perDay(t)}`, frequency: frequencyLabel(t) });
    }
  }
  return rows;
}

export function exportActivity() {
  const rows = activityRows();
  if (!rows.length) { toast('No activity to export yet'); return; }
  download(`checkit-activity-${todayKey()}.csv`, csv([
    ['Date', 'Weekday', 'Task', 'Status', 'Completed at', 'Times', 'Frequency'],
    ...rows.map((r) => [r.date, r.weekday, r.task, r.status, r.completedAt, r.times, r.frequency]),
  ]), 'text/csv;charset=utf-8');
  toast(`Exported ${rows.length} activity rows`);
}

export function exportStats() {
  const d = userData();
  const s30 = taskStats(d, 30);
  const s7 = taskStats(d, 7);
  download(`checkit-stats-${todayKey()}.csv`, csv([
    ['Task', 'Frequency', 'Done (7d)', 'Skipped (7d)', 'Success (7d)', 'Done (30d)', 'Skipped (30d)', 'Success (30d)', 'Goal'],
    ...s30.map((s) => {
      const w = s7.find((x) => x.t.id === s.t.id) || {};
      const pct = (r) => (r == null ? '' : `${Math.round(r * 100)}%`);
      return [s.t.title, frequencyLabel(s.t), w.done ?? '', w.missed ?? '', pct(w.rate), s.done, s.missed, pct(s.rate), s.t.goal ? `${s.t.goal.done}/${s.t.goal.target} ${s.t.goal.unit || ''}` : ''];
    }),
    [],
    ['Current streak (days)', streak(d)],
    ['Exported', new Date().toLocaleString('en-GB')],
  ]), 'text/csv;charset=utf-8');
  toast('Stats exported');
}

export function exportNotes() {
  const d = userData();
  if (!d.notes.length) { toast('No notes yet'); return; }
  const md = d.notes.map((n) => `# ${n.title || 'Untitled'}\n\n_${n.tag ? n.tag + ' · ' : ''}updated ${new Date(n.updatedAt).toLocaleString('en-GB')}_\n\n${n.body || ''}`).join('\n\n---\n\n');
  download(`checkit-notes-${todayKey()}.md`, md, 'text/markdown;charset=utf-8');
  toast(`Exported ${d.notes.length} notes`);
}

export function exportChannels() {
  const d = userData();
  if (!d.messages.length) { toast('No messages yet'); return; }
  const name = (id) => (d.channels.find((c) => c.id === id) || {}).name || 'deleted';
  download(`checkit-channels-${todayKey()}.csv`, csv([
    ['Channel', 'Date', 'Time', 'Message'],
    ...d.messages.map((m) => { const dt = new Date(m.ts); return [`#${name(m.channelId)}`, `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`, time(m.ts), m.text]; }),
  ]), 'text/csv;charset=utf-8');
  toast('Channels exported');
}

export function exportAll() {
  download(`checkit-${profile().id}-${todayKey()}.checkit.json`, exportJSON(), 'application/json');
  toast('Import this file into any Check It account to move your data.', { title: 'Backup downloaded', icon: 'download' });
}

export async function exportJournal() {
  const { journalMarkdown } = await import('./journal.js');
  const md = journalMarkdown();
  if (!md) { toast('No journal entries yet', { tone: 'info' }); return; }
  download(`checkit-journal-${todayKey()}.md`, `# Journal\n\n${md}\n`, 'text/markdown;charset=utf-8');
  toast('Journal exported');
}

// Pick a file, show what's in it, then merge or replace.
export function openImport(after) {
  const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.json,application/json' });
  input.onchange = async () => {
    const f = input.files[0]; if (!f) return;
    let parsed;
    try { parsed = parseBackup(await f.text()); } catch (e) { toast(e.message, { tone: 'bad', title: 'Can’t import' }); return; }
    const n = backupSummary(parsed.data);
    const when = parsed.meta.exportedAt ? new Date(parsed.meta.exportedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    const s = sheet(`
      <div class="sheet-body">
        <span class="notice-ic">${icon('upload', 24)}</span>
        <h3 class="sheet-title">Import backup</h3>
        <p class="muted">${parsed.meta.user ? `From <b>@${esc(parsed.meta.user)}</b>` : 'From a Check It backup'}${when ? ` · exported ${esc(when)}` : ''}</p>
        <div class="imp-grid">
          ${[['Tasks', n.tasks], ['Days of history', n.days], ['Notes', n.notes], ['Journal entries', n.journal], ['Channels', n.channels], ['Messages', n.messages]].map(([l, v]) => `<div><b class="num">${v}</b><span>${l}</span></div>`).join('')}
        </div>
        <div class="imp-opts">
          <button class="imp-opt on" data-mode="merge"><b>Merge</b><span>Keep everything here and add what’s new.</span></button>
          <button class="imp-opt" data-mode="replace"><b>Replace</b><span>Swap this account’s data for the file’s.</span></button>
        </div>
        <div class="row gap"><button class="btn ghost grow" data-close>Cancel</button><button class="btn primary grow" id="imp-go">Import</button></div>
      </div>`);
    let mode = 'merge';
    s.el.querySelectorAll('[data-mode]').forEach((b) => (b.onclick = () => { mode = b.dataset.mode; s.el.querySelectorAll('[data-mode]').forEach((x) => x.classList.toggle('on', x === b)); $('#imp-go', s.el).classList.toggle('danger', mode === 'replace'); $('#imp-go', s.el).textContent = mode === 'replace' ? 'Replace my data' : 'Import'; }));
    $('#imp-go', s.el).onclick = () => {
      importBackup(parsed.data, mode);
      s.close();
      toast(mode === 'merge' ? 'Your data was merged.' : 'Your data was replaced.', { title: 'Import complete', icon: 'upload' });
      after ? after() : location.reload();
    };
  };
  input.click();
}

export function exportMenu(anchor) {
  const items = [
    ['chart', 'Activity log', 'Every task, every day · CSV', exportActivity],
    ['list', 'Stats summary', '7 and 30 day success · CSV', exportStats],
    ['book', 'Notes', 'All notes · Markdown', exportNotes],
    ['pen', 'Journal', 'Every entry and mood · Markdown', exportJournal],
    ['hash', 'Channels', 'All messages · CSV', exportChannels],
    ['archive', 'Everything', 'One file you can import anywhere · .checkit.json', exportAll],
  ];
  const el = popover(anchor, `<div class="menu export-menu" role="menu">
    <div class="menu-label">Export</div>
    ${items.map(([ic, t, sub], i) => `<button role="menuitem" data-x="${i}"><span class="mi-ic">${icon(ic, 18)}</span><span class="mi-txt"><b>${t}</b><small>${sub}</small></span>${icon('download', 16)}</button>`).join('')}
    <div class="menu-sep"></div>
    <button role="menuitem" data-import><span class="mi-ic">${icon('upload', 18)}</span><span class="mi-txt"><b>Import</b><small>Bring in a .checkit.json backup</small></span></button>
  </div>`, { cls: 'pop-export' });
  if (!el) return;
  el.querySelector('[data-import]').onclick = () => { closePopover(); openImport(); };
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-x]');
    if (!b) return;
    closePopover();
    items[+b.dataset.x][3]();
  });
}

export { prettyDate };
