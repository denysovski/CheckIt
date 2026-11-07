// Nudges as stacked, dismissable info cards. Hidden ones stay hidden for 7 days;
// "Hide all" turns nudges off entirely (can be turned back on in Settings).
import { icon } from './icons.js';
import { esc, $$, toast } from './ui.js';
import { userData, update } from './store.js';
import { insights } from './schedule.js';

const WEEK = 7 * 86400000;

export function visibleNudges(d = userData(), extra = []) {
  const s = d.settings || {};
  if (s.nudgesOff) return [];
  const hidden = s.hiddenNudges || {};
  const now = Date.now();
  return [...extra, ...insights(d)].filter((n) => !(hidden[n.key] && now - hidden[n.key] < WEEK));
}

const ICON = { good: 'arrowUp', info: 'info', warn: 'flag', bad: 'flag', journal: 'pen', weather: 'sun' };

export function nudgeStackHTML(list, { limit = 6, compact = false } = {}) {
  if (!list.length) return '';
  const shown = list.slice(0, limit);
  return `
    <div class="nudges ${compact ? 'compact' : ''}" role="region" aria-label="Nudges">
      ${shown.map((n, i) => `
        <div class="nudge gx tone-${n.tone}" data-key="${esc(n.key)}" style="--i:${i}">
          <span class="nudge-ic">${icon(n.icon || ICON[n.tone] || 'info', 16)}</span>
          <div class="nudge-txt"><b>${esc(n.title)}</b>${n.body ? `<span>${esc(n.body)}</span>` : ''}</div>
          ${n.action ? `<a class="nudge-act" href="${esc(n.action.href)}">${esc(n.action.label)}</a>` : ''}
          <button class="nudge-x" data-hide="${esc(n.key)}" aria-label="Hide this nudge" title="Hide for a week">${icon('close', 14)}</button>
        </div>`).join('')}
      <div class="nudges-foot">
        ${list.length > limit ? `<span class="muted small">+${list.length - limit} more</span>` : '<span></span>'}
        <button class="btn text small" data-hide-all>Hide all nudges</button>
      </div>
    </div>`;
}

export function bindNudges(root, after) {
  $$('[data-hide]', root).forEach((b) => (b.onclick = async () => {
    const key = b.dataset.hide;
    const card = b.closest('.nudge');
    const stack = card.closest('.nudges');
    const last = stack && stack.querySelectorAll('.nudge:not(.gone)').length === 1;
    card.classList.add('gone');
    update((d) => { d.settings.hiddenNudges = { ...(d.settings.hiddenNudges || {}), [key]: Date.now() }; });
    // Fade the message out slowly, then close its space. If it was the last one, the whole
    // section (its header included) folds away the same way. No page re-render, so no jump.
    if (last) {
      const head = stack.previousElementSibling && stack.previousElementSibling.classList.contains('section-head') ? stack.previousElementSibling : null;
      await Promise.all([collapse(stack), head ? collapse(head) : null]);
      stack.remove(); head && head.remove();
    } else {
      await collapse(card);
      card.remove();
    }
    toast('Hidden for a week.', { tone: 'info', icon: 'eyeOff', action: 'Undo', onAction: () => { update((d) => { delete d.settings.hiddenNudges[key]; }); after && after(); } });
  }));
  $$('[data-hide-all]', root).forEach((b) => (b.onclick = () => {
    update((d) => { d.settings.nudgesOff = true; });
    after && after();
    toast('Nudges are off. Turn them back on in Settings.', { tone: 'info', icon: 'eyeOff', action: 'Undo', onAction: () => { update((d) => { d.settings.nudgesOff = false; }); after && after(); } });
  }));
}

// Fade an element out, then smoothly close the space it took. Inline !important wins over stylesheet rules.
export function collapse(el, { fade = 450, close = 500 } = {}) {
  return new Promise((resolve) => {
    if (!el) { resolve(); return; }
    const st = (p, v) => el.style.setProperty(p, v, 'important');
    st('transition', `opacity ${fade}ms cubic-bezier(.4,0,.2,1), transform ${fade}ms cubic-bezier(.4,0,.2,1)`);
    st('opacity', '0'); st('transform', 'translateY(-4px) scale(.985)');
    setTimeout(() => {
      const cs = getComputedStyle(el);
      st('box-sizing', 'border-box'); st('overflow', 'hidden'); st('min-height', '0px'); st('max-height', 'none');
      st('height', `${el.offsetHeight}px`);
      void el.offsetHeight;
      const e = 'cubic-bezier(.65,0,.35,1)';
      st('transition', `height ${close}ms ${e}, padding ${close}ms ${e}, margin ${close}ms ${e}`);
      st('height', '0px'); st('padding-top', '0px'); st('padding-bottom', '0px'); st('margin-top', '0px');
      // pull up the flex/grid gap of the parent as well
      const gap = parseFloat(getComputedStyle(el.parentElement).rowGap) || 0;
      st('margin-bottom', `${-gap + (parseFloat(cs.marginBottom) > 0 ? 0 : 0)}px`);
      setTimeout(resolve, close + 20);
    }, fade - 80);
  });
}
