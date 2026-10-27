// Personal text channels: a place to write quick thoughts, logs and links.
import { icon } from './icons.js';
import { esc, $, $$, uid, toast, popover, closePopover, confirmSheet, sheet } from './ui.js';
import { userData, update } from './store.js';
import { register, go, rerender } from './router.js';
import { refreshSidebar } from './shell.js';

const slug = (s) => s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '').slice(0, 32);
const hhmm = (ts) => new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
function dayLabel(ts) {
  const d = new Date(ts); const now = new Date();
  const diff = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}
const linkify = (s) => esc(s).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>').replace(/\n/g, '<br>');

export function messagesOf(id, d = userData()) { return d.messages.filter((m) => m.channelId === id).sort((a, b) => a.ts - b.ts); }

export function postMessage(channelId, text) {
  const t = text.trim();
  if (!t) return null;
  const m = { id: uid(), channelId, text: t, ts: Date.now() };
  update((d) => d.messages.push(m));
  refreshSidebar();
  return m;
}

export function newChannel(after) {
  const s = sheet(`
    <form class="sheet-body" id="nc-form">
      <h3 class="sheet-title">New channel</h3>
      <p class="muted">A personal stream for one topic — school, gym log, ideas.</p>
      <label class="field"><span>Name</span><div class="link-input"><span>${icon('hash', 18)}</span><input id="nc-name" placeholder="e.g. school" maxlength="32" autocomplete="off"></div></label>
      <div class="row gap"><button type="button" class="btn ghost grow" data-close>Cancel</button><button class="btn primary grow">Create</button></div>
    </form>`);
  $('#nc-form', s.el).onsubmit = (e) => {
    e.preventDefault();
    const name = slug($('#nc-name', s.el).value);
    if (!name) { toast('Give it a name'); return; }
    if (userData().channels.some((c) => c.name === name)) { toast('That channel already exists'); return; }
    const c = { id: uid(), name, createdAt: Date.now() };
    update((d) => d.channels.push(c));
    s.close();
    refreshSidebar();
    after ? after(c) : go('channel', c.id);
  };
}

