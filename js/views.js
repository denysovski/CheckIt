import { icon, taskIcon, TASK_GLYPHS, searchSvgl, logoMark } from './icons.js';
import { esc, $, $$, uid, toast, sheet, confirmSheet, ring, popover, closePopover, isPopoverFor, timePicker, countUp, stagger } from './ui.js';
import { userData, update, exportJSON, importJSON, getState, save, getPrefs, setPrefs, clearAllData } from './store.js';
import { profile, logout } from './auth.js';
import {
  todayKey, prettyDate, todayBuckets, frequencyLabel, perDay, countOn, statusOn, daySummary,
  weekday, keyOf, parseKey, MONTHS, DAY_SHORT, taskStats, streak, dailySeries, insights,
  weekdayMisses, DAY_NAMES, isFixed, activeTasks,
} from './schedule.js';
import * as notify from './notify.js';
import { playIntro } from './intro.js';
import { register, rerender } from './router.js';
import { exportMenu } from './export.js';

export const pl = (n, word, plural = word + 's') => `${n} ${n === 1 ? word : plural}`;
export const REPO_URL = 'https://github.com/denysovski/CheckIt';
export const clock = (ts) => { const d = new Date(ts); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

// ============================================================ presets
export const PRESETS = [
  { title: 'Upload Pinterest pins', icon: { kind: 'svgl', value: 'https://svgl.app/library/pinterest.svg' }, perWeek: 7, goal: { target: 200, unit: 'pins', step: 5, done: 0 } },
  { title: 'Download new Marvel Rivals videos', icon: { kind: 'glyph', value: 'gamepad' }, perWeek: 3 },
  { title: 'Brush teeth', icon: { kind: 'glyph', value: 'tooth' }, perWeek: 7, timesPerDay: 2 },
  { title: 'Interdental brushes', icon: { kind: 'glyph', value: 'interdental' }, perWeek: 7 },
  { title: 'Put on retainer for the night', icon: { kind: 'glyph', value: 'braces' }, perWeek: 7 },
  { title: 'Drink 2 litres of water', icon: { kind: 'glyph', value: 'drop' }, perWeek: 7 },
  { title: 'Workout', icon: { kind: 'glyph', value: 'dumbbell' }, perWeek: 3 },
  { title: 'Read for 20 minutes', icon: { kind: 'glyph', value: 'book' }, perWeek: 5 },
];

function makeTask(p) {
  return {
    id: uid(), title: p.title, note: p.note || '', icon: p.icon || { kind: 'glyph', value: 'star' },
    perWeek: p.perWeek ?? 7, days: p.days || null, timesPerDay: p.timesPerDay || 1,
    link: p.link || '', linkLabel: p.linkLabel || '',
    goal: p.goal ? { ...p.goal } : null, createdAt: todayKey(), archivedAt: null, finishedAt: null,
  };
}

// Accepts "pinterest.com/me" and turns it into a proper https URL.
function normalizeUrl(v) {
  const s = (v || '').trim();
  if (!s) return '';
  const withProto = /^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withProto);
    return ['http:', 'https:'].includes(u.protocol) ? u.href : '';
  } catch { return ''; }
}
const hostOf = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };

// ============================================================ actions
export function toggleTask(taskId, k = todayKey()) {
  let message = null;
  update((d) => {
    const t = d.tasks.find((x) => x.id === taskId);
    if (!t) return;
    const max = perDay(t);
    const before = countOn(d, t, k);
    const after = before >= max ? 0 : before + 1;
    d.log[k] = d.log[k] || {};
    if (after) d.log[k][t.id] = after; else delete d.log[k][t.id];
    d.doneAt = d.doneAt || {};
    d.doneAt[k] = d.doneAt[k] || {};
    if (after >= max && before < max) d.doneAt[k][t.id] = Date.now();
    if (after < max) delete d.doneAt[k][t.id];
    if (t.goal) {
      const step = t.goal.step || 1;
      if (before < max && after >= max) t.goal.done = (t.goal.done || 0) + step;
      if (before >= max && after < max) t.goal.done = Math.max(0, (t.goal.done || 0) - step);
      if (t.goal.done >= t.goal.target && !t.finishedAt) { t.finishedAt = k; message = `Goal “${t.title}” reached. Great work.`; }
      if (t.goal.done < t.goal.target && t.finishedAt) t.finishedAt = null;
    }
  });
  if (message) toast(message);
  notify.syncBadge();
}

function moveTask(id, dir) {
  update((d) => {
    const list = d.tasks;
    const i = list.findIndex((t) => t.id === id);
    // find next visible (non-archived) neighbour in that direction
    let j = i + dir;
    while (j >= 0 && j < list.length && list[j].archivedAt) j += dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
  });
  rerender();
}

function deleteTask(id) {
  const d = userData();
  const idx = d.tasks.findIndex((t) => t.id === id);
  if (idx < 0) return;
  const removed = d.tasks[idx];
  update((x) => { x.tasks = x.tasks.filter((y) => y.id !== id); });
  toast('Task deleted', { action: 'Undo', onAction: () => { update((x) => x.tasks.splice(idx, 0, removed)); notify.syncBadge(); rerender(); } });
  notify.syncBadge();
  rerender();
}

function archiveTask(id) {
  let was = false;
  update((x) => { const y = x.tasks.find((z) => z.id === id); was = !!y.archivedAt; y.archivedAt = was ? null : todayKey(); });
  toast(was ? 'Task restored' : 'Task archived');
  notify.syncBadge();
  rerender();
}

function quickAdd(title) {
  const t = makeTask({ title, perWeek: 7 });
  update((d) => d.tasks.push(t));
  notify.syncBadge();
  toast('Task added', { action: 'Edit', onAction: () => openEditor(t.id) });
  rerender();
}

