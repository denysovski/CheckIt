// Notes: a list page and a single-note editor with a tiny Markdown preview.
import { icon } from './icons.js';
import { esc, $, $$, uid, toast, popover, closePopover, confirmSheet } from './ui.js';
import { userData, update } from './store.js';
import { register, go, rerender } from './router.js';
import { refreshSidebar } from './shell.js';

const fmtDate = (ts) => {
  const d = new Date(ts); const now = new Date();
  const days = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return d.toLocaleDateString('en-GB', { weekday: 'long' });
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
};
export { fmtDate };

export function sortedNotes(d = userData()) {
  return [...d.notes].sort((a, b) => (b.pinned - a.pinned) || b.updatedAt - a.updatedAt);
}

export function createNote({ title = '', body = '', tag = '' } = {}) {
  const now = Date.now();
  const n = { id: uid(), title, body, tag, pinned: false, createdAt: now, updatedAt: now };
  update((d) => d.notes.unshift(n));
  refreshSidebar();
  return n;
}

// ---------- tiny markdown ----------
function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<i>$2</i>')
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
}
export function markdown(src) {
  const lines = (src || '').split('\n');
  let html = ''; let list = false;
  const close = () => { if (list) { html += '</ul>'; list = false; } };
  lines.forEach((ln, i) => {
    let m;
    if ((m = ln.match(/^(#{1,3})\s+(.*)/))) { close(); html += `<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`; }
    else if ((m = ln.match(/^\[( |x)\]\s+(.*)/i))) { close(); html += `<label class="md-check"><input type="checkbox" data-line="${i}" ${m[1].toLowerCase() === 'x' ? 'checked' : ''}><span>${inline(m[2])}</span></label>`; }
    else if ((m = ln.match(/^[-*]\s+(.*)/))) { if (!list) { html += '<ul>'; list = true; } html += `<li>${inline(m[1])}</li>`; }
    else if (!ln.trim()) { close(); html += '<div class="md-gap"></div>'; }
    else { close(); html += `<p>${inline(ln)}</p>`; }
  });
  close();
  return html;
}
export const excerpt = (body) => (body || '').replace(/^#+\s*/gm, '').replace(/^\s*[-*]\s+/gm, '').replace(/\[( |x)\]\s*/gi, '').replace(/[*`]/g, '').split('\n').filter((l) => l.trim()).slice(0, 3).join(' · ').slice(0, 140);

// ---------- notes list ----------
let filterTag = null;
let query = '';
function viewNotes(view) {
  const d = userData();
  const tags = [...new Set(d.notes.map((n) => n.tag).filter(Boolean))].sort();
  const q = query.trim().toLowerCase();
  const list = sortedNotes(d).filter((n) => (!filterTag || n.tag === filterTag) && (!q || `${n.title} ${n.body}`.toLowerCase().includes(q)));
  view.innerHTML = `
    <section class="page">
      <div class="hero-head">
        <div><p class="eyebrow">Notes</p><h1 class="large-title">Your notes.</h1><p class="lead">School, plans, ideas — anything you want to keep.</p></div>
        <button class="btn primary" id="new-note">${icon('plus', 16)} New note</button>
      </div>
      <div class="notes-bar">
        <div class="search inline"><span>${icon('search', 18)}</span><input id="nq" placeholder="Search notes…" value="${esc(query)}" autocomplete="off"></div>
        <div class="chips-row">
          <button class="chip ${!filterTag ? 'on' : ''}" data-tag="">All</button>
          ${tags.map((t) => `<button class="chip ${filterTag === t ? 'on' : ''}" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}
        </div>
      </div>
      ${list.length ? `<div class="note-grid">${list.map((n, i) => `
        <a class="note-card" href="#/note/${n.id}" style="--i:${i}">
          <div class="nc-top">${n.tag ? `<span class="chip small">${esc(n.tag)}</span>` : '<span></span>'}${n.pinned ? `<span class="nc-pin">${icon('thumbtack', 15)}</span>` : ''}</div>
          <h3>${esc(n.title || 'Untitled')}</h3>
          <p>${esc(excerpt(n.body)) || '<span class="muted">Empty note</span>'}</p>
          <small>${fmtDate(n.updatedAt)}</small>
        </a>`).join('')}</div>`
        : `<div class="empty"><span class="empty-ic">${icon('doc', 26)}</span><p>${q || filterTag ? 'No notes match.' : 'No notes yet.'}</p></div>`}
    </section>`;
  $('#new-note', view).onclick = () => { const n = createNote(); go('note', n.id); };
  const nq = $('#nq', view);
  nq.oninput = () => { query = nq.value; const pos = nq.selectionStart; rerender(); const again = $('#nq'); again.focus(); again.setSelectionRange(pos, pos); };
  $$('[data-tag]', view).forEach((b) => (b.onclick = () => { filterTag = b.dataset.tag || null; rerender(); }));
}

// ---------- single note ----------
let mode = 'write';
function viewNote(view, id) {
  const d = userData();
  const n = d.notes.find((x) => x.id === id);
  if (!n) { view.innerHTML = `<section class="page"><div class="empty"><p>This note doesn’t exist anymore.</p><a class="btn ghost" href="#/notes">Back to notes</a></div></section>`; return; }
  view.innerHTML = `
    <section class="page narrow note-page">
      <div class="note-toolbar">
        <a class="back-link inline" href="#/notes">${icon('chevL', 16)} Notes</a>
        <div class="row gap">
          <span class="save-state muted small" id="save-state">Saved</span>
          <div class="seg mini fit"><button data-mode="write" class="${mode === 'write' ? 'on' : ''}">Write</button><button data-mode="preview" class="${mode === 'preview' ? 'on' : ''}">Preview</button></div>
          <button class="icon-btn subtle" id="note-more" aria-label="More" aria-haspopup="menu">${icon('more', 20)}</button>
        </div>
      </div>
      <div class="note-meta">
        <button class="chip tag-btn" id="tag-btn">${icon('tag', 14)} ${esc(n.tag || 'Add tag')}</button>
        <span class="muted small">Edited ${fmtDate(n.updatedAt).toLowerCase()} · ${new Date(n.updatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <input class="note-title" id="nt" placeholder="Untitled" value="${esc(n.title)}" maxlength="120">
      ${mode === 'write'
        ? `<textarea class="note-body" id="nb" placeholder="Start writing… (# heading, - list, [ ] checkbox, **bold**)">${esc(n.body)}</textarea>`
        : `<div class="note-preview md">${markdown(n.body) || '<p class="muted">Nothing to preview yet.</p>'}</div>`}
    </section>`;

  let timer;
  const status = $('#save-state', view);
  const persist = () => {
    clearTimeout(timer);
    status.textContent = 'Saving…';
    timer = setTimeout(() => {
      update((x) => { const y = x.notes.find((z) => z.id === id); if (!y) return; y.title = $('#nt', view)?.value ?? y.title; const b = $('#nb', view); if (b) y.body = b.value; y.updatedAt = Date.now(); });
      status.textContent = 'Saved';
      refreshSidebar();
    }, 350);
  };
  const grow = (ta) => { ta.style.height = 'auto'; ta.style.height = `${Math.max(320, ta.scrollHeight)}px`; };
  $('#nt', view).oninput = persist;
  const nb = $('#nb', view);
  if (nb) {
    grow(nb);
    nb.oninput = () => { grow(nb); persist(); };
    nb.onkeydown = (e) => {
      if (e.key !== 'Enter' || e.shiftKey) return;
      // continue lists / checkboxes on Enter
      const start = nb.selectionStart; const line = nb.value.slice(0, start).split('\n').pop();
      const m = line.match(/^(\s*)([-*]\s+|\[[ x]\]\s+)/i);
      if (!m) return;
      e.preventDefault();
      if (line.trim() === m[2].trim()) { nb.setRangeText('', start - line.length, start, 'end'); persist(); return; }
      const prefix = m[1] + (m[2].startsWith('[') ? '[ ] ' : m[2]);
      nb.setRangeText(`\n${prefix}`, start, nb.selectionEnd, 'end');
      grow(nb); persist();
    };
    if (!n.title && !n.body) $('#nt', view).focus();
  }
  $$('.md-check input', view).forEach((cb) => (cb.onchange = () => {
    update((x) => {
      const y = x.notes.find((z) => z.id === id);
      const lines = y.body.split('\n'); const i = +cb.dataset.line;
      lines[i] = lines[i].replace(/^\[( |x)\]/i, cb.checked ? '[x]' : '[ ]');
      y.body = lines.join('\n'); y.updatedAt = Date.now();
    });
  }));
  $$('[data-mode]', view).forEach((b) => (b.onclick = () => { if (nb) { clearTimeout(timer); update((x) => { const y = x.notes.find((z) => z.id === id); y.body = nb.value; y.title = $('#nt', view).value; }); } mode = b.dataset.mode; rerender(); }));

  $('#tag-btn', view).onclick = (e) => {
    const tags = [...new Set(userData().notes.map((x) => x.tag).filter(Boolean)), 'School', 'Personal', 'Work'].filter((v, i, a) => a.indexOf(v) === i);
    const el = popover(e.currentTarget, `<div class="menu tag-menu">
      <div class="menu-pad"><input class="tag-input" id="tag-new" placeholder="New tag…" maxlength="20" autofocus></div>
      ${tags.map((t) => `<button data-t="${esc(t)}" class="${t === n.tag ? 'on' : ''}"><span>${esc(t)}</span>${t === n.tag ? icon('check', 16) : ''}</button>`).join('')}
      ${n.tag ? `<div class="menu-sep"></div><button data-t=""><span>Remove tag</span>${icon('close', 16)}</button>` : ''}
    </div>`, { align: 'start' });
    if (!el) return;
    const set = (t) => { closePopover(); update((x) => { const y = x.notes.find((z) => z.id === id); y.tag = t; y.updatedAt = Date.now(); }); rerender(); };
    $$('[data-t]', el).forEach((b) => (b.onclick = () => set(b.dataset.t)));
    $('#tag-new', el).onkeydown = (ev) => { if (ev.key === 'Enter' && ev.target.value.trim()) set(ev.target.value.trim()); };
  };

  $('#note-more', view).onclick = (e) => {
    const el = popover(e.currentTarget, `<div class="menu">
      <button data-a="pin"><span>${n.pinned ? 'Unpin' : 'Pin to top'}</span>${icon('thumbtack', 18)}</button>
      <button data-a="md"><span>Download as .md</span>${icon('download', 18)}</button>
      <button data-a="copy"><span>Copy text</span>${icon('copy', 18)}</button>
      <div class="menu-sep"></div>
      <button data-a="del" class="danger"><span>Delete note</span>${icon('trash', 18)}</button></div>`);
    if (!el) return;
    el.onclick = async (ev) => {
      const b = ev.target.closest('[data-a]'); if (!b) return;
      closePopover();
      const cur = userData().notes.find((z) => z.id === id);
      if (b.dataset.a === 'pin') { update(() => { cur.pinned = !cur.pinned; }); refreshSidebar(); rerender(); }
      if (b.dataset.a === 'md') {
        const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([`# ${cur.title || 'Untitled'}\n\n${cur.body}`], { type: 'text/markdown' })), download: `${(cur.title || 'note').replace(/[^\w-]+/g, '-').toLowerCase()}.md` });
        a.click(); URL.revokeObjectURL(a.href);
      }
      if (b.dataset.a === 'copy') { try { await navigator.clipboard.writeText(`${cur.title}\n\n${cur.body}`); toast('Copied'); } catch { toast('Couldn’t copy'); } }
      if (b.dataset.a === 'del' && await confirmSheet('Delete note?', `“${cur.title || 'Untitled'}” will be removed.`, 'Delete')) {
        update((x) => { x.notes = x.notes.filter((z) => z.id !== id); });
        refreshSidebar(); go('notes');
      }
    };
  };
}

register('notes', (v) => viewNotes(v));
register('note', (v, id) => viewNote(v, id));
