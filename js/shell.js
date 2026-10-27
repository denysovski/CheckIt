// App shell: sidebar, mobile drawer, Home dashboard and the "write anything" composer.
import { icon, taskIcon, logoMark } from './icons.js';
import { esc, $, $$, popover, closePopover, ring, toast, countUp, stagger } from './ui.js';
import { userData, update } from './store.js';
import { profile } from './auth.js';
import { register, render, current, go, onRender, rerender } from './router.js';
import {
  todayKey, todayBuckets, daySummary, taskStats, streak, insights, dailySeries, prettyDate, parseKey, DAY_SHORT, weekday, frequencyLabel,
} from './schedule.js';
import { taskRow, bindRows, openEditor, showAccountMenu, toggleTask } from './views.js';
import { sortedNotes, createNote, fmtDate } from './notes.js';
import { messagesOf, postMessage, newChannel } from './channels.js';
import { openPalette } from './palette.js';
import * as notify from './notify.js';

const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

// ---------------------------------------------------------------- sidebar
function sidebarHTML() {
  const p = profile();
  const d = userData();
  const pending = notify.syncBadge();
  const notes = sortedNotes(d).slice(0, 6);
  const nav = [
    ['home', 'Home', 'home'], ['today', 'Today', 'today', pending], ['calendar', 'Calendar', 'calendar'],
    ['stats', 'Stats', 'chart'], ['tasks', 'Tasks', 'list'], ['notes', 'Notes', 'book'],
  ];
  return `
    <div class="sb-top">
      <a class="brand" href="#/home" aria-label="Check It home"><span class="brand-mark">${logoMark('plain')}</span><span class="brand-word">Check<b>It</b></span></a>
      <button class="icon-btn subtle" id="sb-new" aria-label="Create" aria-haspopup="menu">${icon('compose', 19)}</button>
    </div>
    <button class="sb-search" id="sb-search"><span>${icon('search', 17)}</span><span class="grow">Search</span><kbd>${isMac ? '⌘' : 'Ctrl'} K</kbd></button>
    <nav class="sb-nav" aria-label="Main">
      ${nav.map(([r, l, ic, badge]) => `<a href="#/${r}" data-nav="${r}">${icon(ic, 18)}<span class="grow">${l}</span>${badge ? `<span class="sb-badge">${badge}</span>` : ''}</a>`).join('')}
    </nav>
    <div class="sb-section">
      <div class="sb-head"><span>Channels</span><button class="icon-btn subtle xs2" id="sb-add-ch" aria-label="New channel">${icon('plus', 16)}</button></div>
      ${d.channels.map((c) => { const n = messagesOf(c.id, d).length; return `<a href="#/channel/${c.id}" data-nav="channel:${c.id}"><span class="sb-hash">#</span><span class="grow ellipsis">${esc(c.name)}</span>${n ? `<span class="sb-count">${n}</span>` : ''}</a>`; }).join('')}
    </div>
    <div class="sb-section">
      <div class="sb-head"><span>Notes</span><button class="icon-btn subtle xs2" id="sb-add-note" aria-label="New note">${icon('plus', 16)}</button></div>
      ${notes.length ? notes.map((n) => `<a href="#/note/${n.id}" data-nav="note:${n.id}">${icon('doc', 16)}<span class="grow ellipsis">${esc(n.title || 'Untitled')}</span>${n.pinned ? `<span class="sb-pin">${icon('thumbtack', 13)}</span>` : ''}</a>`).join('') : '<p class="sb-empty">No notes yet</p>'}
    </div>
    <div class="sb-user">
      <span class="avatar static sm">${esc((p.name || '?').slice(0, 1).toUpperCase())}<i class="online"></i></span>
      <div class="grow"><b class="ellipsis">${esc(p.name)}</b><small>@${esc(p.id)}</small></div>
      <button class="icon-btn subtle" id="account-btn" aria-label="Account and settings" aria-haspopup="menu" aria-expanded="false">${icon('gear', 19)}</button>
    </div>`;
}

function bindSidebar(sb) {
  $('#sb-search', sb).onclick = () => { closeDrawer(); openPalette(); };
  $('#account-btn', sb).onclick = (e) => showAccountMenu(e.currentTarget);
  $('#sb-add-ch', sb).onclick = () => { closeDrawer(); newChannel(); };
  $('#sb-add-note', sb).onclick = () => { closeDrawer(); const n = createNote(); go('note', n.id); };
  $('#sb-new', sb).onclick = (e) => createMenu(e.currentTarget);
  $$('a', sb).forEach((a) => a.addEventListener('click', closeDrawer));
  markActive();
}

export function refreshSidebar() {
  const sb = $('.sidebar');
  if (!sb) return;
  const scroll = sb.scrollTop;
  sb.innerHTML = sidebarHTML();
  bindSidebar(sb);
  sb.scrollTop = scroll;
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
      <div class="drawer-backdrop" id="drawer-bd"></div>
      <main id="view" tabindex="-1"></main>
      <nav class="tabbar" aria-label="Navigation">
        ${[['home', 'Home', 'home'], ['today', 'Today', 'today'], ['calendar', 'Calendar', 'calendar'], ['stats', 'Stats', 'chart']].map(([r, l, ic]) => `<a href="#/${r}" data-tab="${r}">${icon(ic, 22)}<span>${l}</span></a>`).join('')}
        <button id="m-more" data-tab="more">${icon('sidebar', 22)}<span>More</span></button>
      </nav>
    </div>`;
  refreshSidebar();
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

// ---------------------------------------------------------------- illustration (original line art)
const ILLUSTRATION = `
<svg class="illus-hero" viewBox="0 0 280 210" aria-hidden="true">
  <g class="ih-float">
    <path class="ih-line" d="M48 176c-10 0-16-7-16-15v-25h44v25c0 8-6 15-16 15z"/>
    <path class="ih-line" d="M76 142c9 0 13 4 13 9s-4 9-13 9"/>
    <path class="ih-steam" d="M46 124c-6-7 6-11 0-19M60 124c-6-7 6-11 0-19"/>
  </g>
  <g class="ih-board">
    <rect class="ih-fill ih-line" x="98" y="30" width="122" height="160" rx="16"/>
    <rect class="ih-ink" x="132" y="18" width="54" height="24" rx="9"/>
    <rect class="ih-fill ih-line" x="118" y="66" width="20" height="20" rx="6"/>
    <rect class="ih-fill ih-line" x="118" y="104" width="20" height="20" rx="6"/>
    <rect class="ih-fill ih-line" x="118" y="142" width="20" height="20" rx="6"/>
    <path class="ih-tick" d="M122 76l5 5 9-10"/>
    <path class="ih-tick t2" d="M122 114l5 5 9-10"/>
    <path class="ih-line thin" d="M150 76h50M150 114h38M150 152h46"/>
  </g>
  <g class="ih-pencil" transform="translate(196 176) rotate(-58)">
    <rect class="ih-fill ih-line" x="0" y="-11" width="96" height="22" rx="4"/>
    <path class="ih-line" d="M0-11L-22 0 0 11"/>
    <path class="ih-ink-fill" d="M-14-4L-22 0-14 4z"/>
    <path class="ih-line" d="M74-11v22M84-11v22"/>
    <path class="ih-line thin" d="M8 0h58"/>
  </g>
  <path class="ih-spark" d="M250 34v14M243 41h14M30 60v10M25 65h10M262 130v8M258 134h8"/>
  <circle class="ih-dot" cx="236" cy="78" r="5"/>
</svg>`;

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
  const greet = hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const list = [...b.required, ...b.flexible, ...b.done].slice(0, 6);
  const notes = sortedNotes(d).slice(0, 4);
  const chans = d.channels.map((c) => ({ c, msgs: messagesOf(c.id, d) })).sort((a, z) => ((z.msgs.at(-1)?.ts || z.c.createdAt) - (a.msgs.at(-1)?.ts || a.c.createdAt))).slice(0, 4);
  const tip = insights(d)[0];
  const series = dailySeries(d, 7);
  const date = parseKey(k).toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' });

  view.innerHTML = `
    <section class="page home">
      <div class="home-hero">
        <div>
          <p class="eyebrow caps">${esc(date)}</p>
          <h1 class="home-title">${greet}, ${esc(p.name)}</h1>
        </div>
        ${ILLUSTRATION}
      </div>

      <div class="tiles">
        <a class="tile-card t-coral" href="#/today"><div class="tc-top">${icon('flag', 20)}<span>Due today</span></div><b class="mono" data-count="${left}">${left}</b><small>${left ? 'Left for today' : 'All clear for today'}</small></a>
        <a class="tile-card t-yellow" href="#/today"><div class="tc-top">${icon('check', 20)}<span>Done today</span></div><b class="mono" data-count="${sum.done}">${sum.done}</b><small>of ${sum.total} planned</small></a>
        <a class="tile-card t-pink" href="#/stats"><div class="tc-top">${icon('flame', 20)}<span>Streak</span></div><b class="mono" data-count="${st}">${st}</b><small>${st === 1 ? 'Day' : 'Days'} in a row</small></a>
        <a class="tile-card t-blue" href="#/stats"><div class="tc-top">${icon('chart', 20)}<span>This week</span></div><b class="mono"><span data-count="${weekPct}">${weekPct}</span>%</b><small>Success in the last 7 days</small></a>
      </div>

      <div class="home-grid">
        <section class="panel p-blue">
          <header class="panel-head"><h2>${icon('today', 18)} Today <span class="count">${sum.total}</span></h2><a href="#/today" class="view-all">View all</a></header>
          ${list.length ? `<ul class="list compact panel-list">${list.map(({ t, s }) => taskRow(t, k, s, { compact: true })).join('')}</ul>`
            : `<div class="panel-empty"><p>Nothing planned yet.</p><button class="btn ghost small" id="h-add-task">${icon('plus', 14)} Add a task</button></div>`}
        </section>

        <section class="panel p-coral">
          <header class="panel-head"><h2>${icon('hash', 18)} Channels <span class="count">${d.channels.length}</span></h2><button class="view-all" id="h-new-ch">New</button></header>
          <div class="panel-rows">
            ${chans.map(({ c, msgs }) => `<a class="prow" href="#/channel/${c.id}">
              <span class="prow-ic">#</span>
              <span class="prow-main"><b>${esc(c.name)}</b><small>${msgs.length ? esc(msgs.at(-1).text.slice(0, 60)) : 'No messages yet'}</small></span>
              ${msgs.length ? `<span class="count">${msgs.length}</span>` : ''}</a>`).join('') || '<div class="panel-empty"><p>No channels yet.</p></div>'}
          </div>
        </section>

        <section class="panel p-yellow">
          <header class="panel-head"><h2>${icon('doc', 18)} Notes <span class="count">${d.notes.length}</span></h2><a href="#/notes" class="view-all">View all</a></header>
          <div class="panel-rows">
            ${notes.map((n) => `<a class="prow" href="#/note/${n.id}">
              <span class="prow-ic">${icon('doc', 17)}</span>
              <span class="prow-main"><b>${esc(n.title || 'Untitled')} ${n.tag ? `<em class="chip small">${esc(n.tag)}</em>` : ''}</b></span>
              <span class="date-pill">${fmtDate(n.updatedAt)}</span></a>`).join('') || '<div class="panel-empty"><p>No notes yet.</p></div>'}
            <button class="prow add" id="h-new-note"><span class="prow-ic">${icon('plus', 17)}</span><span class="prow-main"><b>New note</b></span></button>
          </div>
        </section>

        <section class="panel p-plain">
          <header class="panel-head"><h2>${icon('sparkle', 18)} Your week</h2><a href="#/stats" class="view-all">Stats</a></header>
          <div class="week-bars">${series.map((s) => `<div class="wb"><div class="wb-track"><i style="height:${s.ratio == null ? 0 : Math.max(6, s.ratio * 100)}%" class="${s.ratio != null && s.ratio < 1 && s.k < k ? 'part' : ''}"></i></div><span>${DAY_SHORT[weekday(s.k)].slice(0, 2)}</span></div>`).join('')}</div>
          ${tip ? `<div class="mini-insight ${tip.tone}"><span>${icon(tip.tone === 'good' ? 'sparkle' : 'flag', 15)}</span><p><b>${esc(tip.title)}</b> ${esc(tip.body)}</p></div>` : '<p class="muted small">Tick off a few tasks and your patterns show up here.</p>'}
        </section>
      </div>
      <div class="composer-spacer"></div>
    </section>
    ${composerHTML()}`;

  bindRows($('.p-blue', view), k, () => rerender());
  const at = $('#h-add-task', view); if (at) at.onclick = () => openEditor();
  $('#h-new-ch', view).onclick = () => newChannel();
  $('#h-new-note', view).onclick = () => { const n = createNote(); go('note', n.id); };
  bindComposer(view);
}

