// Button micro-interactions: a soft light orb that follows the pointer, and a gentle magnetic pull.
const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const motionOff = () => document.documentElement.classList.contains('no-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initFx() {
  if (!finePointer()) return;
  let active = null;
  document.addEventListener('pointermove', (e) => {
    const b = e.target.closest && e.target.closest('.btn, .tile-card, .f-card, .sb-search, .icon-btn');
    if (active && active !== b) release(active);
    if (!b) { active = null; return; }
    active = b;
    const r = b.getBoundingClientRect();
    b.style.setProperty('--mx', `${e.clientX - r.left}px`);
    b.style.setProperty('--my', `${e.clientY - r.top}px`);
    if (b.classList.contains('fx') && !motionOff()) {
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      b.style.transform = `translate(${dx * 5}px, ${dy * 4}px)`;
    }
  }, { passive: true });
  document.addEventListener('pointerleave', () => active && release(active));
  function release(b) { b.style.transform = ''; }
}