function viewChannel(view, id) {
  const d = userData();
  const c = d.channels.find((x) => x.id === id);
  if (!c) { view.innerHTML = `<section class="page"><div class="empty"><p>This channel doesn’t exist anymore.</p><a class="btn ghost" href="#/home">Home</a></div></section>`; return; }
  const msgs = messagesOf(id, d);
  let lastDay = '';
  const body = msgs.map((m, i) => {
    const day = dayLabel(m.ts);
    const sep = day !== lastDay ? `<div class="day-sep"><span>${day}</span></div>` : '';
    lastDay = day;
    return `${sep}<div class="msg" data-id="${m.id}" style="--i:${Math.max(0, i - msgs.length + 12)}">
      <span class="msg-time">${hhmm(m.ts)}</span>
      <div class="msg-text">${linkify(m.text)}</div>
      <div class="msg-actions"><button class="icon-btn subtle xs2" data-copy="${m.id}" aria-label="Copy">${icon('copy', 15)}</button><button class="icon-btn subtle xs2" data-del="${m.id}" aria-label="Delete">${icon('trash', 15)}</button></div>
    </div>`;
  }).join('');
  view.innerHTML = `
    <section class="channel-page">
      <header class="ch-head">
        <div><h1><span class="ch-hash">#</span>${esc(c.name)}</h1><p class="muted small">${msgs.length} ${msgs.length === 1 ? 'message' : 'messages'} · only you can see this</p></div>
        <button class="icon-btn subtle" id="ch-more" aria-label="Channel options" aria-haspopup="menu">${icon('more', 20)}</button>
      </header>
      <div class="ch-stream" id="stream">
        ${msgs.length ? body : `<div class="empty ch-empty"><span class="empty-ic">${icon('hash', 26)}</span><p><b>This is the start of #${esc(c.name)}.</b><br>Write anything — it’s saved in your browser.</p></div>`}
      </div>
      <form class="composer ch-composer" id="ch-form">
        <textarea id="ch-input" rows="1" placeholder="Message #${esc(c.name)}" aria-label="Message"></textarea>
        <div class="composer-row">
          <span class="muted small">Enter to send · Shift+Enter for a new line</span>
          <button class="send-btn" aria-label="Send">${icon('send', 18)}</button>
        </div>
      </form>
    </section>`;
  const stream = $('#stream', view);
  stream.scrollTop = stream.scrollHeight;
  const ta = $('#ch-input', view);
  const grow = () => { ta.style.height = 'auto'; ta.style.height = `${Math.min(220, ta.scrollHeight)}px`; };
  ta.oninput = grow;
  ta.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#ch-form', view).requestSubmit(); } };
  $('#ch-form', view).onsubmit = (e) => {
    e.preventDefault();
    if (!postMessage(id, ta.value)) return;
    rerender();
    const again = $('#ch-input'); again && again.focus();
  };
  setTimeout(() => ta.focus({ preventScroll: true }), 60);
  $$('[data-del]', view).forEach((b) => (b.onclick = () => {
    const m = userData().messages.find((x) => x.id === b.dataset.del);
    update((x) => { x.messages = x.messages.filter((y) => y.id !== m.id); });
    toast('Message deleted', { action: 'Undo', onAction: () => { update((x) => x.messages.push(m)); rerender(); } });
    refreshSidebar(); rerender();
  }));
  $$('[data-copy]', view).forEach((b) => (b.onclick = async () => {
    const m = userData().messages.find((x) => x.id === b.dataset.copy);
    try { await navigator.clipboard.writeText(m.text); toast('Copied'); } catch { toast('Couldn’t copy'); }
  }));
  $('#ch-more', view).onclick = (e) => {
    const el = popover(e.currentTarget, `<div class="menu">
      <button data-a="rename"><span>Rename</span>${icon('edit', 18)}</button>
      <button data-a="clear"><span>Clear messages</span>${icon('broom', 18)}</button>
      <div class="menu-sep"></div>
      <button data-a="del" class="danger"><span>Delete channel</span>${icon('trash', 18)}</button></div>`);
    if (!el) return;
    el.onclick = async (ev) => {
      const b = ev.target.closest('[data-a]'); if (!b) return;
      closePopover();
      if (b.dataset.a === 'rename') {
        const s = sheet(`<form class="sheet-body" id="rn"><h3 class="sheet-title">Rename channel</h3>
          <label class="field"><span>Name</span><div class="link-input"><span>${icon('hash', 18)}</span><input id="rn-name" value="${esc(c.name)}" maxlength="32"></div></label>
          <div class="row gap"><button type="button" class="btn ghost grow" data-close>Cancel</button><button class="btn primary grow">Save</button></div></form>`);
        $('#rn', s.el).onsubmit = (ev2) => { ev2.preventDefault(); const nm = slug($('#rn-name', s.el).value); if (!nm) return; update(() => { c.name = nm; }); s.close(); refreshSidebar(); rerender(); };
      }
      if (b.dataset.a === 'clear' && await confirmSheet('Clear all messages?', `Every message in #${c.name} will be removed.`, 'Clear')) {
        update((x) => { x.messages = x.messages.filter((y) => y.channelId !== id); }); refreshSidebar(); rerender();
      }
      if (b.dataset.a === 'del' && await confirmSheet('Delete channel?', `#${c.name} and its messages will be removed.`, 'Delete')) {
        update((x) => { x.channels = x.channels.filter((y) => y.id !== id); x.messages = x.messages.filter((y) => y.channelId !== id); });
        refreshSidebar(); go('home');
      }
    };
  };
}

register('channel', (v, id) => viewChannel(v, id));
export { dayLabel, hhmm };
