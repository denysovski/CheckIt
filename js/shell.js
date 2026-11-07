// App shell: sidebar, mobile drawer, Home dashboard and the "write anything" composer.
import { icon, taskIcon, logoMark } from './icons.js';
import { esc, $, $$, popover, closePopover, ring, toast, countUp, stagger } from './ui.js';
import { userData, update, getPrefs, setPrefs } from './store.js';
import { profile } from './auth.js';
import { register, render, current, go, onRender, rerender } from './router.js';
import {
  todayKey, weekStart, todayBuckets, daySummary, taskStats, streak, insights, dailySeries, prettyDate, parseKey, DAY_SHORT, weekday, frequencyLabel,
} from './schedule.js';
import { taskRow, bindRows, openEditor, showAccountMenu, toggleTask } from './views.js';
import { sortedNotes, createNote, fmtDate } from './notes.js';
import { messagesOf, postMessage, newChannel } from './channels.js';
import { openPalette } from './palette.js';
import { recapBadge, ensureRecaps, showNewRecap, weekStats } from './recaps.js';
import { journalPanelHTML, paintPanelWeather } from './journal.js';
import { visibleNudges, nudgeStackHTML, bindNudges } from './nudges.js';
import * as notify from './notify.js';

const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

// ---------------------------------------------------------------- sidebar
function sidebarHTML() {
  const p = profile();
  const d = userData();
  const pending = notify.syncBadge();
  const notes = sortedNotes(d).slice(0, 6);
  const nav = [
    ['home', 'Home', 'home'], ['today', 'Today', 'today', pending], ['tasks', 'Tasks', 'list'], ['calendar', 'Calendar', 'calendar'], ['planner', 'Planner', 'clock'],
    ['stats', 'Stats', 'chart'], ['journal', 'Journal', 'pen'], ['notes', 'Notes', 'book'], ['recaps', 'Recaps', 'archive', recapBadge()],
  ];
  const initial = (name) => esc((name || '?').replace(/[^a-z0-9]/gi, '').slice(0, 1).toUpperCase() || '#');
  return `
    <div class="sb-top">
      <a class="brand" href="#/home" aria-label="Check It home"><span class="brand-mark">${logoMark('plain')}</span><span class="brand-word sb-label">Check<b>It</b></span></a>
      <div class="sb-top-actions">
        <button class="icon-btn subtle sb-label" id="sb-new" aria-label="Create" aria-haspopup="menu" title="Create">${icon('compose', 19)}</button>
      </div>
    </div>
    <button class="sb-search" id="sb-search" title="Search"><span>${icon('search', 17)}</span><span class="grow sb-label">Search</span><kbd class="sb-label sb-kbd">${isMac ? '⌘' : 'Ctrl'} + K</kbd></button>
    <div class="sb-mid">
    <nav class="sb-nav" aria-label="Main">
      ${nav.map(([r, l, ic, badge]) => `<a href="#/${r}" data-nav="${r}" title="${l}">${icon(ic, 18)}<span class="grow sb-label">${l}</span>${badge ? `<span class="sb-badge">${badge}</span>` : ''}</a>`).join('')}
    </nav>
    <div class="sb-section">
      <div class="sb-head"><span class="sb-label">Channels</span><button class="icon-btn subtle xs2" id="sb-add-ch" aria-label="New channel" title="New channel">${icon('plus', 16)}</button></div>
      ${d.channels.map((c) => { const n = messagesOf(c.id, d).length; return `<a href="#/channel/${c.id}" data-nav="channel:${c.id}" title="#${esc(c.name)}"><span class="sb-hash">#<em class="sb-initial">${initial(c.name)}</em></span><span class="grow ellipsis sb-label">${esc(c.name)}</span>${n ? `<span class="sb-count sb-label">${n}</span>` : ''}</a>`; }).join('')}
    </div>
    <div class="sb-section">
      <div class="sb-head"><span class="sb-label">Notes</span><button class="icon-btn subtle xs2" id="sb-add-note" aria-label="New note" title="New note">${icon('plus', 16)}</button></div>
      ${notes.length ? notes.map((n) => `<a href="#/note/${n.id}" data-nav="note:${n.id}" title="${esc(n.title || 'Untitled')}">${icon('doc', 16)}<span class="grow ellipsis sb-label">${esc(n.title || 'Untitled')}</span>${n.pinned ? `<span class="sb-pin sb-label">${icon('thumbtack', 13)}</span>` : ''}</a>`).join('') : '<p class="sb-empty sb-label">No notes yet</p>'}
    </div>
    </div>
    <div class="sb-bottom">
    <a class="sb-leave" href="#/welcome" title="Leave dashboard">${icon('logout', 17)}<span class="sb-label">Leave dashboard</span></a>
    <button class="sb-user" id="account-btn" aria-label="Account and settings" aria-haspopup="menu" aria-expanded="false" title="Account and settings">
      <span class="avatar static sm">${esc((d.profile?.displayName || p.name || '?').slice(0, 1).toUpperCase())}<i class="online"></i></span>
      <span class="grow sb-label sb-user-txt"><b class="ellipsis">${esc(d.profile?.displayName || p.name)}</b><small>Settings &amp; account</small></span>
      <span class="sb-user-gear sb-label">${icon('gear', 18)}</span>
    </button>
    </div>`;
}

export function applySidebarState() {
  const collapsed = !!getPrefs().sidebarCollapsed;
  document.documentElement.classList.toggle('sb-collapsed', collapsed);
  const b = $('#sb-toggle');
  if (b) { b.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar'); b.title = collapsed ? 'Expand sidebar' : 'Collapse sidebar'; b.setAttribute('aria-expanded', String(!collapsed)); }
}

function bindSidebar(sb) {
  $('#sb-search', sb).onclick = () => { closeDrawer(); openPalette(); };
  $('#account-btn', sb).onclick = (e) => showAccountMenu(e.currentTarget);
  $('#sb-add-ch', sb).onclick = () => { closeDrawer(); newChannel(); };
  $('#sb-add-note', sb).onclick = () => { closeDrawer(); const n = createNote(); go('note', n.id); };
  $('#sb-new', sb).onclick = (e) => createMenu(e.currentTarget);
  applySidebarState();
  $$('a', sb).forEach((a) => a.addEventListener('click', closeDrawer));
  markActive();
}

export function refreshSidebar() {
  const sb = $('.sidebar');
  if (!sb) return;
  const mid = $('.sb-mid', sb); const scroll = mid ? mid.scrollTop : 0;
  sb.innerHTML = sidebarHTML();
  bindSidebar(sb);
  const mid2 = $('.sb-mid', sb); if (mid2) mid2.scrollTop = scroll;
}

function markActive() {
  const r = current();
  const key = r.param ? `${r.name}:${r.param}` : r.name;
  $$('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === key || (r.name === 'note' && a.dataset.nav === 'notes' && !$(`[data-nav="note:${r.param}"]`))));
  $$('.tabbar [data-tab]').forEach((a) => a.classList.toggle('active', a.dataset.tab === r.name));
}

function createMenu(anchor) {
  const el = popover(anchor, `<div class="menu">
    <div class="menu-label">Create</div>
    <button data-c="task"><span>New task</span>${icon('check', 18)}</button>
    <button data-c="note"><span>New note</span>${icon('doc', 18)}</button>
    <button data-c="channel"><span>New channel</span>${icon('hash', 18)}</button></div>`, { align: 'end' });
  if (!el) return;
  el.onclick = (e) => {
    const b = e.target.closest('[data-c]'); if (!b) return;
    closePopover(); closeDrawer();
    if (b.dataset.c === 'task') openEditor();
    if (b.dataset.c === 'note') { const n = createNote(); go('note', n.id); }
    if (b.dataset.c === 'channel') newChannel();
  };
}

// mobile drawer
function openDrawer() { document.body.classList.add('drawer-open'); }
function closeDrawer() { document.body.classList.remove('drawer-open'); }

export function mountShell() {
  const app = $('#app');
  app.innerHTML = `
    <div class="shell">
      <header class="m-bar">
        <button class="icon-btn subtle" id="m-menu" aria-label="Open menu">${icon('menu', 22)}</button>
        <a class="brand" href="#/home"><span class="brand-mark">${logoMark('plain')}</span><span class="brand-word">Check<b>It</b></span></a>
        <button class="icon-btn subtle" id="m-search" aria-label="Search">${icon('search', 20)}</button>
      </header>
      <aside class="sidebar" aria-label="Sidebar"></aside>
      <button class="sb-toggle" id="sb-toggle" aria-label="Collapse sidebar" title="Collapse sidebar">${icon('chevL', 15)}</button>
      <div class="drawer-backdrop" id="drawer-bd"></div>
      <main id="view" tabindex="-1"></main>
      <nav class="tabbar" aria-label="Navigation">
        ${[['home', 'Home', 'home'], ['today', 'Today', 'today'], ['journal', 'Journal', 'pen'], ['calendar', 'Calendar', 'calendar']].map(([r, l, ic]) => `<a href="#/${r}" data-tab="${r}">${icon(ic, 22)}<span>${l}</span></a>`).join('')}
        <button id="m-more" data-tab="more">${icon('sidebar', 22)}<span>More</span></button>
      </nav>
    </div>`;
  refreshSidebar();
  $('#sb-toggle', app).onclick = () => { setPrefs({ sidebarCollapsed: !getPrefs().sidebarCollapsed }); applySidebarState(); };
  applySidebarState();
  $('#m-menu', app).onclick = openDrawer;
  $('#m-more', app).onclick = openDrawer;
  $('#drawer-bd', app).onclick = closeDrawer;
  $('#m-search', app).onclick = () => openPalette();
}

export function renderRoute() {
  const view = $('#view');
  if (!view) return;
  render(view, { enter: true });
  window.scrollTo({ top: 0 });
  view.scrollTop = 0;
}

onRender((r, enter) => {
  markActive();
  const view = $('#view');
  if (enter) { stagger(view); countUp(view); }
  if (!['note', 'notes', 'channel'].includes(r.name)) refreshSidebarCounts();
});

function refreshSidebarCounts() {
  const n = notify.syncBadge();
  const a = $('.sb-nav [data-nav="today"]');
  if (!a) return;
  let b = $('.sb-badge', a);
  if (n && !b) { b = document.createElement('span'); b.className = 'sb-badge'; a.appendChild(b); }
  if (b) { if (n) b.textContent = n; else b.remove(); }
}


// ---------------------------------------------------------------- home
let composerTarget = { kind: 'task' };

function viewHome(view) {
  const d = userData();
  const p = profile();
  const k = todayKey();
  const sum = daySummary(d, k);
  const b = todayBuckets(d, k);
  const left = b.required.length;
  const st = streak(d);
  const w = taskStats(d, 7);
  const wd = w.reduce((a, s) => a + s.done, 0); const wm = w.reduce((a, s) => a + s.missed, 0);
  const weekPct = wd + wm ? Math.round((wd / (wd + wm)) * 100) : 0;
  const hour = new Date().getHours();
  // keep the user's own order so a ticked task stays exactly where it was
  const order = new Map(d.tasks.map((t, i) => [t.id, i]));
  const list = [...b.required, ...b.flexible, ...b.done].sort((x, y) => order.get(x.t.id) - order.get(y.t.id)).slice(0, 7);
  const wk = weekStats(d, weekStart(k), k);
  const notes = sortedNotes(d).slice(0, 4);
  const chans = d.channels.map((c) => ({ c, msgs: messagesOf(c.id, d) })).sort((a, z) => ((z.msgs.at(-1)?.ts || z.c.createdAt) - (a.msgs.at(-1)?.ts || a.c.createdAt))).slice(0, 4);
  const series = dailySeries(d, 7);
  const date = parseKey(k).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  view.innerHTML = `
    <section class="page home">
      <div class="home-hero">
        <div>
          <p class="eyebrow date">${esc(date)}</p>
          <h1 class="home-title"><span>Welcome back<span class="hn">.</span></span></h1>
        </div>
      </div>

      <div class="tiles">
        <a class="tile-card t-orange" href="#/today"><div class="tc-top">${icon('flag', 20)}<span>Due today</span></div><b class="num" data-count="${left}">${left}</b><small>${left ? 'Left for today' : 'All clear for today'}</small></a>
        <a class="tile-card t-green" href="#/today"><div class="tc-top">${icon('check', 20)}<span>Done today</span></div><b class="num" data-count="${sum.done}">${sum.done}</b><small>of ${sum.total} planned</small></a>
        <a class="tile-card t-red" href="#/stats"><div class="tc-top">${icon('flame', 20)}<span>Streak</span></div><b class="num" data-count="${st}">${st}</b><small>${st === 1 ? 'Day' : 'Days'} in a row</small></a>
        <a class="tile-card t-blue" href="#/stats"><div class="tc-top">${icon('chart', 20)}<span>This week</span></div><b class="num"><span data-count="${weekPct}">${weekPct}</span><i>%</i></b><small>Success in the last 7 days</small></a>
      </div>

      <div class="home-grid">
        <div class="home-col">
        <section class="panel p-blue">
          <header class="panel-head"><h2>${icon('today', 18)} Today <span class="count">${sum.total}</span></h2><a href="#/today" class="view-all">View all ${icon('chevR', 13)}</a></header>
          ${list.length ? `<ul class="list compact panel-list">${list.map(({ t, s }) => taskRow(t, k, s, { compact: true })).join('')}</ul>`
            : `<div class="panel-empty"><p>Nothing planned yet.</p><button class="btn ghost small" id="h-add-task">${icon('plus', 14)} Add a task</button></div>`}
        </section>
        <section class="panel p-yellow">
          <header class="panel-head"><h2>${icon('doc', 18)} Notes <span class="count">${d.notes.length}</span></h2><a href="#/notes" class="view-all">View all ${icon('chevR', 13)}</a></header>
          <div class="panel-rows">
            ${notes.map((n) => `<a class="prow" href="#/note/${n.id}">
              <span class="prow-ic">${icon('doc', 17)}</span>
              <span class="prow-main"><b>${esc(n.title || 'Untitled')} ${n.tag ? `<em class="chip small">${esc(n.tag)}</em>` : ''}</b></span>
              <span class="date-pill">${fmtDate(n.updatedAt)}</span></a>`).join('') || '<div class="panel-empty"><p>No notes yet.</p></div>'}
            <button class="prow add" id="h-new-note"><span class="prow-ic">${icon('plus', 17)}</span><span class="prow-main"><b>New note</b></span></button>
          </div>
        </section>
        </div>
        <div class="home-col">
${journalPanelHTML(d)}
        <section class="panel p-coral">
          <header class="panel-head"><h2>${icon('hash', 18)} Channels <span class="count">${d.channels.length}</span></h2><button class="view-all" id="h-new-ch">${icon('plus', 13)} New</button></header>
          <div class="panel-rows">
            ${chans.map(({ c, msgs }) => `<a class="prow" href="#/channel/${c.id}">
              <span class="prow-ic">#</span>
              <span class="prow-main"><b>${esc(c.name)}</b><small>${msgs.length ? esc(msgs.at(-1).text.slice(0, 60)) : 'No messages yet'}</small></span>
              ${msgs.length ? `<span class="count">${msgs.length}</span>` : ''}</a>`).join('') || '<div class="panel-empty"><p>No channels yet.</p></div>'}
          </div>
        </section>
        <section class="panel p-week" id="p-week">
          <header class="panel-head"><h2>${icon('chart', 18)} Your week</h2><a href="#/stats" class="view-all">${icon('chart', 13)} Stats</a></header>
          <div class="wk-kpis">
            <div class="wk-k big"><small>Done this week</small><b><span data-count="${wk.done}">${wk.done}</span><i>/${wk.planned}</i></b><div class="wk-bar"><i style="width:${wk.planned ? (wk.done / wk.planned) * 100 : 0}%"></i></div></div>
            <div class="wk-k"><small>Earliest finish</small><b>${wk.earliest ? wk.earliest.time : '–'}</b><span>${wk.earliest ? `${esc(wk.earliest.day)} · ${esc(wk.earliest.title)}` : 'Nothing done yet'}</span></div>
            <div class="wk-k"><small>Usually done by</small><b>${wk.avgTime || '–'}</b><span>${wk.beforeNoon} before noon</span></div>
            <div class="wk-k"><small>Best day</small><b>${wk.best ? wk.best.day.slice(0, 3) : '–'}</b><span>${wk.best ? `${wk.best.done} of ${wk.best.total} done` : 'Still early'}</span></div>
          </div>
          <div class="week-bars">${series.map((s) => `<div class="wb"><div class="wb-track"><i style="height:${s.ratio == null ? 0 : Math.max(6, s.ratio * 100)}%" class="${s.ratio != null && s.ratio < 1 && s.k < k ? 'part' : ''}"></i></div><span>${DAY_SHORT[weekday(s.k)].slice(0, 2)}</span></div>`).join('')}</div>
        </section>
        </div>
      </div>
      <div class="composer-spacer"></div>
    </section>
    ${composerHTML()}`;

  bindRows($('.p-blue', view), k, () => rerender());
  bindNudges(view, () => rerender());
  paintPanelWeather(view);
  const at = $('#h-add-task', view); if (at) at.onclick = () => openEditor();
  $('#h-new-ch', view).onclick = () => newChannel();
  $('#h-new-note', view).onclick = () => { const n = createNote(); go('note', n.id); };
  bindComposer(view);
  bindSpot($('#p-week', view));
}

// Pointer-following light on the gradient card.
function bindSpot(el) {
  if (!el || !matchMedia('(hover: hover)').matches) return;
  el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); el.style.setProperty('--sx', `${e.clientX - r.left}px`); el.style.setProperty('--sy', `${e.clientY - r.top}px`); });
}

// ---------------------------------------------------------------- composer
function targetLabel(t) {
  if (t.kind === 'task') return [icon('check', 16), 'Task'];
  if (t.kind === 'note') return [icon('doc', 16), 'Note'];
  const c = userData().channels.find((x) => x.id === t.id);
  return [icon('hash', 16), c ? c.name : 'Channel'];
}

const PLACEHOLDER = { task: 'Add a task for today…', note: 'Jot down a note…', channel: 'Message #' };

function composerHTML() {
  const d = userData();
  if (composerTarget.kind === 'channel' && !d.channels.some((c) => c.id === composerTarget.id)) composerTarget = { kind: 'task' };
  const [ic, label] = targetLabel(composerTarget);
  const quickOn = (q) => (q === 'ch' ? composerTarget.kind === 'channel' && d.channels[0] && composerTarget.id === d.channels[0].id : composerTarget.kind === q);
  return `
    <form class="composer floating" id="composer">
      <div class="cp-chips" role="tablist" aria-label="What to write">
        <span class="cp-pill" aria-hidden="true"></span>
        <button type="button" role="tab" class="chip ${quickOn('task') ? 'on' : ''}" aria-selected="${quickOn('task')}" data-quick="task">Add task</button>
        <button type="button" role="tab" class="chip ${quickOn('note') ? 'on' : ''}" aria-selected="${quickOn('note')}" data-quick="note">Jot a note</button>
        ${d.channels[0] ? `<button type="button" role="tab" class="chip ${quickOn('ch') ? 'on' : ''}" aria-selected="${quickOn('ch')}" data-quick="ch">Log to #${esc(d.channels[0].name)}</button>` : ''}
      </div>
      <div class="cp-field"><textarea id="cp-input" rows="1" placeholder="${esc(composerTarget.kind === 'channel' ? PLACEHOLDER.channel + label : PLACEHOLDER[composerTarget.kind])}" aria-label="Write anything"></textarea></div>
      <div class="composer-row">
        <button type="button" class="cp-target" id="cp-target" aria-haspopup="menu" aria-expanded="false"><span class="cp-t">${ic}<span>${esc(label)}</span></span>${icon('chevR', 13, 'pk-chev')}</button>
        <button class="send-btn" aria-label="Send">${icon('send', 18)}</button>
      </div>
    </form>`;
}

function bindComposer(view) {
  const f = $('#composer', view);
  if (!f) return;
  const ta = $('#cp-input', f);
  const pill = $('.cp-pill', f);
  const movePill = (instant) => {
    const on = $('.chip.on', f);
    if (!on) { pill.style.opacity = '0'; return; }
    if (instant) pill.style.transition = 'none';
    pill.style.opacity = '1';
    pill.style.width = `${on.offsetWidth}px`;
    pill.style.transform = `translateX(${on.offsetLeft}px)`;
    if (instant) { void pill.offsetWidth; pill.style.transition = ''; }
  };
  requestAnimationFrame(() => movePill(true));
  ta.oninput = () => { ta.style.height = 'auto'; ta.style.height = `${Math.min(160, ta.scrollHeight)}px`; };
  ta.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); f.requestSubmit(); } };
  // Switch target in place: slide the pill, cross-fade placeholder + label.
  const setTarget = (t) => {
    composerTarget = t;
    const d = userData();
    $$('[data-quick]', f).forEach((b) => {
      const q = b.dataset.quick;
      const on = q === 'ch' ? t.kind === 'channel' && t.id === d.channels[0]?.id : t.kind === q;
      b.classList.toggle('on', on); b.setAttribute('aria-selected', on);
    });
    movePill(false);
    const [ic, label] = targetLabel(t);
    const field = $('.cp-field', f); const tgt = $('.cp-t', f);
    field.classList.add('swap'); tgt.classList.add('swap');
    setTimeout(() => {
      ta.placeholder = t.kind === 'channel' ? PLACEHOLDER.channel + label : PLACEHOLDER[t.kind];
      tgt.innerHTML = `${ic}<span>${esc(label)}</span>`;
      field.classList.remove('swap'); tgt.classList.remove('swap');
    }, 110);
    ta.focus();
  };
  $$('[data-quick]', f).forEach((b) => (b.onclick = () => {
    const q = b.dataset.quick;
    setTarget(q === 'ch' ? { kind: 'channel', id: userData().channels[0].id } : { kind: q });
  }));
  $('#cp-target', f).onclick = (e) => {
    const d = userData();
    const el = popover(e.currentTarget, `<div class="menu">
      <div class="menu-label">Send to</div>
      <button data-t="task"><span>Task for today</span>${icon('check', 17)}</button>
      <button data-t="note"><span>New note</span>${icon('doc', 17)}</button>
      ${d.channels.length ? '<div class="menu-sep"></div>' : ''}
      ${d.channels.map((c) => `<button data-t="channel" data-id="${c.id}"><span>#${esc(c.name)}</span>${icon('hash', 17)}</button>`).join('')}
    </div>`, { align: 'start' });
    if (!el) return;
    el.onclick = (ev) => { const b = ev.target.closest('[data-t]'); if (!b) return; closePopover(); setTarget(b.dataset.t === 'channel' ? { kind: 'channel', id: b.dataset.id } : { kind: b.dataset.t }); };
  };
  f.onsubmit = (e) => {
    e.preventDefault();
    const text = ta.value.trim();
    if (!text) { ta.focus(); return; }
    if (composerTarget.kind === 'task') {
      const first = text.split('\n')[0].slice(0, 80);
      update((d) => d.tasks.push({ id: Math.random().toString(36).slice(2, 10), title: first, note: '', icon: { kind: 'glyph', value: 'star' }, perWeek: 7, days: null, timesPerDay: 1, link: '', linkLabel: '', goal: null, createdAt: todayKey(), archivedAt: null, finishedAt: null }));
      toast('Task added for today');
    } else if (composerTarget.kind === 'note') {
      const [title, ...rest] = text.split('\n');
      createNote({ title: title.slice(0, 120), body: rest.join('\n') });
      toast('Note saved', { action: 'Open', onAction: () => go('note', sortedNotes()[0].id) });
    } else {
      postMessage(composerTarget.id, text);
      const c = userData().channels.find((x) => x.id === composerTarget.id);
      toast(`Posted to #${c.name}`, { action: 'Open', onAction: () => go('channel', c.id) });
    }
    refreshSidebar();
    rerender();
    const n = $('#cp-input'); n && n.focus();
  };
}

register('home', (v) => viewHome(v));
export { toggleTask, frequencyLabel, taskIcon, ring, prettyDate };
