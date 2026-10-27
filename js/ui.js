// Small UI helpers: escaping, toasts, sheets, rings.
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('no-motion');

export function toast(text, { action, onAction, tone = '' } = {}) {
  const root = $('#toast-root');
  const el = document.createElement('div');
  el.className = `toast ${tone}`;
  el.innerHTML = `<span>${esc(text)}</span>${action ? `<button class="toast-btn">${esc(action)}</button>` : ''}`;
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  const close = () => { el.classList.remove('in'); setTimeout(() => el.remove(), 300); };
  if (action) el.querySelector('button').onclick = () => { onAction && onAction(); close(); };
  setTimeout(close, action ? 5000 : 2600);
}

// Modal sheet. Returns { el, close }.
export function sheet(html, { onClose, wide = false } = {}) {
  const root = $('#sheet-root');
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="sheet-backdrop"></div><div class="sheet ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div>`;
  root.appendChild(wrap);
  const prevFocus = document.activeElement;
  requestAnimationFrame(() => wrap.classList.add('in'));
  const close = () => {
    wrap.classList.remove('in');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => { wrap.remove(); prevFocus && prevFocus.focus && prevFocus.focus(); }, 320);
    onClose && onClose();
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  wrap.querySelector('.sheet-backdrop').onclick = close;
  $$('[data-close]', wrap).forEach((b) => (b.onclick = close));
  setTimeout(() => { const f = wrap.querySelector('input, button.primary, button'); f && f.focus({ preventScroll: true }); }, 60);
  return { el: wrap.querySelector('.sheet'), close };
}

export function confirmSheet(title, body, okText = 'Delete', tone = 'danger') {
  return new Promise((resolve) => {
    let ok = false;
    const s = sheet(`
      <div class="sheet-body center">
        <h3 class="sheet-title">${esc(title)}</h3>
        <p class="muted">${esc(body)}</p>
        <div class="row gap">
          <button class="btn ghost grow" data-close>Cancel</button>
          <button class="btn ${tone} grow" id="cf-ok">${esc(okText)}</button>
        </div>
      </div>`, { onClose: () => resolve(ok) });
    s.el.querySelector('#cf-ok').onclick = () => { ok = true; s.close(); };
  });
}

// Activity-style ring (0..1)
export function ring(ratio, size = 40, stroke = 4, cls = '') {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = ratio == null ? 0 : Math.max(0, Math.min(1, ratio));
  return `<svg class="ring ${cls}" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}" class="ring-track"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}" class="ring-val"
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - v)}" style="--c:${c}" stroke-linecap="round" transform="rotate(-90 ${size / 2} ${size / 2})"/>
  </svg>`;
}

// Count numbers up from 0 for elements with data-count="<n>".
export function countUp(root = document) {
  $$('[data-count]', root).forEach((el) => {
    const to = +el.dataset.count;
    if (reducedMotion() || !to) { el.textContent = to; return; }
    const dur = 900; const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * e);
      if (p < 1) requestAnimationFrame(step);
    };
    el.textContent = '0';
    requestAnimationFrame(step);
  });
}

// Stagger fade-in for children (sets --i).
export function stagger(root, sel = '.list > .task, .insight, .kpi, .stat-list li, .g-row') {
  $$(sel, root).forEach((el, i) => el.style.setProperty('--i', Math.min(i, 14)));
}

// ---------- popovers (menus, pickers) ----------
let openPop = null;
export function closePopover() {
  if (!openPop) return;
  const p = openPop; openPop = null;
  p.el.classList.remove('in');
  p.anchor && p.anchor.setAttribute('aria-expanded', 'false');
  setTimeout(() => p.el.remove(), 180);
  p.onClose && p.onClose();
}
document.addEventListener('mousedown', (e) => { if (openPop && !openPop.el.contains(e.target) && !openPop.anchor.contains(e.target)) closePopover(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && openPop) { const a = openPop.anchor; closePopover(); a && a.focus(); } });
window.addEventListener('resize', () => closePopover());
window.addEventListener('hashchange', () => closePopover());
window.addEventListener('scroll', () => closePopover(), { passive: true });

export function isPopoverFor(anchor) { return openPop && openPop.anchor === anchor; }

export function popover(anchor, html, { align = 'end', cls = '', onClose } = {}) {
  if (openPop && openPop.anchor === anchor) { closePopover(); return null; }
  closePopover();
  const el = document.createElement('div');
  el.className = `popover ${cls}`;
  el.innerHTML = html;
  document.body.appendChild(el);
  const r = anchor.getBoundingClientRect();
  const w = el.offsetWidth; const h = el.offsetHeight;
  let top = r.bottom + 8;
  if (top + h > innerHeight - 12) top = Math.max(12, r.top - h - 8);
  let left = align === 'start' ? r.left : align === 'center' ? r.left + r.width / 2 - w / 2 : r.right - w;
  left = Math.max(12, Math.min(left, innerWidth - w - 12));
  el.style.top = `${top}px`;
  el.style.left = `${left}px`;
  el.style.transformOrigin = `${r.left + r.width / 2 - left}px ${top > r.top ? 0 : h}px`;
  anchor.setAttribute('aria-expanded', 'true');
  requestAnimationFrame(() => el.classList.add('in'));
  openPop = { el, anchor, onClose };
  const f = el.querySelector('[autofocus], button:not([disabled]), a');
  f && f.focus({ preventScroll: true });
  return el;
}

// Custom time picker. Resolves via onPick("HH:MM").
export function timePicker(anchor, value, onPick) {
  const [h0, m0] = (value || '20:00').split(':').map(Number);
  let h = h0; let m = m0 - (m0 % 5);
  const col = (n, cur, key, stepN = 1) => Array.from({ length: n / stepN }, (_, i) => i * stepN)
    .map((v) => `<button type="button" data-${key}="${v}" class="${v === cur ? 'on' : ''}">${String(v).padStart(2, '0')}</button>`).join('');
  const el = popover(anchor, `
    <div class="tp">
      <div class="tp-head"><span>Reminder time</span><b id="tp-val">${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}</b></div>
      <div class="tp-cols"><div class="tp-col" data-col="h">${col(24, h, 'h')}</div><div class="tp-col" data-col="m">${col(60, m, 'm', 5)}</div></div>
      <button type="button" class="btn primary small full" id="tp-ok">Set time</button>
    </div>`, { cls: 'pop-time' });
  if (!el) return;
  const upd = () => {
    $('#tp-val', el).textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    $$('[data-h]', el).forEach((b) => b.classList.toggle('on', +b.dataset.h === h));
    $$('[data-m]', el).forEach((b) => b.classList.toggle('on', +b.dataset.m === m));
  };
  $$('[data-h]', el).forEach((b) => (b.onclick = () => { h = +b.dataset.h; upd(); }));
  $$('[data-m]', el).forEach((b) => (b.onclick = () => { m = +b.dataset.m; upd(); }));
  $$('.tp-col', el).forEach((c) => { const on = $('.on', c); if (on) c.scrollTop = on.offsetTop - c.clientHeight / 2 + on.offsetHeight / 2; });
  $('#tp-ok', el).onclick = () => { closePopover(); onPick(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`); };
}
