// Lenis smooth scrolling for the whole page (landing and dashboard).
// Inner scroll areas (sheets, palette, sidebar, planner strips…) keep native scrolling.
import { reducedMotion } from './ui.js';

let lenis = null;
const NATIVE = '.sheet-wrap, .palette, .pal, .popover, .menu, [data-lenis-prevent], .sb-mid, .pl-week, .pl-lib-list, .pl-pick, .icon-grid, .tp-col, .lx-tilt';

export function initSmooth() {
  if (lenis || !window.Lenis) return;
  if (reducedMotion()) return;
  lenis = new window.Lenis({
    lerp: 0.1,
    smoothWheel: true,
    wheelMultiplier: 1,
    prevent: (node) => !!(node && node.closest && node.closest(NATIVE)),
  });
  const raf = (t) => { lenis && lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
  window.__lenis = lenis;
}

export function stopSmooth(on) { if (lenis) (on ? lenis.stop() : lenis.start()); }

export function toTop() {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
  else window.scrollTo(0, 0);
}

export function scrollToEl(el) {
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: -90, duration: 1.1 });
  else el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' });
}
