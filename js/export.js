// Export activity, stats and everything else as files.
import { userData } from './store.js';
import { profile } from './auth.js';
import { icon } from './icons.js';
import { popover, closePopover, toast } from './ui.js';
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
  const p = profile();
  download(`checkit-backup-${todayKey()}.json`, JSON.stringify({ app: 'checkit', version: 3, exportedAt: new Date().toISOString(), user: p.id, data: userData() }, null, 2), 'application/json');
  toast('Backup downloaded');
}

export function exportMenu(anchor) {
  const items = [
    ['chart', 'Activity log', 'Every task, every day · CSV', exportActivity],
    ['list', 'Stats summary', '7 and 30 day success · CSV', exportStats],
    ['book', 'Notes', 'All notes · Markdown', exportNotes],
    ['hash', 'Channels', 'All messages · CSV', exportChannels],
    ['archive', 'Everything', 'Full backup · JSON', exportAll],
  ];
  const el = popover(anchor, `<div class="menu export-menu" role="menu">
    <div class="menu-label">Export</div>
    ${items.map(([ic, t, sub], i) => `<button role="menuitem" data-x="${i}"><span class="mi-ic">${icon(ic, 18)}</span><span class="mi-txt"><b>${t}</b><small>${sub}</small></span>${icon('download', 16)}</button>`).join('')}
  </div>`, { cls: 'pop-export' });
  if (!el) return;
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-x]');
    if (!b) return;
    closePopover();
    items[+b.dataset.x][3]();
  });
}

export { prettyDate };
