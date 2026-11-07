// Onboarding shown after registration (about 16 seconds) and a short welcome after login.
// Animations use Motion (vendor/motion.js) when it is loaded, otherwise the Web Animations API.
import { icon, logoMark } from './icons.js';
import { esc, reducedMotion } from './ui.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EASE = [0.22, 1, 0.36, 1];

// One animate() for both engines. Returns a promise that resolves when it finishes.
export function anim(el, keyframes, opts = {}) {
  if (!el || (el.length === 0)) return Promise.resolve();
  const M = window.Motion;
  if (M && M.animate) return M.animate(el, keyframes, { duration: 0.5, ease: EASE, ...opts }).finished || Promise.resolve();
  const list = el.length != null && !(el instanceof Element) ? [...el] : [el];
  const frames = {};
  Object.entries(keyframes).forEach(([k, v]) => {
    const arr = Array.isArray(v) ? v : [null, v];
    const T = { y: (x) => `translateY(${typeof x === 'number' ? x + 'px' : x})`, x: (x) => `translateX(${typeof x === 'number' ? x + 'px' : x})`, scale: (x) => `scale(${x})`, scaleY: (x) => `scaleY(${x})` };
    const prop = T[k] ? 'transform' : k;
    frames[prop] = arr.map((x) => (T[k] ? T[k](x) : x));
    if (arr[0] === null) frames[prop].shift();
  });
  const d = (opts.duration ?? 0.5) * 1000;
  return Promise.all(list.map((n, i) => {
    const delay = typeof opts.delay === 'function' ? opts.delay(i, list.length) * 1000 : (opts.delay || 0) * 1000;
    return n.animate(frames, { duration: d, delay, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' }).finished.catch(() => {});
  }));
}
const stagger = (s, from = 0) => (window.Motion && window.Motion.stagger ? window.Motion.stagger(s, { startDelay: from }) : (i) => from + i * s);

const ck = '<svg viewBox="0 0 24 24"><path d="M6 12.5l4 4L18 8"/></svg>';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const SCENES = [
  {
    id: 'hello', dur: 2600,
    title: (n) => `Hi${n ? `, ${esc(n)}` : ''}.`, sub: 'Let’s set up your week. It takes a minute.',
    art: () => `<div class="ob-logo">${logoMark('plain')}</div>`,
    play: (el) => anim(el.querySelectorAll('.ob-logo .ld'), { scale: [0, 1], opacity: [0, 1] }, { duration: 0.45, delay: stagger(0.05, 0.15) }),
  },
  {
    id: 'list', dur: 3400,
    title: () => 'Tick it off.', sub: 'Done tasks turn blue and stay where they are.',
    art: () => `<div class="ob-card ob-list">${[['tooth', 'Brush teeth', '2× a day'], ['pin', 'Upload Pinterest pins', '120 / 200'], ['interdental', 'Interdental brushes', 'Today'], ['gamepad', 'Marvel Rivals clips', '3× a week']]
      .map(([ic, t, f]) => `<div class="ob-row"><span class="ob-ck">${ck}</span><span class="ob-ic">${icon(ic, 22)}</span><span class="ob-tx"><b>${t}</b><small>${f}</small></span></div>`).join('')}</div>`,
    play: async (el) => {
      const rows = [...el.querySelectorAll('.ob-row')];
      await sleep(500);
      for (const r of rows.slice(0, 3)) { r.classList.add('on'); anim(r.querySelector('.ob-ck'), { scale: [0.6, 1.12, 1] }, { duration: 0.35 }); await sleep(420); }
    },
  },
  {
    id: 'plan', dur: 3400,
    title: () => 'Plan each day.', sub: 'Drag tasks into days and pick a time.',
    art: () => `<div class="ob-card ob-plan">${DAYS.map((d, i) => `<div class="ob-col"><span>${d}</span>${i % 2 === 0 ? `<i class="ob-chip">${icon('tooth', 14)}<b>07:30</b></i>` : ''}${[1, 4].includes(i) ? `<i class="ob-chip c2">${icon('pin', 14)}<b>18:00</b></i>` : ''}${i === 5 ? `<i class="ob-chip c3">${icon('gamepad', 14)}<b>16:00</b></i>` : ''}</div>`).join('')}</div>`,
    play: (el) => anim(el.querySelectorAll('.ob-chip'), { y: [-26, 0], opacity: [0, 1], scale: [0.9, 1] }, { duration: 0.4, delay: stagger(0.11, 0.35) }),
  },
  {
    id: 'stats', dur: 3400,
    title: () => 'See your week.', sub: 'Streaks, best days and a recap every Monday.',
    art: () => `<div class="ob-card ob-stats"><div class="ob-kpi"><b>86<small>%</small></b><span>done this week</span></div><div class="ob-bars">${[0.7, 0.9, 0.55, 1, 0.8, 0.4, 0.95].map((v, i) => `<div class="ob-bar"><i style="--v:${v}"></i><span>${DAYS[i][0]}</span></div>`).join('')}</div></div>`,
    play: (el) => {
      return anim(el.querySelectorAll('.ob-bar i'), { scaleY: [0, 1] }, { duration: 0.6, delay: stagger(0.06, 0.25) });
    },
  },
  {
    id: 'remind', dur: 3000,
    title: () => 'Get a nudge.', sub: 'A reminder at the time you set. Turn it off any time.',
    art: () => `<div class="ob-card ob-remind"><div class="ob-note"><span class="ob-app">${logoMark('tile')}</span><div><b>Brush teeth at 21:30</b><small>2 tasks left today</small></div><em>now</em></div></div>`,
    play: (el) => anim(el.querySelector('.ob-note'), { y: [-40, 0], opacity: [0, 1] }, { duration: 0.5, delay: 0.35 }),
  },
  {
    id: 'end', dur: 0,
    title: () => 'You’re ready.', sub: 'Everything stays in this browser.',
    art: () => `<div class="ob-logo done">${logoMark('plain')}</div>`,
    play: (el) => anim(el.querySelectorAll('.ob-logo .ld'), { scale: [0, 1], opacity: [0, 1] }, { duration: 0.4, delay: stagger(0.04, 0.1) }),
  },
];

export function playIntro({ name = '' } = {}) {
  return new Promise((resolve) => {
    const root = document.createElement('div');
    root.className = 'ob';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', 'Welcome to Check It');
    root.innerHTML = `
      <div class="ob-top">
        <div class="ob-progress">${SCENES.map(() => '<span><i></i></span>').join('')}</div>
        <button class="ob-skip" type="button">Skip</button>
      </div>
      <div class="ob-stage" aria-live="polite"></div>
      <div class="ob-bottom">
        <button class="ob-next" type="button"><span class="ob-next-dot">${icon('check', 18)}</span><span class="ob-next-l">Continue</span><span class="ob-chev">${icon('chevR', 16)}${icon('chevR', 16)}${icon('chevR', 16)}</span></button>
      </div>`;
    document.body.appendChild(root);
    document.documentElement.classList.add('scroll-locked');
    const stage = root.querySelector('.ob-stage');
    const bars = [...root.querySelectorAll('.ob-progress span')];
    const next = root.querySelector('.ob-next');
    let i = -1; let done = false; let timer = 0; let busy = false;

    const finish = async () => {
      if (done) return; done = true; clearTimeout(timer);
      await anim(root, { opacity: [1, 0] }, { duration: 0.35 });
      root.remove(); document.documentElement.classList.remove('scroll-locked'); document.removeEventListener('keydown', onKey); resolve();
    };
    const go = async (to) => {
      if (busy || done || to < 0 || to >= SCENES.length) return;
      busy = true; clearTimeout(timer);
      const old = stage.firstElementChild;
      if (old) { await anim(old, { opacity: [1, 0], y: [0, -16] }, { duration: 0.22, ease: 'ease-in' }); old.remove(); }
      i = to;
      const sc = SCENES[i];
      const el = document.createElement('section');
      el.className = `ob-scene ob-${sc.id}`;
      el.innerHTML = `<div class="ob-art">${sc.art()}</div><div class="ob-copy"><h1>${sc.title(name)}</h1><p>${sc.sub}</p></div>`;
      el.style.opacity = '0';
      stage.appendChild(el);
      bars.forEach((b, j) => { b.classList.toggle('done', j < i); b.classList.toggle('run', j === i); b.style.setProperty('--dur', `${sc.dur || 600}ms`); });
      const last = i === SCENES.length - 1;
      next.querySelector('.ob-next-l').textContent = last ? 'Get started' : 'Continue';
      next.classList.toggle('last', last);
      // Art and text arrive together, in one motion.
      el.style.opacity = '';
      await anim(el, { opacity: [0, 1], y: [24, 0] }, { duration: 0.45 });
      busy = false;
      sc.play(el);
      if (sc.dur) timer = setTimeout(() => go(i + 1), sc.dur);
    };
    next.onclick = () => (i === SCENES.length - 1 ? finish() : go(i + 1));
    root.querySelector('.ob-skip').onclick = finish;
    const onKey = (e) => { if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); next.click(); } else if (e.key === 'ArrowLeft') go(i - 1); else if (e.key === 'Escape') finish(); };
    document.addEventListener('keydown', onKey);
    if (reducedMotion()) root.classList.add('reduced');
    go(0);
    next.focus({ preventScroll: true });
  });
}

// Short welcome after login
export function playWelcome(name) {
  return new Promise((resolve) => {
    const root = document.createElement('div');
    root.className = 'ob welcome';
    root.innerHTML = `<div class="ob-stage"><section class="ob-scene"><div class="ob-art"><div class="ob-logo">${logoMark('plain')}</div></div><div class="ob-copy"><h1>Welcome back${name ? `, ${esc(name)}` : ''}.</h1></div></section></div>`;
    document.body.appendChild(root);
    const sc = root.querySelector('.ob-scene');
    anim(sc, { opacity: [0, 1], y: [20, 0] }, { duration: 0.45 });
    anim(root.querySelectorAll('.ld'), { scale: [0, 1], opacity: [0, 1] }, { duration: 0.4, delay: stagger(0.04, 0.1) });
    const end = async () => { root.onclick = null; await anim(root, { opacity: [1, 0] }, { duration: 0.3 }); root.remove(); resolve(); };
    root.onclick = end;
    setTimeout(end, reducedMotion() ? 500 : 1500);
  });
}