// ============================================================ context menu (⋯)
function showTaskMenu(anchor, id) {
  const d = userData();
  const t = d.tasks.find((x) => x.id === id);
  if (!t) return;
  const visible = d.tasks.filter((x) => !x.archivedAt);
  const pos = visible.indexOf(t);
  const items = [
    ['edit', 'Edit', 'edit'],
    t.link ? ['external', `Open ${t.linkLabel || hostOf(t.link)}`, 'open'] : ['link', 'Add link', 'link'],
    ['arrowUp', 'Move up', 'up', pos <= 0 || !!t.archivedAt],
    ['arrowDown', 'Move down', 'down', pos < 0 || pos >= visible.length - 1 || !!t.archivedAt],
    'sep',
    ['archive', t.archivedAt ? 'Restore' : 'Archive', 'archive'],
    ['trash', 'Delete', 'delete', false, true],
  ];
  const m = popover(anchor, `<div class="menu" role="menu">${items.map((it) => (it === 'sep' ? '<div class="menu-sep"></div>'
    : `<button role="menuitem" data-act="${it[2]}" class="${it[4] ? 'danger' : ''}" ${it[3] ? 'disabled' : ''}><span>${esc(it[1])}</span>${icon(it[0], 18)}</button>`)).join('')}</div>`);
  if (!m) return;
  m.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    closePopover();
    ({
      edit: () => openEditor(id),
      link: () => openEditor(id, { focus: 'link' }),
      open: () => window.open(t.link, '_blank', 'noopener'),
      up: () => moveTask(id, -1),
      down: () => moveTask(id, 1),
      archive: () => archiveTask(id),
      delete: async () => { if (await confirmSheet('Delete task?', `“${t.title}” and its history will be removed.`, 'Delete')) deleteTask(id); },
    })[b.dataset.act]();
  });
}

// ============================================================ notifications
export function showBlockedNotice() {
  sheet(`
    <div class="sheet-body center">
      <span class="notice-ic red">${icon('bell', 26)}</span>
      <h3 class="sheet-title">Notifications are blocked</h3>
      <p class="muted">All notifications for Check It are blocked in your browser. Please unblock them and try this again later.</p>
      <ol class="howto left">
        <li>Click the <b>lock / settings icon</b> next to the address bar.</li>
        <li>Set <b>Notifications</b> to <b>Allow</b>.</li>
        <li>Reload the page and press <b>Turn on notifications</b> again.</li>
      </ol>
      <button class="btn primary full" data-close>Got it</button>
    </div>`);
}

export async function turnOnNotifications() {
  const perm = notify.permission();
  if (perm === 'unsupported') { toast('This browser doesn’t support notifications'); return 'unsupported'; }
  if (perm === 'granted') { toast('Notifications are already on'); notify.testNotification(); return perm; }
  if (perm === 'denied') { showBlockedNotice(); return perm; }
  const r = await notify.requestPermission();
  if (r === 'granted') { toast('Notifications on'); notify.startupReminder(); }
  else if (r === 'denied') showBlockedNotice();
  return r;
}

// Asked right after the first sign-in.
export function askNotifications() {
  return new Promise((resolve) => {
    if (!notify.supported() || notify.permission() !== 'default') return resolve();
    const s = sheet(`
      <div class="sheet-body center">
        <span class="notice-ic">${icon('bell', 26)}</span>
        <h3 class="sheet-title">Allow reminders?</h3>
        <p class="muted">Check It will show a browser notification with your unfinished tasks when you open it, and once in the evening. Nothing else.</p>
        <div class="col gap">
          <button class="btn primary full" id="nt-yes">Turn on notifications</button>
          <button class="btn ghost full" data-close>Not now</button>
        </div>
      </div>`, { onClose: resolve });
    $('#nt-yes', s.el).onclick = async () => { s.close(); await turnOnNotifications(); };
  });
}

// ============================================================ month picker
function monthPicker(anchor, y, m, onPick) {
  let yy = y;
  const today = todayKey();
  const render = () => `
    <div class="mp">
      <div class="mp-head">
        <button type="button" class="icon-btn" data-y="-1" aria-label="Previous year">${icon('chevL', 18)}</button>
        <b>${yy}</b>
        <button type="button" class="icon-btn" data-y="1" aria-label="Next year">${icon('chevR', 18)}</button>
      </div>
      <div class="mp-grid">${MONTHS.map((n, i) => {
        const cur = yy === y && i + 1 === m;
        const now = `${yy}-${String(i + 1).padStart(2, '0')}` === today.slice(0, 7);
        return `<button type="button" data-mo="${i + 1}" class="${cur ? 'on' : ''} ${now ? 'now' : ''}">${n.slice(0, 3)}</button>`;
      }).join('')}</div>
    </div>`;
  const el = popover(anchor, render(), { align: 'start', cls: 'pop-month' });
  if (!el) return;
  const bind = () => {
    $$('[data-y]', el).forEach((b) => (b.onclick = () => { yy += +b.dataset.y; el.innerHTML = render(); bind(); }));
    $$('[data-mo]', el).forEach((b) => (b.onclick = () => { closePopover(); onPick(yy, +b.dataset.mo); }));
  };
  bind();
}

// ============================================================ account menu
function themeSeg(cur) {
  return `<div class="seg mini" role="radiogroup" aria-label="Appearance">${[['light', 'Light', 'sun'], ['dark', 'Dark', 'moon'], ['system', 'Auto', 'gear']]
    .map(([v, l, ic]) => `<button type="button" role="radio" aria-checked="${cur === v}" data-theme-set="${v}" class="${cur === v ? 'on' : ''}">${icon(ic, 15)}<span>${l}</span></button>`).join('')}</div>`;
}

function bindPrefControls(root, after) {
  $$('[data-theme-set]', root).forEach((b) => (b.onclick = () => {
    setPrefs({ theme: b.dataset.themeSet });
    $$('[data-theme-set]', root).forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); });
    after && after();
  }));
  const mo = $('[data-motion]', root);
  if (mo) mo.onchange = () => { setPrefs({ motion: mo.checked }); after && after(); };
  const cl = $('[data-clear]', root);
  if (cl) cl.onclick = async () => {
    closePopover();
    if (!(await confirmSheet('Clear all my data?', 'Every account, task, history entry and setting stored in this browser will be erased. This can’t be undone.', 'Clear everything'))) return;
    await clearAllData();
    location.hash = '#/';
    location.reload();
  };
}

