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

// "27th October 2026"
export function fullDate(ts) {
  const d = new Date(ts); const n = d.getDate();
  const suf = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th';
  return `${n}${suf} ${d.toLocaleDateString('en-GB', { month: 'long' })} ${d.getFullYear()}`;
}

export const NOTE_ICONS = ['doc', 'book', 'pen', 'brain', 'star', 'heart', 'flag', 'calendar', 'clock', 'list', 'check', 'bell', 'code', 'music', 'camera', 'video', 'gamepad', 'dumbbell', 'run', 'leaf', 'plant', 'cart', 'wallet', 'mail', 'phone', 'users', 'location', 'link', 'tag', 'quote', 'flame', 'moon'];
export const noteIcon = (n) => (n && NOTE_ICONS.includes(n.icon) ? n.icon : 'doc');
const words = (b) => ((b || '').match(/\S+/g) || []).length;

// Icon picker popover; calls onPick(name)
function pickIcon(anchor, current, onPick) {
  const el = popover(anchor, `<div class="menu icon-pick" role="listbox" aria-label="Note icon">${NOTE_ICONS.map((ic) => `<button role="option" aria-selected="${ic === current}" class="${ic === current ? 'on' : ''}" data-ic="${ic}" title="${ic}" aria-label="${ic}">${icon(ic, 20)}</button>`).join('')}</div>`, { align: 'start' });
  if (!el) return;
  $$('[data-ic]', el).forEach((b) => (b.onclick = () => { closePopover(); onPick(b.dataset.ic); }));
  const first = $('.on', el) || $('[data-ic]', el); first && first.focus();
}

export function sortedNotes(d = userData()) {
  return [...d.notes].sort((a, b) => (b.pinned - a.pinned) || b.updatedAt - a.updatedAt);
}

export function createNote({ title = '', body = '', tag = '' } = {}) {
  const now = Date.now();
  const n = { id: uid(), title, body, tag, icon: 'doc', pinned: false, createdAt: now, updatedAt: now };
  update((d) => d.notes.unshift(n));
  refreshSidebar();
  return n;
}

