// Small UI helpers: escaping, toasts, sheets, rings.
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

export function confirmSheet(title, body, okText = 'Smazat', tone = 'danger') {
  return new Promise((resolve) => {
    let ok = false;
    const s = sheet(`
      <div class="sheet-body center">
        <h3 class="sheet-title">${esc(title)}</h3>
        <p class="muted">${esc(body)}</p>
        <div class="row gap">
          <button class="btn ghost grow" data-close>Zrušit</button>
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
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - v)}" stroke-linecap="round" transform="rotate(-90 ${size / 2} ${size / 2})"/>
  </svg>`;
}

export function plural(n, one, few, many) {
  return n === 1 ? one : n >= 2 && n <= 4 ? few : many;
}