export function showAccountMenu(anchor) {
  const p = profile();
  const prefs = getPrefs();
  const m = popover(anchor, `
    <div class="menu account">
      <div class="acc-head"><span class="avatar static">${esc((p.name || '?').slice(0, 1).toUpperCase())}</span><div><b>${esc(p.name)}</b><small>@${esc(p.id)}</small></div></div>
      <div class="menu-sep"></div>
      <div class="menu-label">Appearance</div>
      <div class="menu-pad">${themeSeg(prefs.theme)}</div>
      <label class="menu-row"><span>Animations</span><input type="checkbox" class="switch sm" data-motion ${prefs.motion ? 'checked' : ''}></label>
      <div class="menu-row"><span>Notifications<small>${{ granted: 'On', denied: 'Blocked', default: 'Off', unsupported: 'Unsupported' }[notify.permission()]}</small></span>
        ${notify.permission() === 'granted' ? `<span class="pill">On</span>` : `<button class="btn primary small" data-notify>Turn on</button>`}</div>
      <div class="menu-sep"></div>
      <a href="#/settings" data-go>${'<span>Settings</span>'}${icon('gear', 18)}</a>
      <button data-export><span>Export my data</span>${icon('download', 18)}</button>
      <a href="${REPO_URL}" target="_blank" rel="noopener noreferrer"><span>GitHub repository</span>${icon('external', 18)}</a>
      <div class="menu-sep"></div>
      <button data-logout><span>Log out</span>${icon('logout', 18)}</button>
      <button class="danger" data-clear><span>Clear all my data</span>${icon('trash', 18)}</button>
    </div>`, { cls: 'pop-account' });
  if (!m) return;
  bindPrefControls(m);
  $('[data-go]', m).onclick = () => closePopover();
  $('[data-export]', m).onclick = (e) => { e.stopPropagation(); const anchor = document.getElementById('account-btn'); closePopover(); setTimeout(() => exportMenu(anchor), 200); };
  const nb = $('[data-notify]', m);
  if (nb) nb.onclick = async () => { closePopover(); await turnOnNotifications(); rerender(); };
  $('[data-logout]', m).onclick = () => { logout(); location.hash = '#/'; location.reload(); };
}

// ============================================================ registration
register('today', (v) => viewToday(v));
register('calendar', (v) => viewCalendar(v));
register('stats', (v) => viewStats(v));
register('tasks', (v) => viewTasks(v));
register('settings', (v) => viewSettings(v));

// ============================================================ rows
function linkBtn(t) {
  if (!t.link) return '';
  const label = t.linkLabel || hostOf(t.link);
  return `<a class="link-btn" href="${esc(t.link)}" target="_blank" rel="noopener noreferrer" title="${esc(t.link)}" aria-label="Open ${esc(label)}">
    ${icon('link', 16)}<span>${esc(label)}</span></a>`;
}

export function taskRow(t, k, s, { compact = false, history = false } = {}) {
  const d = userData();
  const c = countOn(d, t, k);
  const max = perDay(t);
  const done = c >= max;
  let sub = frequencyLabel(t);
  if (s && s.kind === 'flexible' && !done && s.remaining) sub = `${s.remaining}× left this week · optional today`;
  if (s && s.kind === 'required' && s.need && s.need < 7 && !isFixed(t) && !done) sub = `${s.remaining}× left this week · due today`;
  if (history) {
    const at = d.doneAt && d.doneAt[k] && d.doneAt[k][t.id];
    sub = done ? (at ? `Done at ${clock(at)}` : 'Done') : k < todayKey() ? (s && s.kind === 'required' ? 'Skipped' : 'Not done · optional') : c ? `${c} of ${max} so far` : 'Not done yet';
  }
  const goal = t.goal ? `<div class="goal"><div class="goal-bar"><i style="width:${Math.min(100, (t.goal.done / t.goal.target) * 100)}%"></i></div><small>${t.goal.done} / ${t.goal.target} ${esc(t.goal.unit || '')}</small></div>` : '';
  const dots = max > 1 ? `<span class="dots" aria-label="${c} of ${max}">${Array.from({ length: max }, (_, i) => `<i class="${i < c ? 'on' : ''}"></i>`).join('')}</span>` : '';
  return `
    <li class="task ${done ? 'is-done' : ''} ${s && s.kind === 'required' && !done && k < todayKey() ? 'is-missed' : ''}" data-id="${t.id}">
      <button class="check ${c && !done ? 'partial' : ''}" data-toggle="${t.id}" aria-pressed="${done}" aria-label="${done ? 'Mark as not done' : 'Complete'}: ${esc(t.title)}">
        ${max > 1 && !done ? ring(c / max, 30, 2.5, 'mini') : ''}
        <svg viewBox="0 0 24 24" class="tick"><path d="M6 12.5l4 4L18 8"/></svg>
      </button>
      <span class="tile">${taskIcon(t.icon, 22)}</span>
      <div class="task-main" data-toggle="${t.id}">
        <span class="task-title">${esc(t.title)}</span>
        <span class="task-sub">${esc(sub)} ${dots}</span>
        ${compact ? '' : goal}
      </div>
      <div class="task-actions">
        ${linkBtn(t)}
        ${compact ? '' : `<button class="icon-btn subtle" data-menu="${t.id}" aria-haspopup="menu" aria-label="More for ${esc(t.title)}">${icon('more', 20)}</button>`}
      </div>
    </li>`;
}

