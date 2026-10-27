// ⌘K command palette: search tasks, notes, channels and messages, or run an action.
import { icon, taskIcon } from './icons.js';
import { esc, $, $$ } from './ui.js';
import { userData, setPrefs, resolvedTheme } from './store.js';
import { go } from './router.js';
import { frequencyLabel } from './schedule.js';
import { openEditor } from './views.js';
import { createNote, excerpt } from './notes.js';
import { newChannel } from './channels.js';
import { exportActivity } from './export.js';

let open = null;

function actions() {
  return [
    { kind: 'Actions', icon: 'plus', title: 'New task', run: () => openEditor() },
    { kind: 'Actions', icon: 'doc', title: 'New note', run: () => { const n = createNote(); go('note', n.id); } },
    { kind: 'Actions', icon: 'hash', title: 'New channel', run: () => newChannel() },
    { kind: 'Actions', icon: 'download', title: 'Export activity (CSV)', run: () => exportActivity() },
    { kind: 'Actions', icon: resolvedTheme() === 'dark' ? 'sun' : 'moon', title: resolvedTheme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode', run: () => setPrefs({ theme: resolvedTheme() === 'dark' ? 'light' : 'dark' }) },
    { kind: 'Go to', icon: 'home', title: 'Home', run: () => go('home') },
    { kind: 'Go to', icon: 'today', title: 'Today', run: () => go('today') },
    { kind: 'Go to', icon: 'calendar', title: 'Calendar', run: () => go('calendar') },
    { kind: 'Go to', icon: 'chart', title: 'Stats', run: () => go('stats') },
    { kind: 'Go to', icon: 'list', title: 'Tasks', run: () => go('tasks') },
    { kind: 'Go to', icon: 'book', title: 'Notes', run: () => go('notes') },
    { kind: 'Go to', icon: 'gear', title: 'Settings', run: () => go('settings') },
  ];
}

function search(q) {
  const d = userData();
  const s = q.trim().toLowerCase();
  const hit = (txt) => txt.toLowerCase().includes(s);
  const acts = actions().filter((a) => !s || hit(a.title));
  if (!s) return acts;
  const out = [...acts];
  d.tasks.filter((t) => hit(t.title)).slice(0, 6).forEach((t) => out.push({ kind: 'Tasks', html: taskIcon(t.icon, 18), title: t.title, sub: frequencyLabel(t), run: () => openEditor(t.id) }));
  d.notes.filter((n) => hit(`${n.title} ${n.body} ${n.tag}`)).slice(0, 6).forEach((n) => out.push({ kind: 'Notes', icon: 'doc', title: n.title || 'Untitled', sub: excerpt(n.body).slice(0, 70), run: () => go('note', n.id) }));
  d.channels.filter((c) => hit(c.name)).forEach((c) => out.push({ kind: 'Channels', icon: 'hash', title: c.name, run: () => go('channel', c.id) }));
  d.messages.filter((m) => hit(m.text)).slice(-6).reverse().forEach((m) => {
    const c = d.channels.find((x) => x.id === m.channelId);
    if (c) out.push({ kind: 'Messages', icon: 'hash', title: m.text.slice(0, 80), sub: `#${c.name} · ${new Date(m.ts).toLocaleDateString('en-GB')}`, run: () => go('channel', c.id) });
  });
  return out;
}

export function openPalette() {
  if (open) return;
  const wrap = document.createElement('div');
  wrap.className = 'palette-wrap';
  wrap.innerHTML = `
    <div class="palette-backdrop"></div>
    <div class="palette" role="dialog" aria-modal="true" aria-label="Search">
      <div class="pal-input">${icon('search', 20)}<input id="pal-q" placeholder="Search tasks, notes, channels…" autocomplete="off" spellcheck="false"><kbd>esc</kbd></div>
      <div class="pal-results" id="pal-res" role="listbox"></div>
      <div class="pal-foot"><span><kbd>↑</kbd><kbd>↓</kbd> to move</span><span><kbd>↵</kbd> to open</span></div>
    </div>`;
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('in'));
  const prev = document.activeElement;
  const input = $('#pal-q', wrap);
  const res = $('#pal-res', wrap);
  let items = []; let sel = 0;
  const close = () => { wrap.classList.remove('in'); setTimeout(() => wrap.remove(), 220); open = null; document.removeEventListener('keydown', onKey, true); prev && prev.focus && prev.focus(); };
  const run = (i) => { const it = items[i]; if (!it) return; close(); setTimeout(() => it.run(), 30); };
  const draw = () => {
    items = search(input.value);
    sel = Math.min(sel, Math.max(0, items.length - 1));
    let last = '';
    res.innerHTML = items.length ? items.map((it, i) => {
      const head = it.kind !== last ? `<div class="pal-group">${it.kind}</div>` : '';
      last = it.kind;
      return `${head}<button class="pal-item ${i === sel ? 'on' : ''}" data-i="${i}" role="option" aria-selected="${i === sel}">
        <span class="pal-ic">${it.html || icon(it.icon, 18)}</span>
        <span class="pal-txt"><b>${esc(it.title)}</b>${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</span>
        ${i === sel ? '<kbd>↵</kbd>' : ''}</button>`;
    }).join('') : `<div class="pal-empty">Nothing found for “${esc(input.value)}”.</div>`;
    $$('.pal-item', res).forEach((b) => { b.onclick = () => run(+b.dataset.i); b.onmousemove = () => { if (sel !== +b.dataset.i) { sel = +b.dataset.i; draw(); } }; });
    const on = $('.pal-item.on', res); on && on.scrollIntoView({ block: 'nearest' });
  };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(items.length - 1, sel + 1); draw(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); draw(); }
    else if (e.key === 'Enter') { e.preventDefault(); run(sel); }
  };
  document.addEventListener('keydown', onKey, true);
  input.oninput = () => { sel = 0; draw(); };
  $('.palette-backdrop', wrap).onclick = close;
  draw();
  setTimeout(() => input.focus(), 20);
  open = wrap;
}

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && userData()) { e.preventDefault(); openPalette(); }
});