// ---------- markdown (small, safe: everything is escaped first) ----------
export const TEXT_COLORS = [['blue', '#12AAD4'], ['green', '#3DBB7E'], ['orange', '#EE8F5B'], ['red', '#E5534B'], ['purple', '#9B7BEA'], ['gray', '#8A929C']];
const COLOR_MAP = Object.fromEntries(TEXT_COLORS);
const safeUrl = (u) => (/^(https?:|mailto:)/i.test(u) ? u : '#');
function inline(s) {
  const codes = [];
  let h = esc(s).replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  h = h
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, u) => `<img src="${safeUrl(u)}" alt="${alt}" loading="lazy">`)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => `<a href="${safeUrl(u)}" target="_blank" rel="noopener noreferrer">${t}</a>`)
    .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>')
    .replace(/__([^_]+)__/g, '<u>$1</u>')
    .replace(/~~([^~]+)~~/g, '<s>$1</s>')
    .replace(/==([^=]+)==/g, '<mark>$1</mark>')
    .replace(/\{(blue|green|orange|red|purple|gray)\|([^}]+)\}/g, (_, c, t) => `<span class="md-c" style="color:${COLOR_MAP[c]}">${t}</span>`)
    .replace(/\{(big|small)\|([^}]+)\}/g, '<span class="md-$1">$2</span>');
  return h.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[+i]}</code>`);
}
export function markdown(src) {
  const lines = (src || '').split('\n');
  let html = '';
  const stack = []; // open lists: { tag, indent }
  const closeTo = (indent) => { while (stack.length && stack[stack.length - 1].indent >= indent) html += `</li></${stack.pop().tag}>`; };
  const closeAll = () => closeTo(-1);
  let code = null;
  lines.forEach((ln, i) => {
    let m;
    if (code !== null) {
      if (/^```/.test(ln)) { html += `<pre><code>${esc(code.join('\n'))}</code></pre>`; code = null; } else code.push(ln);
      return;
    }
    if (/^```/.test(ln)) { closeAll(); code = []; return; }
    if ((m = ln.match(/^(\s*)([-*]|\d+[.)])\s+(\[( |x)\]\s+)?(.*)/i))) {
      const indent = m[1].replace(/\t/g, '  ').length; const tag = /\d/.test(m[2]) ? 'ol' : 'ul';
      const top = stack[stack.length - 1];
      if (!top || indent > top.indent) { html += `<${tag}>`; stack.push({ tag, indent }); }
      else {
        closeTo(indent + 1);
        const t2 = stack[stack.length - 1];
        if (t2 && t2.indent === indent && t2.tag !== tag) { html += `</li></${stack.pop().tag}><${tag}>`; stack.push({ tag, indent }); }
        else if (t2 && t2.indent === indent) html += '</li>';
        else { html += `<${tag}>`; stack.push({ tag, indent }); }
      }
      const body = m[3] ? `<label class="md-check in-list"><input type="checkbox" data-line="${i}" ${m[4].toLowerCase() === 'x' ? 'checked' : ''}><span>${inline(m[5])}</span></label>` : inline(m[5]);
      html += `<li>${body}`;
      return;
    }
    closeAll();
    if ((m = ln.match(/^(#{1,3})\s+(.*)/))) html += `<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`;
    else if ((m = ln.match(/^\[( |x)\]\s+(.*)/i))) html += `<label class="md-check"><input type="checkbox" data-line="${i}" ${m[1].toLowerCase() === 'x' ? 'checked' : ''}><span>${inline(m[2])}</span></label>`;
    else if ((m = ln.match(/^!>\s?(.*)/))) html += `<div class="md-callout">${icon('info', 16)}<span>${inline(m[1])}</span></div>`;
    else if ((m = ln.match(/^>\s?(.*)/))) html += `<blockquote>${inline(m[1])}</blockquote>`;
    else if (/^(-{3,}|\*{3,})\s*$/.test(ln)) html += '<hr>';
    else if (!ln.trim()) html += '<div class="md-gap"></div>';
    else html += `<p>${inline(ln)}</p>`;
  });
  if (code !== null) html += `<pre><code>${esc(code.join('\n'))}</code></pre>`;
  closeAll();
  return html;
}
export const excerpt = (body) => (body || '')
  .replace(/^```.*$/gm, '').replace(/^#+\s*/gm, '').replace(/^\s*([-*]|\d+[.)])\s+/gm, '').replace(/\[( |x)\]\s*/gi, '').replace(/^!?>\s?/gm, '')
  .replace(/\{\w+\|([^}]+)\}/g, '$1').replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*`~=_]{1,2}/g, '').replace(/^-{3,}$/gm, '')
  .split('\n').filter((l) => l.trim()).slice(0, 3).join(' · ').slice(0, 140);

export const NOTE_FONTS = [['sans', 'Sans'], ['serif', 'Serif'], ['mono', 'Mono']];

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
        <div><h1 class="large-title">Your notes.</h1><p class="lead">School, plans, ideas, anything you want to keep.</p></div>
        <button class="btn primary" id="new-note">${icon('plus', 16)} New note</button>
      </div>
      <div class="notes-bar">
        <div class="search inline"><span>${icon('search', 18)}</span><input id="nq" placeholder="Search notes…" value="${esc(query)}" autocomplete="off"></div>
        <div class="chips-row">
          <button class="chip ${!filterTag ? 'on' : ''}" data-tag="">All</button>
          ${tags.map((t) => `<button class="chip ${filterTag === t ? 'on' : ''}" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}
        </div>
      </div>
      ${`<div class="note-grid">${!q && !filterTag ? `
        <a class="note-card guide-card" href="#/note/guide">
          <div class="nc-head"><span class="nc-ic">${icon('book', 22)}</span><div class="nc-flags"><span class="nc-tag">Guide</span></div></div>
          <h3>How to format notes</h3>
          <p>Headings, bold, lists, checkboxes, colours, fonts, quotes, code and more. Every trick, with examples.</p>
          <div class="nc-foot"><span>${icon('info', 13)} Always here</span><span>Open guide</span></div>
        </a>` : ''}${list.map((n, i) => `
        <a class="note-card" href="#/note/${n.id}" style="--i:${i}">
          <div class="nc-head">
            <span class="nc-ic">${icon(noteIcon(n), 22)}</span>
            <div class="nc-flags">${n.tag ? `<span class="nc-tag">${esc(n.tag)}</span>` : ''}${n.pinned ? `<span class="nc-pin" title="Pinned">${icon('thumbtack', 14)}</span>` : ''}</div>
          </div>
          <h3>${esc(n.title || 'Untitled')}</h3>
          <p>${esc(excerpt(n.body)) || '<span class="muted">Empty note</span>'}</p>
          <div class="nc-foot"><span>${icon('calendar', 13)} ${fullDate(n.updatedAt)}</span><span>${words(n.body)} ${words(n.body) === 1 ? 'word' : 'words'}</span></div>
        </a>`).join('')}</div>`}
        ${!list.length && (q || filterTag) ? `<div class="empty"><span class="empty-ic">${icon('doc', 26)}</span><p>No notes match.</p></div>` : ''}
    </section>`;
  $('#new-note', view).onclick = () => { const n = createNote(); go('note', n.id); };
  const nq = $('#nq', view);
  nq.oninput = () => { query = nq.value; const pos = nq.selectionStart; rerender(); const again = $('#nq'); again.focus(); again.setSelectionRange(pos, pos); };
  $$('[data-tag]', view).forEach((b) => (b.onclick = () => { filterTag = b.dataset.tag || null; rerender(); }));
}

// ---------- single note ----------
let mode = 'write';
function viewNote(view, id) {
  if (id === 'guide') { viewGuide(view); return; }
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
        <span class="muted small">Edited ${fullDate(n.updatedAt)} · ${new Date(n.updatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div class="note-head">
        <button class="note-ic" id="note-ic" aria-label="Change icon" title="Change icon" aria-haspopup="listbox">${icon(noteIcon(n), 28)}</button>
        <input class="note-title" id="nt" placeholder="Untitled" value="${esc(n.title)}" maxlength="120" aria-label="Title">
      </div>
      ${mode === 'write' ? toolbarHTML(n) : ''}
      ${mode === 'write'
        ? `<textarea class="note-body font-${n.font || 'sans'}" id="nb" placeholder="Start writing… Open the Guide in Notes to see every format.">${esc(n.body)}</textarea>`
        : `<div class="note-preview md font-${n.font || 'sans'}">${markdown(n.body) || '<p class="muted">Nothing to preview yet.</p>'}</div>`}
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
      const mod = e.metaKey || e.ctrlKey;
      if (mod && ['b', 'i', 'u'].includes(e.key.toLowerCase())) { e.preventDefault(); applyFmt(nb, { b: 'bold', i: 'italic', u: 'underline' }[e.key.toLowerCase()]); grow(nb); persist(); return; }
      if (e.key === 'Tab') { e.preventDefault(); indentLines(nb, e.shiftKey ? -1 : 1); persist(); return; }
      if (e.key !== 'Enter' || e.shiftKey) return;
      // continue lists, numbers and checkboxes on Enter
      const start = nb.selectionStart; const line = nb.value.slice(0, start).split('\n').pop();
      const m = line.match(/^(\s*)([-*]\s+(\[[ x]\]\s+)?|(\d+)([.)])\s+(\[[ x]\]\s+)?|\[[ x]\]\s+)/i);
      if (!m) return;
      e.preventDefault();
      if (line.trim() === m[2].trim()) { nb.setRangeText('', start - line.length, start, 'end'); persist(); return; }
      let prefix;
      if (m[4]) prefix = `${+m[4] + 1}${m[5]} ${m[6] ? '[ ] ' : ''}`;
      else if (m[2].startsWith('[')) prefix = '[ ] ';
      else prefix = m[3] ? `${m[2].trim()[0]} [ ] ` : m[2];
      nb.setRangeText(`\n${m[1]}${prefix}`, start, nb.selectionEnd, 'end');
      grow(nb); persist();
    };
    bindToolbar(view, nb, () => { grow(nb); persist(); }, id);
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

  $('#note-ic', view).onclick = (e) => pickIcon(e.currentTarget, noteIcon(n), (ic) => {
    update((x) => { const y = x.notes.find((z) => z.id === id); y.icon = ic; });
    refreshSidebar(); rerender();
  });

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

// ---------- formatting toolbar ----------
const FMT = {
  bold: ['**', '**', 'bold text'], italic: ['*', '*', 'italic text'], underline: ['__', '__', 'underlined'], strike: ['~~', '~~', 'crossed out'],
  mark: ['==', '==', 'highlighted'], code: ['`', '`', 'code'], link: ['[', '](https://)', 'link text'],
};
function toolbarHTML(n) {
  const b = (f, ic, label, key = '') => `<button type="button" class="nt-btn" data-fmt="${f}" title="${label}${key ? ` (${key})` : ''}" aria-label="${label}">${ic}</button>`;
  const t = (txt) => `<span class="nt-txt">${txt}</span>`;
  return `
    <div class="note-tools" role="toolbar" aria-label="Formatting">
      <div class="nt-group">${b('h1', t('H1'), 'Heading 1')}${b('h2', t('H2'), 'Heading 2')}${b('h3', t('H3'), 'Heading 3')}</div>
      <div class="nt-group">${b('bold', t('<b>B</b>'), 'Bold', 'Ctrl+B')}${b('italic', t('<i>I</i>'), 'Italic', 'Ctrl+I')}${b('underline', t('<u>U</u>'), 'Underline', 'Ctrl+U')}${b('strike', t('<s>S</s>'), 'Strikethrough')}${b('mark', t('<mark>H</mark>'), 'Highlight')}
        <button type="button" class="nt-btn" id="nt-color" title="Text colour" aria-label="Text colour" aria-haspopup="menu"><span class="nt-txt nt-a">A</span></button></div>
      <div class="nt-group">${b('ul', icon('list', 17), 'Bullet list')}${b('ol', t('1.'), 'Numbered list')}${b('check', icon('check', 17), 'Checkbox')}${b('indent', icon('chevR', 16), 'Indent (Tab)')}</div>
      <div class="nt-group">${b('quote', t('“'), 'Quote')}${b('callout', icon('info', 17), 'Callout')}${b('codeblock', t('&lt;/&gt;'), 'Code block')}${b('hr', t('—'), 'Divider')}${b('link', icon('link', 17), 'Link')}</div>
      <div class="nt-group"><button type="button" class="nt-btn wide" id="nt-font" aria-haspopup="menu" title="Font">${t(NOTE_FONTS.find((f) => f[0] === (n.font || 'sans'))[1])}${icon('chevR', 12, 'pk-chev')}</button></div>
    </div>`;
}
function applyFmt(ta, f) {
  const s = ta.selectionStart; const e = ta.selectionEnd; const v = ta.value; const sel = v.slice(s, e);
  if (FMT[f]) {
    const [a, b, ph] = FMT[f];
    const text = sel || ph;
    ta.setRangeText(`${a}${text}${b}`, s, e, 'select');
    ta.setSelectionRange(s + a.length, s + a.length + text.length);
    ta.focus(); return;
  }
  // line-based formats act on every selected line
  const ls = v.lastIndexOf('\n', s - 1) + 1; let le = v.indexOf('\n', e); if (le < 0) le = v.length;
  const block = v.slice(ls, le).split('\n');
  const strip = (l) => l.replace(/^(#{1,3}\s+|[-*]\s+(\[[ x]\]\s+)?|\d+[.)]\s+|\[[ x]\]\s+|!?>\s?)/i, '');
  let out;
  if (f === 'h1' || f === 'h2' || f === 'h3') { const p = '#'.repeat(+f[1]); out = block.map((l) => (l.startsWith(`${p} `) ? strip(l) : `${p} ${strip(l)}`)); }
  else if (f === 'ul') { const all = block.every((l) => /^\s*[-*]\s/.test(l)); out = block.map((l) => (all ? l.replace(/^(\s*)[-*]\s+/, '$1') : l.replace(/^(\s*)(?:\d+[.)]\s+)?/, '$1- '))); }
  else if (f === 'ol') { const all = block.every((l) => /^\s*\d+[.)]\s/.test(l)); let n = 0; out = block.map((l) => (all ? l.replace(/^(\s*)\d+[.)]\s+/, '$1') : l.replace(/^(\s*)(?:[-*]\s+)?/, (_, w) => `${w}${++n}. `))); }
  else if (f === 'check') out = block.map((l) => (/\[[ x]\]\s/i.test(l) ? l.replace(/\[[ x]\]\s+/i, '') : /^\s*([-*]|\d+[.)])\s/.test(l) ? l.replace(/^(\s*([-*]|\d+[.)])\s+)/, '$1[ ] ') : `[ ] ${l}`));
  else if (f === 'quote') out = block.map((l) => (/^>\s?/.test(l) ? l.replace(/^>\s?/, '') : `> ${strip(l)}`));
  else if (f === 'callout') out = block.map((l) => (/^!>\s?/.test(l) ? l.replace(/^!>\s?/, '') : `!> ${strip(l)}`));
  else if (f === 'codeblock') out = ['```', ...block, '```'];
  else if (f === 'hr') out = [...block, '', '---', ''];
  else if (f === 'indent') { indentLines(ta, 1); return; }
  const text = out.join('\n');
  ta.setRangeText(text, ls, le, 'end');
  // keep a selection only if the person had selected text; otherwise leave the caret at the end so typing continues
  if (e > s) ta.setSelectionRange(ls, ls + text.length); else ta.setSelectionRange(ls + text.length, ls + text.length);
  ta.focus();
}
function indentLines(ta, dir) {
  const v = ta.value; const s = ta.selectionStart; const e = ta.selectionEnd;
  const ls = v.lastIndexOf('\n', s - 1) + 1; let le = v.indexOf('\n', e); if (le < 0) le = v.length;
  const lines = v.slice(ls, le).split('\n').map((l) => (dir > 0 ? `  ${l}`.replace(/^(\s*)\d+([.)])\s/, '$11$2 ') : l.replace(/^ {1,2}/, '')));
  const text = lines.join('\n');
  ta.setRangeText(text, ls, le, 'end');
  if (e > s) ta.setSelectionRange(ls, ls + text.length); else ta.setSelectionRange(ls + text.length, ls + text.length);
}
function bindToolbar(view, ta, changed, id) {
  $$('[data-fmt]', view).forEach((b) => { b.onmousedown = (e) => e.preventDefault(); b.onclick = () => { applyFmt(ta, b.dataset.fmt); changed(); }; });
  const col = $('#nt-color', view);
  col.onmousedown = (e) => e.preventDefault();
  col.onclick = () => {
    const el = popover(col, `<div class="menu color-menu">${TEXT_COLORS.map(([n, c]) => `<button data-c="${n}"><i style="background:${c}"></i><span>${n[0].toUpperCase() + n.slice(1)}</span></button>`).join('')}
      <div class="menu-sep"></div><button data-c="big"><span class="md-big">Big text</span></button><button data-c="small"><span class="md-small">Small text</span></button></div>`, { align: 'start' });
    if (!el) return;
    $$('[data-c]', el).forEach((b) => (b.onclick = () => {
      closePopover();
      const s = ta.selectionStart; const e = ta.selectionEnd; const text = ta.value.slice(s, e) || 'text';
      ta.setRangeText(`{${b.dataset.c}|${text}}`, s, e, 'end');
      const start = s + b.dataset.c.length + 2; ta.setSelectionRange(start, start + text.length); ta.focus(); changed();
    }));
  };
  const font = $('#nt-font', view);
  font.onclick = () => {
    const cur = userData().notes.find((z) => z.id === id).font || 'sans';
    const el = popover(font, `<div class="menu">${NOTE_FONTS.map(([k, l]) => `<button data-f="${k}" class="${k === cur ? 'on' : ''}"><span class="font-${k}">${l}</span>${k === cur ? icon('check', 16) : ''}</button>`).join('')}</div>`, { align: 'end' });
    if (!el) return;
    $$('[data-f]', el).forEach((b) => (b.onclick = () => {
      closePopover();
      update((x) => { const y = x.notes.find((z) => z.id === id); y.body = ta.value; y.font = b.dataset.f; y.updatedAt = Date.now(); });
      rerender();
    }));
  };
}

// ---------- the Guide (always available, not a stored note) ----------
const GUIDE = [
  ['Headings', 'Three sizes for titles and sections.', '# Big heading\n## Section\n### Small heading'],
  ['Text styles', 'Select text and use the toolbar, or type the marks yourself.', '**Bold**, *italic*, __underlined__, ~~crossed out~~ and ==highlighted== text.'],
  ['Colours and size', 'Pick A in the toolbar. Six colours, plus big and small text.', '{blue|Blue}, {green|green}, {orange|orange}, {red|red}, {purple|purple} and {gray|gray}.\n{big|Big text} and {small|small text}.'],
  ['Bullet list', 'Start a line with a dash. Enter adds the next bullet; Enter on an empty bullet ends the list.', '- Milk\n- Bread\n- Eggs'],
  ['Numbered list', 'Numbers keep counting when you press Enter.', '1. Warm up\n2. Run 5 km\n3. Stretch'],
  ['Nested lists', 'Press Tab to indent a line, Shift + Tab to bring it back.', '- School\n  - Biology essay\n  - Maths homework\n    1. Page 42\n    2. Page 43\n- Home'],
  ['Checklist', 'Tick boxes right in the preview. Works on its own or inside a list.', '[ ] Pack gym bag\n[x] Buy shoes\n- [ ] Email teacher'],
  ['Quote', 'For a line you want to remember.', '> Small steps every day.'],
  ['Callout', 'A box for something important.', '!> Exam on Friday at 8:00, room 204.'],
  ['Divider', 'Three dashes draw a line between parts.', 'Morning\n\n---\n\nEvening'],
  ['Links and images', 'Paste a web address, or give a link its own text. Images need a web address too.', 'https://example.com\n[My Pinterest](https://pinterest.com)'],
  ['Code', 'Backticks for a word, three backticks for a block.', 'Run `npm start`\n```\nconst done = true;\n```'],
  ['Fonts', 'Choose Sans, Serif or Mono from the toolbar. It applies to the whole note.', ''],
  ['Shortcuts', 'Ctrl + B bold · Ctrl + I italic · Ctrl + U underline · Tab indent · Shift + Tab outdent · Enter continues a list.', ''],
];
function viewGuide(view) {
  view.innerHTML = `
    <section class="page narrow note-page guide-page">
      <div class="note-toolbar"><a class="back-link inline" href="#/notes">${icon('chevL', 16)} Notes</a><span class="muted small">Guide</span></div>
      <div class="note-head"><span class="note-ic">${icon('book', 28)}</span><h1 class="note-title as-h">How to format notes</h1></div>
      <p class="lead">Write on the left, see the result on the right. Use the toolbar above any note, or type the marks yourself.</p>
      <div class="guide-list">
        ${GUIDE.map(([h, p, src]) => `
          <article class="guide-item">
            <header><h2>${h}</h2><p>${p}</p></header>
            ${src ? `<div class="guide-pair"><div class="guide-src"><span>You type</span><pre>${esc(src)}</pre></div><div class="guide-out"><span>You get</span><div class="md">${markdown(src)}</div></div></div>`
              : h === 'Fonts' ? `<div class="guide-fonts">${NOTE_FONTS.map(([k, l]) => `<div class="font-${k}"><b>${l}</b><span>The quick brown fox jumps over the lazy dog.</span></div>`).join('')}</div>` : ''}
          </article>`).join('')}
      </div>
      <div class="guide-end"><button class="btn primary" id="g-new">${icon('plus', 16)} Start a new note</button></div>
    </section>`;
  $('#g-new', view).onclick = () => { const n = createNote(); go('note', n.id); };
  $$('.guide-out input', view).forEach((c) => (c.onclick = (e) => e.preventDefault()));
}

register('notes', (v) => viewNotes(v));
register('note', (v, id) => viewNote(v, id));
