// A small congratulation window after finishing a task — first one of the day, the middle ones, and the last one.
import { esc, reducedMotion } from './ui.js';
import { logoMark, icon } from './icons.js';

let current = null;
let timer = null;

const pick = (arr, seed) => arr[Math.abs(seed) % arr.length];

function copy({ title, done, total, goalDone }) {
  const seed = title.length + done;
  if (goalDone) return { eyebrow: 'Goal reached', head: 'You finished the whole goal.', body: `“${title}” is complete. It moves to Goals reached.` };
  if (total && done >= total) {
    return { eyebrow: 'Day complete', head: pick(['That’s everything for today.', 'All done. Ring closed.', 'Every task, checked.'], seed), body: `“${title}” was the last one. ${total} of ${total} done.` };
  }
  if (done === 1) {
    return { eyebrow: 'First step today', head: 'Congratulations — your first task today is done.', body: `You checked off “${title}”. ${total > 1 ? `${total - 1} to go.` : ''}` };
  }
  return {
    eyebrow: `${done} of ${total} done`,
    head: pick(['Nice, another one down.', 'Good. Keep the rhythm.', 'Checked. On to the next.', 'Done and dusted.'], seed),
    body: `“${title}” is done. ${total - done} left today.`,
  };
}

export function celebrate(info) {
  const c = copy(info);
  const ratio = info.total ? Math.min(1, info.done / info.total) : 1;
  const R = 26; const C = 2 * Math.PI * R;
  dismiss(true);
  const el = document.createElement('div');
  el.className = `celebrate ${info.total && info.done >= info.total ? 'all' : ''}`;
  el.setAttribute('role', 'status');
  el.innerHTML = `
    <div class="cb-burst" aria-hidden="true">${Array.from({ length: 10 }, (_, i) => `<i style="--a:${i * 36}deg;--d:${i % 2 ? 46 : 58}px"></i>`).join('')}</div>
    <div class="cb-badge" aria-hidden="true">
      <svg viewBox="0 0 64 64" class="cb-ring"><circle cx="32" cy="32" r="${R}" class="t"/><circle cx="32" cy="32" r="${R}" class="v" style="--c:${C};--o:${C * (1 - ratio)}"/></svg>
      <span class="cb-mark">${logoMark('plain', 'animate')}</span>
    </div>
    <div class="cb-text">
      <span class="cb-eyebrow">${esc(c.eyebrow)}</span>
      <b>${esc(c.head)}</b>
      <p>${esc(c.body)}</p>
    </div>
    <button class="icon-btn subtle cb-close" aria-label="Close">${icon('close', 16)}</button>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  el.querySelector('.cb-close').onclick = () => dismiss();
  el.addEventListener('mouseenter', () => clearTimeout(timer));
  el.addEventListener('mouseleave', () => { timer = setTimeout(dismiss, 2200); });
  current = el;
  timer = setTimeout(dismiss, reducedMotion() ? 3000 : 4200);
}

export function dismiss(instant) {
  clearTimeout(timer);
  if (!current) return;
  const el = current; current = null;
  if (instant) { el.remove(); return; }
  el.classList.remove('in');
  el.classList.add('out');
  setTimeout(() => el.remove(), 350);
}