export function bindRows(root, k, after) {
  $$('[data-toggle]', root).forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    const row = b.closest('.task');
    const wasDone = row.classList.contains('is-done');
    toggleTask(b.dataset.toggle, k);
    if (!wasDone) row.classList.add('pop');
    setTimeout(() => (after || rerender)(), wasDone ? 0 : 260);
  }));
  bindMenus(root);
}

function bindMenus(root) {
  $$('[data-menu]', root).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); showTaskMenu(b, b.dataset.menu); }));
  $$('.link-btn', root).forEach((a) => a.addEventListener('click', (e) => e.stopPropagation()));
}

function quickAddBar(id) {
  return `
    <form class="quick-add" id="${id}" autocomplete="off">
      <span class="qa-plus">${icon('plus', 18)}</span>
      <input name="t" placeholder="Add a daily task and press Enter…" maxlength="80" aria-label="New task">
      <button type="button" class="btn text qa-more" data-more>Details</button>
    </form>`;
}

function bindQuickAdd(view, id) {
  const f = $(`#${id}`, view);
  if (!f) return;
  f.onsubmit = (e) => { e.preventDefault(); const v = f.t.value.trim(); if (!v) return; quickAdd(v); };
  $('[data-more]', f).onclick = () => openEditor(null, { title: f.t.value.trim() });
}

