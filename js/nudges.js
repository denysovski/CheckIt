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
  $$('[data-hide]', root).forEach((b) => (b.onclick = () => {
    const key = b.dataset.hide;
    const card = b.closest('.nudge');
    card.style.setProperty('--h', `${card.offsetHeight}px`);
    card.classList.add('leaving');
    update((d) => { d.settings.hiddenNudges = { ...(d.settings.hiddenNudges || {}), [key]: Date.now() }; });
    setTimeout(() => {
      after && after();
      toast('Hidden for a week.', { tone: 'info', icon: 'eyeOff', action: 'Undo', onAction: () => { update((d) => { delete d.settings.hiddenNudges[key]; }); after && after(); } });
    }, 320);
  }));
  $$('[data-hide-all]', root).forEach((b) => (b.onclick = () => {
    update((d) => { d.settings.nudgesOff = true; });
    after && after();
    toast('Nudges are off. Turn them back on in Settings.', { tone: 'info', icon: 'eyeOff', action: 'Undo', onAction: () => { update((d) => { d.settings.nudgesOff = false; }); after && after(); } });
  }));
}