// ---------------------------------------------------------------- composer
function targetLabel(t) {
  if (t.kind === 'task') return [icon('check', 16), 'Task'];
  if (t.kind === 'note') return [icon('doc', 16), 'Note'];
  const c = userData().channels.find((x) => x.id === t.id);
  return [icon('hash', 16), c ? c.name : 'Channel'];
}

function composerHTML() {
  const d = userData();
  if (composerTarget.kind === 'channel' && !d.channels.some((c) => c.id === composerTarget.id)) composerTarget = { kind: 'task' };
  const [ic, label] = targetLabel(composerTarget);
  const ph = { task: 'Add a task for today…', note: 'Jot down a note…', channel: `Message #${label}` }[composerTarget.kind];
  return `
    <form class="composer floating" id="composer">
      <div class="cp-chips">
        <button type="button" class="chip ${composerTarget.kind === 'task' ? 'on' : ''}" data-quick="task">Add task</button>
        <button type="button" class="chip ${composerTarget.kind === 'note' ? 'on' : ''}" data-quick="note">Jot a note</button>
        ${d.channels[0] ? `<button type="button" class="chip ${composerTarget.kind === 'channel' && composerTarget.id === d.channels[0].id ? 'on' : ''}" data-quick="ch">Log to #${esc(d.channels[0].name)}</button>` : ''}
      </div>
      <textarea id="cp-input" rows="1" placeholder="${esc(ph)}" aria-label="Write anything"></textarea>
      <div class="composer-row">
        <button type="button" class="cp-target" id="cp-target" aria-haspopup="menu" aria-expanded="false">${ic}<span>${esc(label)}</span>${icon('chevR', 13, 'pk-chev')}</button>
        <button class="send-btn" aria-label="Send">${icon('send', 18)}</button>
      </div>
    </form>`;
}

function bindComposer(view) {
  const f = $('#composer', view);
  if (!f) return;
  const ta = $('#cp-input', f);
  ta.oninput = () => { ta.style.height = 'auto'; ta.style.height = `${Math.min(160, ta.scrollHeight)}px`; };
  ta.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); f.requestSubmit(); } };
  const setTarget = (t) => { composerTarget = t; const keep = ta.value; f.outerHTML = composerHTML(); bindComposer(view); const n = $('#cp-input', view); n.value = keep; n.focus(); };
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