// ============================================================ today
function viewToday(view) {
  const d = userData();
  const k = todayKey();
  const b = todayBuckets(d, k);
  const sum = daySummary(d, k);
  const p = profile();
  const hour = new Date().getHours();
  const greet = hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const tip = insights(d).find((i) => i.tone === 'bad' || i.tone === 'warn');
  const needsPerm = notify.supported() && notify.permission() === 'default';
  const pct = sum.total ? Math.round((sum.done / sum.total) * 100) : 0;
  const left = sum.total - sum.done;

  view.innerHTML = `
    <section class="page">
      <div class="hero-head with-ring">
        <div>
          <p class="eyebrow">${esc(prettyDate(k))}</p>
          <h1 class="large-title">${greet}${p?.name ? `, ${esc(p.name)}` : ''}.</h1>
          <p class="lead">${sum.total ? (left === 0 ? 'All done. Enjoy the rest of your day.' : `${pl(left, 'task')} left out of ${sum.total}.`) : 'Nothing scheduled for today.'}</p>
        </div>
        <div class="today-ring" aria-label="${pct}% done">
          ${ring(sum.ratio, 120, 11, 'big')}
          <div class="tr-label"><b><span data-count="${pct}">${pct}</span><small>%</small></b><span>${sum.done}/${sum.total}</span></div>
        </div>
      </div>

      ${needsPerm && d.tasks.length ? `
        <div class="callout blue">
          <span class="callout-ic">${icon('bell', 20)}</span>
          <div class="grow"><b>Turn on notifications</b><p>When you open your browser, Check It will remind you what's still left.</p></div>
          <button class="btn primary small" id="perm">Turn on</button>
        </div>` : ''}

      ${tip ? `
        <div class="callout ${tip.tone === 'bad' ? 'red' : 'amber'}">
          <span class="callout-ic">${icon('flag', 20)}</span>
          <div class="grow"><b>${esc(tip.title)}</b><p>${esc(tip.body)}</p></div>
          <a class="btn ghost small" href="#/stats">Stats</a>
        </div>` : ''}

      <div class="section-head">
        <h2>Due today</h2>
        <button class="btn primary small" id="add">${icon('plus', 16)} New task</button>
      </div>
      ${quickAddBar('qa-today')}
      ${b.required.length ? `<ul class="list">${b.required.map(({ t, s }) => taskRow(t, k, s)).join('')}</ul>`
        : `<div class="empty">${d.tasks.length ? `<span class="empty-ic">${icon('check', 28)}</span><p>Everything due today is done.</p>` : emptyIllustration()}</div>`}

      ${b.flexible.length ? `
        <div class="section-head"><h2>This week</h2><span class="muted small">Do it whenever it suits you</span></div>
        <ul class="list">${b.flexible.map(({ t, s }) => taskRow(t, k, s)).join('')}</ul>` : ''}

      ${b.done.length ? `
        <div class="section-head"><h2>Done</h2><span class="muted small">${b.done.length}</span></div>
        <ul class="list done-list">${b.done.map(({ t, s }) => taskRow(t, k, s)).join('')}</ul>` : ''}
    </section>`;

  bindRows(view, k);
  bindQuickAdd(view, 'qa-today');
  $('#add', view).onclick = () => openEditor();
  const perm = $('#perm', view);
  if (perm) perm.onclick = async () => { await turnOnNotifications(); rerender(); };
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
    <p><b>Nothing here yet.</b><br>Add your first task or start from suggestions.</p>
    <button class="btn ghost" id="empty-presets">${icon('sparkle', 16)} Pick from suggestions</button>`;
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
    cells.push(`<button class="${cls}" data-day="${k}" aria-label="${prettyDate(k)}: ${s.done} of ${s.total}">
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
          <p class="eyebrow">Calendar</p>
          <h1 class="large-title"><button class="month-btn" id="month-pick" aria-haspopup="dialog" aria-expanded="false">${MONTHS[m - 1]} <span class="soft">${y}</span>${icon('chevR', 22, 'month-chev')}</button></h1>
          <p class="lead">${monthTotal ? `${Math.round((monthDone / monthTotal) * 100)}% of tasks done this month.` : 'No data for this month yet.'}</p>
        </div>
        <div class="seg-nav">
          <button class="icon-btn" id="prev" aria-label="Previous month">${icon('chevL', 20)}</button>
          <button class="btn ghost small" id="now">Today</button>
          <button class="icon-btn" id="next" aria-label="Next month">${icon('chevR', 20)}</button>
        </div>
      </div>
      <div class="cal-layout">
        <div class="card cal-card">
          <div class="cal-top">
            <span class="muted small">${monthTotal ? `${monthDone} of ${monthTotal} done` : ''}</span>
            <span class="info-tip" tabindex="0" role="button" aria-label="What the colors mean">
              ${icon('info', 18)}
              <span class="bubble" role="tooltip">
                <b>Reading the calendar</b>
                <span><i class="lg full"></i>Full ring — everything done</span>
                <span><i class="lg part"></i>Partial ring — some tasks done</span>
                <span><i class="lg miss"></i>Red dot — something was skipped</span>
                <span><i class="lg today"></i>Blue number — today</span>
              </span>
            </span>
          </div>
          <div class="cal-grid head">${DAY_SHORT.map((x) => `<span>${x}</span>`).join('')}</div>
          <div class="cal-grid">${cells.join('')}</div>
        </div>
        <div class="card day-card">
          <p class="eyebrow">${calSelected === today ? 'Today' : isFuture ? 'Planned' : 'History'}</p>
          <h3>${esc(prettyDate(calSelected))}</h3>
          <div class="day-chips">
            ${sel.total ? `<span class="chip blue">${icon('check', 14)} ${sel.done} done</span>` : '<span class="chip">No required tasks</span>'}
            ${!isFuture && calSelected < today && sel.total - sel.done > 0 ? `<span class="chip red">${icon('close', 14)} ${sel.total - sel.done} skipped</span>` : ''}
          </div>
          ${selItems.length ? `<ul class="list compact history">${selItems.map(({ t, s }) => taskRow(t, calSelected, s, { compact: true, history: true })).join('')}</ul>` : ''}
          ${isFuture ? '<p class="muted small">Future days can’t be checked in advance.</p>' : calSelected < today ? '<p class="muted small">Forgot to tick something? You can fill it in here.</p>' : ''}
        </div>
      </div>
    </section>`;

  const move = (n) => { const dt = new Date(y, m - 1 + n, 1); calCursor = keyOf(dt).slice(0, 7); viewCalendar(view); };
  $('#prev', view).onclick = () => move(-1);
  $('#next', view).onclick = () => move(1);
  $('#now', view).onclick = () => { calCursor = today.slice(0, 7); calSelected = today; viewCalendar(view); };
  $$('[data-day]', view).forEach((b) => (b.onclick = () => { calSelected = b.dataset.day; view.classList.remove('enter'); viewCalendar(view); const dc = $('.day-card', view); dc.classList.add('swap'); }));
  $('#month-pick', view).onclick = (e) => monthPicker(e.currentTarget, y, m, (ny, nm) => { calCursor = `${ny}-${String(nm).padStart(2, '0')}`; view.classList.remove('enter'); viewCalendar(view); });
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
          <p class="eyebrow">Stats</p>
          <h1 class="large-title">Your rhythm.</h1>
          <p class="lead">The last 30 days in one place.</p>
        </div>
        <button class="btn ghost" id="export-btn" aria-haspopup="menu" aria-expanded="false">${icon('download', 16)} Export</button>
      </div>

      <div class="kpis">
        <div class="kpi"><span>Today</span><b><span data-count="${today.done}">${today.done}</span><small>/${today.total}</small></b></div>
        <div class="kpi"><span>Streak</span><b><span data-count="${st}">${st}</span><small> ${st === 1 ? 'day' : 'days'}</small></b></div>
        <div class="kpi"><span>30-day success</span><b>${rate30 == null ? '—' : `<span data-count="${rate30}">${rate30}</span>`}<small>${rate30 == null ? '' : '%'}</small></b></div>
        <div class="kpi"><span>Skipped in 30 days</span><b class="${totalMiss ? 'red-t' : ''}"><span data-count="${totalMiss}">${totalMiss}</span></b></div>
      </div>

      ${ins.length ? `<div class="section-head"><h2>Nudges</h2></div>
        <div class="insights">${ins.map((i) => `
          <div class="insight ${i.tone}">
            <span class="ins-ic">${icon(i.tone === 'good' ? 'sparkle' : i.tone === 'info' ? 'info' : 'flag', 18)}</span>
            <div><b>${esc(i.title)}</b><p>${esc(i.body)}</p></div>
          </div>`).join('')}</div>` : ''}

      <div class="grid-2">
        <div class="card">
          <div class="card-head"><h3>Last 14 days</h3><span class="muted small">done / planned</span></div>
          <div class="barchart" role="img" aria-label="Tasks done over the last 14 days">
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
          <div class="card-head"><h3>When you skip</h3><span class="muted small">last 8 weeks</span></div>
          <div class="wd-chart">
            ${wd.counts.map((c, i) => `
              <div class="wd-row"><span>${DAY_SHORT[i]}</span><div class="wd-bar"><i style="width:${(c / wdMax) * 100}%"></i></div><b>${c}</b></div>`).join('')}
          </div>
        </div>
      </div>

      <div class="section-head"><h2>Most skipped</h2><span class="muted small">30 days</span></div>
      ${stats.length ? `<div class="card flush"><ul class="stat-list">
        ${stats.map((s) => `
          <li>
            <span class="tile sm">${taskIcon(s.t.icon, 18)}</span>
            <div class="sl-main"><b>${esc(s.t.title)}</b><div class="rate"><i style="width:${(s.rate ?? 0) * 100}%" class="${(s.rate ?? 1) < 0.6 ? 'low' : ''}"></i></div></div>
            <div class="sl-num"><span>${s.rate == null ? '—' : `<i data-count="${Math.round(s.rate * 100)}">${Math.round(s.rate * 100)}</i>%`}</span><small>${s.done} ✓ · <em class="${s.missed ? 'red-t' : ''}">${s.missed} ✕</em></small></div>
          </li>`).join('')}
      </ul></div>` : '<div class="empty"><p>Stats will show up once you start checking off tasks.</p></div>'}
    </section>`;
  $('#export-btn', view).onclick = (e) => exportMenu(e.currentTarget);
}

// ============================================================ tasks (edit list)
function viewTasks(view) {
  const d = userData();
  const active = activeTasks(d);
  const finished = d.tasks.filter((t) => t.finishedAt && !t.archivedAt);
  const archived = d.tasks.filter((t) => t.archivedAt);
  const row = (t, i, arr) => `
    <li class="task editable" data-id="${t.id}">
      <div class="reorder">
        <button class="icon-btn subtle xs" data-up="${t.id}" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>${icon('arrowUp', 15)}</button>
        <button class="icon-btn subtle xs" data-down="${t.id}" aria-label="Move down" ${i === arr.length - 1 ? 'disabled' : ''}>${icon('arrowDown', 15)}</button>
      </div>
      <span class="tile">${taskIcon(t.icon, 22)}</span>
      <div class="task-main" data-edit="${t.id}">
        <span class="task-title">${esc(t.title)}</span>
        <span class="task-sub">${esc(frequencyLabel(t))}${t.goal ? ` · goal ${t.goal.done}/${t.goal.target} ${esc(t.goal.unit || '')}` : ''}</span>
      </div>
      <div class="task-actions">
        ${linkBtn(t)}
        <button class="icon-btn subtle" data-edit="${t.id}" aria-label="Edit ${esc(t.title)}">${icon('edit', 18)}</button>
        <button class="icon-btn subtle" data-menu="${t.id}" aria-haspopup="menu" aria-label="More for ${esc(t.title)}">${icon('more', 20)}</button>
      </div>
    </li>`;
  view.innerHTML = `
    <section class="page">
      <div class="hero-head">
        <div>
          <p class="eyebrow">Tasks</p>
          <h1 class="large-title">Your list.</h1>
          <p class="lead">${pl(active.length, 'active task')}. Add, edit, reorder and attach links.</p>
        </div>
        <div class="row gap">
          <button class="btn ghost" id="presets">${icon('sparkle', 16)} Suggestions</button>
          <button class="btn primary" id="add">${icon('plus', 16)} New task</button>
        </div>
      </div>
      ${quickAddBar('qa-tasks')}
      ${active.length ? `<ul class="list">${active.map(row).join('')}</ul>` : `<div class="empty">${emptyIllustration()}</div>`}
      ${finished.length ? `<div class="section-head"><h2>Goals reached</h2></div><ul class="list done-list">${finished.map(row).join('')}</ul>` : ''}
      ${archived.length ? `<div class="section-head"><h2>Archive</h2></div><ul class="list done-list">${archived.map(row).join('')}</ul>` : ''}
    </section>`;
  $('#add', view).onclick = () => openEditor();
  $('#presets', view).onclick = () => openPresets();
  bindQuickAdd(view, 'qa-tasks');
  const eb = $('#empty-presets', view); if (eb) eb.onclick = () => openPresets();
  $$('[data-edit]', view).forEach((b) => (b.onclick = () => openEditor(b.dataset.edit)));
  $$('[data-up]', view).forEach((b) => (b.onclick = () => moveTask(b.dataset.up, -1)));
  $$('[data-down]', view).forEach((b) => (b.onclick = () => moveTask(b.dataset.down, 1)));
  bindMenus(view);
}

// ============================================================ settings
function viewSettings(view) {
  const d = userData();
  const p = profile();
  const perm = notify.permission();
  const permLabel = { granted: 'On', denied: 'Blocked in browser settings', default: 'Off', unsupported: 'Not supported by this browser' }[perm];
  view.innerHTML = `
    <section class="page narrow">
      <div class="hero-head"><div><p class="eyebrow">Settings</p><h1 class="large-title">${esc(p.name)}</h1><p class="lead">@${esc(p.id)} · account stored in this browser</p></div></div>

      <h2 class="group-title">Notifications</h2>
      <div class="card group">
        <div class="g-row"><div><b>System notifications</b><small>${permLabel}</small></div>
          ${perm === 'granted' ? `<button class="btn ghost small" id="test">Test</button>` : perm === 'unsupported' ? '' : `<button class="btn primary small" id="perm">Turn on notifications</button>`}</div>
        <div class="g-row"><div><b>Evening reminder</b><small>When Check It is open and something is left</small></div>
          <button class="picker-btn" id="rt" aria-haspopup="dialog" aria-expanded="false">${icon('bell', 16)}<b>${esc(d.settings.reminderTime || '20:00')}</b>${icon('chevR', 14, 'pk-chev')}</button></div>
        <div class="g-row col"><div><b>Remind me as soon as the browser starts</b>
          <small>A website can’t launch itself, but one of these makes Check It open with your browser and tell you right away what’s left:</small></div>
          <ol class="howto">
            <li><b>Chrome / Edge:</b> Settings → On startup → Open a specific page → paste <code>${esc(location.origin + location.pathname)}</code></li>
            <li><b>Install it as an app</b> (icon in the address bar) and turn on “Start app when you sign in”.</li>
            <li><b>Safari:</b> Settings → General → Homepage.</li>
          </ol>
          <button class="btn ghost small" id="install" hidden>Install app</button>
        </div>
      </div>

      <h2 class="group-title">Appearance</h2>
      <div class="card group" id="prefs-group">
        <div class="g-row"><div><b>Theme</b><small>Light, dark or follow your system</small></div>${themeSeg(getPrefs().theme)}</div>
        <label class="g-row"><div><b>Animations</b><small>Fade-ins, rings and the intro</small></div><input type="checkbox" class="switch" data-motion ${getPrefs().motion ? 'checked' : ''}></label>
      </div>

      <h2 class="group-title">Data</h2>
      <div class="card group">
        <div class="g-row"><div><b>Storage</b><small>localStorage + IndexedDB. Gone only if you clear this site’s data (cookies).</small></div><span class="pill" id="persist">…</span></div>
        <div class="g-row"><div><b>Backup</b><small>Download your data to a file or restore it.</small></div>
          <div class="row gap"><button class="btn ghost small" id="exp" aria-haspopup="menu">Export</button><label class="btn ghost small">Import<input type="file" id="imp" accept="application/json" hidden></label></div></div>
        <div class="g-row"><div><b>Intro animation</b><small>Watch the tour again.</small></div><button class="btn ghost small" id="intro">${icon('play', 14)} Play</button></div>
      </div>

      <h2 class="group-title">Account</h2>
      <div class="card group">
        <button class="g-row link" id="logout"><b>Log out</b>${icon('logout', 18)}</button>
        <button class="g-row link danger" id="del"><b>Delete this account</b>${icon('trash', 18)}</button>
        <button class="g-row link danger" data-clear><b>Clear all my data</b>${icon('trash', 18)}</button>
      </div>
      <p class="muted small center">Check It is open source · <a href="${REPO_URL}" target="_blank" rel="noopener noreferrer">GitHub repository</a><br>Your data never leaves this browser.</p>
    </section>`;

  const permBtn = $('#perm', view);
  if (permBtn) permBtn.onclick = async () => { await turnOnNotifications(); view.classList.remove('enter'); viewSettings(view); };
  bindPrefControls(view);
  const test = $('#test', view);
  if (test) test.onclick = async () => { const ok = await notify.testNotification(); if (!ok) toast('Couldn’t show a notification'); };
  $('#rt', view).onclick = (e) => timePicker(e.currentTarget, d.settings.reminderTime || '20:00', (v) => {
    update((x) => { x.settings.reminderTime = v; x.lastNotified = null; });
    $('#rt b', view).textContent = v;
    toast(`Reminder set for ${v}`);
  });
  $('#exp', view).onclick = (e) => exportMenu(e.currentTarget);
  $('#imp', view).onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { importJSON(await f.text()); toast('Data restored'); viewSettings(view); } catch (err) { toast(err.message, { tone: 'bad' }); }
  };
  $('#intro', view).onclick = () => playIntro({ name: p.name });
  $('#logout', view).onclick = () => { logout(); location.hash = '#/'; location.reload(); };
  $('#del', view).onclick = async () => {
    if (!(await confirmSheet('Delete account?', 'All tasks, history and stats will be deleted. This can’t be undone.', 'Delete account'))) return;
    const s = getState(); delete s.data[s.session]; delete s.users[s.session]; s.session = null; save(); location.hash = '#/'; location.reload();
  };
  (async () => {
    let txt = 'Persistent';
    try { txt = navigator.storage && (await navigator.storage.persisted()) ? 'Persistent' : 'Standard'; } catch {}
    const el = $('#persist', view); if (el) el.textContent = txt;
  })();
  const inst = $('#install', view);
  if (inst && window.__installPrompt) { inst.hidden = false; inst.onclick = () => window.__installPrompt.prompt(); }
}

// ============================================================ editor
export function openEditor(taskId, { focus = null, title = '' } = {}) {
  const d = userData();
  const existing = taskId ? d.tasks.find((t) => t.id === taskId) : null;
  const t = existing ? JSON.parse(JSON.stringify(existing)) : makeTask({ title, perWeek: 7 });
  let mode = isFixed(t) ? 'days' : 'count';
  let iconTab = t.icon.kind === 'svgl' ? 'svgl' : 'glyph';

  const s = sheet(`
    <form class="editor" novalidate>
      <div class="sheet-header">
        <button type="button" class="btn text" data-close>Cancel</button>
        <h3>${existing ? 'Edit task' : 'New task'}</h3>
        <button type="submit" class="btn text strong">Save</button>
      </div>
      <div class="sheet-body">
        <div class="ed-top">
          <span class="tile xl" id="ed-preview">${taskIcon(t.icon, 30)}</span>
          <label class="field grow"><span>Name</span><input id="ed-title" maxlength="80" placeholder="e.g. Put on retainer for the night" value="${esc(t.title)}" required></label>
        </div>

        <div class="field"><span>Link</span>
          <div class="link-input"><span>${icon('link', 18)}</span><input id="ed-link" type="url" inputmode="url" placeholder="https://… e.g. your Pinterest profile" value="${esc(t.link || '')}" autocomplete="off" spellcheck="false"></div>
          <input id="ed-link-label" maxlength="30" placeholder="Button label (optional), e.g. Pinterest" value="${esc(t.linkLabel || '')}">
          <small class="hint">Shows a link button on the right of the task, opens in a new tab.</small>
        </div>

        <div class="field"><span>Icon</span>
          <div class="seg" role="tablist"><button type="button" data-itab="glyph">Symbols</button><button type="button" data-itab="svgl">Logos (SVGL)</button></div>
          <div id="icon-panel"></div>
        </div>

        <div class="field"><span>How often</span>
          <div class="seg"><button type="button" data-mode="count">Times per week</button><button type="button" data-mode="days">Specific days</button></div>
          <div id="freq-panel"></div>
        </div>

        <div class="field"><span>Times per day</span>
          <div class="stepper" id="tpd"><button type="button" data-d="-1" aria-label="Fewer">−</button><b>${perDay(t)}</b><button type="button" data-d="1" aria-label="More">+</button></div>
          <small class="hint">E.g. brushing teeth morning and evening = 2.</small>
        </div>

        <div class="field">
          <label class="switch-row"><span><b>Goal that ends the task</b><small>E.g. upload pins until there are 200.</small></span>
            <input type="checkbox" id="goal-on" class="switch" ${t.goal ? 'checked' : ''}></label>
          <div id="goal-panel" class="goal-grid" ${t.goal ? '' : 'hidden'}>
            <label class="field"><span>Target</span><input type="number" min="1" id="g-target" value="${t.goal?.target ?? 100}"></label>
            <label class="field"><span>Unit</span><input id="g-unit" value="${esc(t.goal?.unit ?? 'pins')}" maxlength="20"></label>
            <label class="field"><span>Per completion</span><input type="number" min="1" id="g-step" value="${t.goal?.step ?? 1}"></label>
            <label class="field"><span>Already done</span><input type="number" min="0" id="g-done" value="${t.goal?.done ?? 0}"></label>
          </div>
        </div>

        <label class="field"><span>Note</span><textarea id="ed-note" rows="2" maxlength="300" placeholder="Optional">${esc(t.note || '')}</textarea></label>

        ${existing ? `<div class="row gap ed-actions">
          <button type="button" class="btn ghost grow" id="ed-archive">${icon('archive', 16)} ${existing.archivedAt ? 'Restore' : 'Archive'}</button>
          <button type="button" class="btn danger-ghost grow" id="ed-del">${icon('trash', 16)} Delete</button></div>` : ''}
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
        <div class="search"><span>${icon('search', 18)}</span><input id="svgl-q" placeholder="Search logos: pinterest, youtube, discord…" autocomplete="off"></div>
        <div class="icon-grid logos" id="svgl-res"><p class="muted small">Logos from <a href="https://svgl.app" target="_blank" rel="noopener">svgl.app</a>.</p></div>`;
      const q = $('#svgl-q', panel);
      const res = $('#svgl-res', panel);
      let timer;
      const run = async () => {
        const v = q.value.trim();
        if (!v) return;
        res.innerHTML = '<p class="muted small">Searching…</p>';
        try {
          const items = await searchSvgl(v);
          res.innerHTML = items.length ? items.map((i) => `<button type="button" class="ig logo ${t.icon.value === i.src ? 'on' : ''}" data-src="${esc(i.src)}" title="${esc(i.title)}"><img src="${esc(i.src)}" alt="${esc(i.title)}" loading="lazy"></button>`).join('')
            : '<p class="muted small">Nothing found.</p>';
          $$('[data-src]', res).forEach((b) => (b.onclick = () => { t.icon = { kind: 'svgl', value: b.dataset.src }; preview(); $$('.ig', res).forEach((x) => x.classList.toggle('on', x === b)); }));
        } catch {
          const slug = v.toLowerCase().replace(/[^a-z0-9-]/g, '');
          res.innerHTML = `<p class="muted small">SVGL search is unavailable right now. Trying <code>${esc(slug)}.svg</code> directly:</p>
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
        <small class="hint">${t.perWeek >= 7 ? 'Every day.' : `${t.perWeek}× a week — you pick the days. When you can’t make it otherwise, Check It tells you it’s due today.`}</small>`;
      $$('[data-n]', panel).forEach((b) => (b.onclick = () => { t.perWeek = +b.dataset.n; renderFreq(); }));
    } else {
      const days = t.days || [];
      panel.innerHTML = `
        <div class="freq-pick days">${DAY_SHORT.map((x, i) => `<button type="button" class="fp ${days.includes(i) ? 'on' : ''}" data-day="${i}" aria-label="${DAY_NAMES[i]}">${x}</button>`).join('')}</div>
        <small class="hint">${days.length ? `${days.length}× a week, always on the selected days.` : 'Pick at least one day.'}</small>`;
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
  if (focus === 'link') setTimeout(() => $('#ed-link', el).focus(), 120);

  $('form', el).onsubmit = (e) => {
    e.preventDefault();
    const titleEl = $('#ed-title', el);
    const name = titleEl.value.trim();
    if (!name) { titleEl.focus(); titleEl.classList.add('shake'); setTimeout(() => titleEl.classList.remove('shake'), 400); return; }
    if (mode === 'days' && !(t.days && t.days.length)) { toast('Pick at least one day'); return; }
    const rawLink = $('#ed-link', el).value;
    const link = normalizeUrl(rawLink);
    if (rawLink.trim() && !link) { const li = $('#ed-link', el); li.focus(); li.closest('.link-input').classList.add('shake'); setTimeout(() => li.closest('.link-input').classList.remove('shake'), 400); toast('That link doesn’t look right'); return; }
    t.title = name;
    t.link = link;
    t.linkLabel = $('#ed-link-label', el).value.trim();
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
    toast(existing ? 'Task updated' : 'Task added');
    notify.syncBadge();
    rerender();
  };

  const del = $('#ed-del', el);
  if (del) del.onclick = () => { s.close(); deleteTask(t.id); };
  const arch = $('#ed-archive', el);
  if (arch) arch.onclick = () => { s.close(); archiveTask(t.id); };
}

// ============================================================ presets sheet
export function openPresets({ first = false } = {}) {
  const d = userData();
  const have = new Set(d.tasks.map((t) => t.title));
  const chosen = new Set(first ? PRESETS.slice(0, 5).map((_, i) => i) : []);
  const s = sheet(`
    <div class="sheet-header">
      <button type="button" class="btn text" data-close>${first ? 'Skip' : 'Cancel'}</button>
      <h3>${first ? 'Start with these' : 'Suggestions'}</h3>
      <button type="button" class="btn text strong" id="pr-add">Add</button>
    </div>
    <div class="sheet-body">
      <p class="muted">${first ? 'A few things to get you going. You can change frequency and add links later.' : 'Pick what you want to add.'}</p>
      <ul class="list selectable">
        ${PRESETS.map((p, i) => `
          <li class="task ${have.has(p.title) ? 'disabled' : ''}">
            <button type="button" class="check ${chosen.has(i) ? 'sel' : ''}" data-i="${i}" ${have.has(p.title) ? 'disabled' : ''} aria-pressed="${chosen.has(i)}" aria-label="${esc(p.title)}"><svg viewBox="0 0 24 24" class="tick"><path d="M6 12.5l4 4L18 8"/></svg></button>
            <span class="tile">${taskIcon(p.icon, 22)}</span>
            <div class="task-main" data-i="${i}"><span class="task-title">${esc(p.title)}</span><span class="task-sub">${esc(frequencyLabel(p))}${p.goal ? ` · goal ${p.goal.target} ${p.goal.unit}` : ''}${have.has(p.title) ? ' · already added' : ''}</span></div>
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
    if (chosen.size) toast(`Added ${pl(chosen.size, 'task')}`);
    notify.syncBadge();
    rerender();
  };
}
