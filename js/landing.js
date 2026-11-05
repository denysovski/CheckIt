// Public landing page (Framer-style: big left-aligned headline + a live, cursor-driven product demo)
// and minimal centered auth screens. GSAP/ScrollTrigger/Lenis load from a CDN; without them the page still works.
import { icon, logoMark } from './icons.js';
import { esc, $, $$, reducedMotion } from './ui.js';
import { login, register, PASSWORD_RULES, passwordOk, usernameError } from './auth.js';

const REPO_URL = 'https://github.com/denysovski/CheckIt';
const LIBS = [
  'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js',
  'https://unpkg.com/lenis@1.1.13/dist/lenis.min.js',
];
let libsPromise = null;
const loadScript = (src) => new Promise((resolve) => {
  if ([...document.scripts].some((s) => s.src === src)) return resolve(true);
  const s = Object.assign(document.createElement('script'), { src, async: false });
  s.onload = () => resolve(true); s.onerror = () => resolve(false);
  document.head.appendChild(s);
});
const loadLibs = () => (libsPromise ||= Promise.all(LIBS.map(loadScript)));

let cleanup = null;
export function destroyLanding() {
  if (cleanup) { cleanup(); cleanup = null; }
  document.documentElement.classList.remove('is-landing', 'lenis', 'lenis-smooth');
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------------ the demo dashboard
const check = '<svg viewBox="0 0 24 24"><path d="M6 12.5l4 4L18 8"/></svg>';
const TASKS = [
  ['tooth', 'Brush teeth', '2× a day', true],
  ['pin', 'Upload Pinterest pins', '120 / 200 pins', false, 'Pinterest'],
  ['interdental', 'Interdental brushes', 'Every day', false],
  ['braces', 'Retainer for the night', 'Every day', false],
];
function demoHTML() {
  return `
  <div class="demo" aria-hidden="true">
    <div class="dm-bar">
      <span class="dm-dots"><i></i><i></i><i></i></span>
      <span class="dm-url">${icon('search', 12)} denysovski.github.io/CheckIt</span>
      <span class="dm-bar-r"><span class="dm-av">D</span></span>
    </div>
    <div class="dm-body">
      <aside class="dm-side">
        <div class="dm-brand"><span class="dm-mark">${logoMark('plain')}</span>Check<b>It</b></div>
        <div class="dm-search">${icon('search', 12)} Search <kbd>Ctrl + K</kbd></div>
        ${[['home', 'Home', 1], ['today', 'Today'], ['calendar', 'Calendar', 0, 'cal'], ['chart', 'Stats'], ['book', 'Notes']].map(([ic, l, on, id]) => `<div class="dm-nav ${on ? 'on' : ''}" ${id ? `data-dm="${id}"` : ''}>${icon(ic, 13)}${l}</div>`).join('')}
        <div class="dm-sec">Channels</div>
        <div class="dm-nav" data-dm="ch-school"><span class="dm-hash">#</span>school</div>
        <div class="dm-nav"><span class="dm-hash">#</span>ideas</div>
        <div class="dm-sec">Notes</div>
        <div class="dm-nav">${icon('doc', 13)}Biology — cells</div>
        <div class="dm-nav">${icon('doc', 13)}Trip packing list</div>
        <div class="dm-user"><span class="dm-av sm">D</span>Danko</div>
      </aside>
      <div class="dm-main">
        <section class="dm-view dm-home on">
          <p class="dm-date">${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h3 class="dm-title">Welcome back,<br><span>Danko</span></h3>
          <div class="dm-tiles">
            <div class="dm-tile c1"><span>Due today</span><b id="dm-due">4</b><small>Left for today</small></div>
            <div class="dm-tile c2"><span>Done today</span><b id="dm-done">1</b><small>of 5 planned</small></div>
            <div class="dm-tile c3"><span>Streak</span><b>12</b><small>Days in a row</small></div>
            <div class="dm-tile c4"><span>This week</span><b>86%</b><small>Success</small></div>
          </div>
          <div class="dm-grid">
            <div class="dm-panel p1">
              <div class="dm-ph">${icon('today', 12)} Today</div>
              <ul class="dm-list" id="dm-list">
                ${TASKS.map(([ic, t, f, done, link], i) => `<li class="${done ? 'done' : ''}" data-row="${i}"><span class="dm-ck">${check}</span><span class="dm-ic">${icon(ic, 13)}</span><span class="dm-tx"><b>${t}</b><small>${f}</small></span>${link ? `<span class="dm-link">${icon('link', 10)} ${link}</span>` : ''}</li>`).join('')}
              </ul>
            </div>
            <div class="dm-panel p2">
              <div class="dm-ph">${icon('hash', 12)} Channels</div>
              <div class="dm-row"><span class="dm-hash">#</span><span><b>school</b><small>Exam on Friday — chapters 4–6</small></span></div>
              <div class="dm-row"><span class="dm-hash">#</span><span><b>ideas</b><small>Make a gym log channel</small></span></div>
              <div class="dm-ph mt">${icon('doc', 12)} Notes</div>
              <div class="dm-row">${icon('doc', 12)}<span><b>Biology — cells</b></span><em>Today</em></div>
            </div>
          </div>
          <div class="dm-composer"><span class="dm-chip">Add task</span><span class="dm-type" id="dm-type"></span><span class="dm-caret"></span><span class="dm-send">${icon('send', 12)}</span></div>
        </section>
        <section class="dm-view dm-channel">
          <h3 class="dm-chtitle"><span class="dm-hash">#</span>school</h3>
          <div class="dm-msgs" id="dm-msgs">
            <div class="dm-sep">Yesterday</div>
            <div class="dm-msg"><em>18:02</em>Exam on Friday — chapters 4–6</div>
            <div class="dm-msg"><em>18:05</em>Ask about the lab report</div>
            <div class="dm-sep">Today</div>
          </div>
          <div class="dm-composer"><span class="dm-type" id="dm-type2"></span><span class="dm-caret"></span><span class="dm-send">${icon('send', 12)}</span></div>
        </section>
        <section class="dm-view dm-cal">
          <h3 class="dm-chtitle">October <span>2026</span></h3>
          <div class="dm-calgrid">${Array.from({ length: 28 }, (_, i) => { const v = [1, 1, .7, 1, 1, .5, 1, 1, 1, .8, 1, 1, .3, 1, 1, 1, .9, 1, .6, 1, 1, 1, 1, .8, 1, 1, .5, .6][i]; return `<span style="--v:${v};--i:${i}"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="14" class="t"/><circle cx="18" cy="18" r="14" class="v"/></svg><em>${i + 1}</em></span>`; }).join('')}</div>
        </section>
      </div>
    </div>
    <div class="dm-cursor" id="dm-cursor"><svg viewBox="0 0 24 24"><path d="M5 3l14 8-6 1.5L10 19z"/></svg><span class="dm-click"></span></div>
  </div>`;
}

// A scripted "someone is using it" loop with a fake cursor.
function runDemo(root, alive) {
  const cur = $('#dm-cursor', root);
  const demo = $('.demo', root);
  const pos = (el, dx = 0.5, dy = 0.5) => {
    const d = demo.getBoundingClientRect(); const r = el.getBoundingClientRect();
    const sx = d.width / demo.offsetWidth || 1; // demo may be scaled
    return [(r.left - d.left + r.width * dx) / sx, (r.top - d.top + r.height * dy) / sx];
  };
  const moveTo = async (el, dx, dy, ms = 900) => {
    if (!el || !alive()) return;
    const [x, y] = pos(el, dx, dy);
    cur.style.transition = `transform ${ms}ms cubic-bezier(.65,0,.35,1)`;
    cur.style.transform = `translate(${x}px, ${y}px)`;
    await sleep(ms + 80);
  };
  const click = async () => { cur.classList.remove('clicking'); void cur.offsetWidth; cur.classList.add('clicking'); await sleep(260); };
  const type = async (el, text) => { el.textContent = ''; for (const ch of text) { if (!alive()) return; el.textContent += ch; await sleep(45 + Math.random() * 55); } };
  const stage = $('.l-stage', root);
  const show = (cls) => { $$('.dm-view', root).forEach((v) => v.classList.toggle('on', v.classList.contains(cls))); if (stage) stage.dataset.scene = cls; };
  const nav = (key) => { $$('.dm-nav', root).forEach((n) => n.classList.remove('on')); const n = key ? $(`[data-dm="${key}"]`, root) : $$('.dm-nav', root)[0]; n && n.classList.add('on'); };
  const reset = () => {
    show('dm-home'); nav(null);
    $$('#dm-list li', root).forEach((li, i) => li.classList.toggle('done', i === 0));
    $$('#dm-list li.added', root).forEach((li) => li.remove());
    $$('.dm-msg.new', root).forEach((m) => m.remove());
    $('#dm-due', root).textContent = '4'; $('#dm-done', root).textContent = '1';
    $('#dm-type', root).textContent = ''; $('#dm-type2', root).textContent = '';
    $$('.dm-calgrid span', root).forEach((s) => s.classList.remove('fill'));
  };
  const tick = (i, done, due) => { $(`[data-row="${i}"]`, root).classList.add('done'); $('#dm-done', root).textContent = done; $('#dm-due', root).textContent = due; };

  (async () => {
    await sleep(2600);
    while (alive()) {
      reset();
      await moveTo($('[data-row="1"] .dm-ck', root), 0.5, 0.5, 1100); await click(); tick(1, '2', '3');
      await sleep(450);
      await moveTo($('[data-row="2"] .dm-ck', root), 0.5, 0.5, 600); await click(); tick(2, '3', '2');
      await sleep(400);
      await moveTo($('.dm-home .dm-composer', root), 0.3, 0.5, 900); await click();
      await type($('#dm-type', root), 'Finish math homework');
      await sleep(250); await moveTo($('.dm-home .dm-send', root), 0.5, 0.5, 500); await click();
      if (!alive()) return;
      const li = document.createElement('li');
      li.className = 'added'; li.innerHTML = `<span class="dm-ck">${check}</span><span class="dm-ic">${icon('star', 13)}</span><span class="dm-tx"><b>Finish math homework</b><small>Every day</small></span>`;
      $('#dm-list', root).appendChild(li); $('#dm-type', root).textContent = ''; $('#dm-due', root).textContent = '3';
      await sleep(1100); if (!alive()) return;
      await moveTo($('[data-dm="ch-school"]', root), 0.4, 0.5, 1000); await click();
      show('dm-channel'); nav('ch-school');
      await sleep(500);
      await moveTo($('.dm-channel .dm-composer', root), 0.3, 0.5, 800); await click();
      await type($('#dm-type2', root), 'Read chapter 5 tonight');
      await sleep(200); if (!alive()) return;
      const m = document.createElement('div'); m.className = 'dm-msg new'; m.innerHTML = '<em>09:14</em>Read chapter 5 tonight';
      $('#dm-msgs', root).appendChild(m); $('#dm-type2', root).textContent = '';
      await sleep(1100); if (!alive()) return;
      await moveTo($('[data-dm="cal"]', root), 0.4, 0.5, 900); await click();
      show('dm-cal'); nav('cal');
      $$('.dm-calgrid span', root).forEach((s, i) => setTimeout(() => s.classList.add('fill'), i * 40));
      await sleep(2600);
      await moveTo($$('.dm-nav', root)[0], 0.4, 0.5, 900); await click();
      await sleep(600);
    }
  })();
}

// ------------------------------------------------------------------ landing
// Scattered, rotated pieces of the real dashboard around the hero.
function floatersHTML() {
  const ck = '<svg viewBox="0 0 24 24"><path d="M6 12.5l4 4L18 8"/></svg>';
  return `
    <div class="floaters" aria-hidden="true">
      <div class="fl fl-1" data-depth="0.6"><div class="fl-tile t-green"><span>Done today</span><b>3</b><small>of 5 planned</small></div></div>
      <div class="fl fl-2" data-depth="0.9"><div class="fl-row done"><span class="fl-ck">${ck}</span><span class="fl-ic">${icon('tooth', 15)}</span><span><b>Brush teeth</b><small>Done at 07:42</small></span></div></div>
      <div class="fl fl-3" data-depth="0.4"><div class="fl-chip"><span>#</span>school <em>4</em></div></div>
      <div class="fl fl-4" data-depth="0.8"><div class="fl-tile t-red"><span>Streak</span><b>12</b><small>Days in a row</small></div></div>
      <div class="fl fl-5" data-depth="0.5"><div class="fl-row"><span class="fl-ck"></span><span class="fl-ic">${icon('pin', 15)}</span><span><b>Upload Pinterest pins</b><small>120 / 200 pins</small></span><span class="fl-link">${icon('link', 11)}</span></div></div>
      <div class="fl fl-6" data-depth="0.7"><div class="fl-ring"><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="19" class="t"/><circle cx="24" cy="24" r="19" class="v"/></svg><b>86%</b></div></div>
      <div class="fl fl-7" data-depth="0.35"><div class="fl-note"><span class="fl-ic">${icon('doc', 14)}</span><span><b>Biology — cells</b><small>School · Today</small></span></div></div>
    </div>`;
}

// Animated "check it" card shown next to the headline: a week fills up, then the dotted check draws.
function checkCardHTML() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return `
    <div class="cc" aria-hidden="true">
      <div class="cc-head"><span>This week</span><b><span class="cc-n">0</span>/7</b></div>
      <div class="cc-week">${days.map((d, i) => `<span class="cc-day" style="--i:${i}"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="14" class="t"/><circle cx="18" cy="18" r="14" class="v"/></svg><em>${d.slice(0, 1)}</em></span>`).join('')}</div>
      <div class="cc-mark">${logoMark('plain', 'cc-dots')}</div>
      <p class="cc-cap"><b>Week complete</b><span>Every day checked.</span></p>
    </div>`;
}

function runCheckCard(root, alive) {
  const cc = $('.cc', root);
  if (!cc) return;
  const n = $('.cc-n', cc);
  const days = $$('.cc-day', cc);
  (async () => {
    await sleep(900);
    while (alive()) {
      cc.classList.remove('done');
      days.forEach((d) => d.classList.remove('on'));
      n.textContent = '0';
      await sleep(500);
      for (let i = 0; i < days.length && alive(); i++) { days[i].classList.add('on'); n.textContent = String(i + 1); await sleep(340); }
      await sleep(250);
      cc.classList.add('done');
      await sleep(3200);
    }
  })();
}

const RESEARCH = [
  ['138', 'studies, 19,951 people', 'Tracking your progress makes you more likely to reach a goal — and it works even better when the progress is written down.', 'Harkin et al., Psychological Bulletin, 2016', 'https://www.apa.org/news/press/releases/2015/10/progress-goals'],
  ['d = .65', 'across 94 tests', 'Deciding when and where you’ll do something has a medium-to-large effect on actually doing it.', 'Gollwitzer & Sheeran, 2006', 'https://kops.uni-konstanz.de/entities/publication/2e749bfb-8533-437c-8203-7e788c910c5f'],
  ['66', 'days, median', 'Repeating a small daily action made it automatic in about two months — anywhere from 18 to 254 days.', 'Lally et al., European Journal of Social Psychology, 2010', 'https://www.thebehavioralscientist.com/articles/how-long-to-form-a-habit'],
];

// Real numbers only: GitHub stars (live), and the visitor's own history if they've used it here.
function ownStats() {
  try {
    const st = JSON.parse(localStorage.getItem('checkit:v1') || 'null');
    if (!st) return null;
    let done = 0; let days = 0;
    Object.values(st.data || {}).forEach((d) => Object.values(d.log || {}).forEach((day) => { const c = Object.keys(day).length; done += c; if (c) days++; }));
    return done ? { done, days } : null;
  } catch { return null; }
}

export function renderLanding({ loggedIn = false, name = '' } = {}) {
  destroyLanding();
  document.documentElement.classList.add('is-landing');
  const app = $('#app');
  app.innerHTML = `
  <div class="landing">
    <header class="l-nav">
      <a class="brand" href="#/" aria-label="Check It"><span class="brand-mark">${logoMark('plain')}</span><span class="brand-word">Check<b>It</b></span></a>
      <nav class="l-links"><a href="#how" data-scroll>How it works</a><a href="#research" data-scroll>Research</a><a href="#privacy" data-scroll>Privacy</a><a href="${REPO_URL}" target="_blank" rel="noopener noreferrer">GitHub</a></nav>
      <div class="l-nav-actions">${loggedIn ? `<a class="btn light small fx" href="#/home">Open dashboard</a>` : `<a class="l-login" href="#/login">Log in</a><a class="btn light small fx" href="#/signup">Get started</a>`}</div>
    </header>

    <section class="l-hero">
      ${floatersHTML()}
      <div class="l-hero-grid">
        <div>
          <h1 class="l-title">
            <span class="ln"><span>Plan your day.</span></span>
            <span class="ln"><span>Check it off.</span></span>
            <span class="ln"><span>Watch it add up.</span></span>
          </h1>
          <div class="l-hero-row">
            <a class="btn blue large fx" href="${loggedIn ? '#/home' : '#/signup'}">${loggedIn ? `Back to dashboard` : 'Get started'}</a>
            <a class="l-aside" href="${REPO_URL}" target="_blank" rel="noopener noreferrer"><b>Open source</b> Runs fully in your browser ${icon('chevR', 14)}</a>
          </div>
        </div>
        ${checkCardHTML()}
      </div>
      <div class="l-stage" id="how">
        <div class="l-glow" aria-hidden="true"><i class="g1"></i><i class="g2"></i><i class="g3"></i></div>
        ${demoHTML()}
      </div>
    </section>

    <section class="l-research" id="research">
      <p class="eyebrow-l rv">Why it works</p>
      <h2 class="l-h2 rv">Writing it down<br><span class="dim">is half the work.</span></h2>
      <div class="r-grid">
        ${RESEARCH.map(([big, unit, text, cite, url], i) => `
          <article class="r-card rv" style="--i:${i}">
            <div class="r-num"><b>${big}</b><span>${unit}</span></div>
            <p>${text}</p>
            <a href="${url}" target="_blank" rel="noopener noreferrer" class="r-cite">${cite} ${icon('external', 12)}</a>
          </article>`).join('')}
      </div>
      <div class="r-live rv">
        <div class="rl-item"><b id="gh-stars">—</b><span>GitHub stars, live</span></div>
        <div class="rl-item"><b>0</b><span>servers storing your data</span></div>
        <div class="rl-item"><b>0</b><span>trackers or ads</span></div>
        <div class="rl-item" id="own-stat"><b>100%</b><span>runs in your browser</span></div>
      </div>
      <p class="r-note rv">Check It has no servers, so it can’t count its users — the numbers above are the real ones.</p>
    </section>

    <section class="l-statement" id="privacy">
      <p class="eyebrow-l rv">Private by design</p>
      <p class="st-text">${'No servers. No tracking. No ads. Your tasks, notes and history live in this browser — nobody sees them but you.'.split(' ').map((w) => `<span>${esc(w)}</span>`).join(' ')}</p>
    </section>

    <section class="l-final">
      <h2 class="l-h2 rv">Start checking it.</h2>
      <a class="btn blue large fx rv" href="${loggedIn ? '#/home' : '#/signup'}">${loggedIn ? 'Back to dashboard' : 'Get started'}</a>
    </section>

    <footer class="l-foot">
      <span class="brand-word small">Check<b>It</b></span>
      <span class="dim small">Open source · made for my own routine, free for yours</span>
      <a href="${REPO_URL}" target="_blank" rel="noopener noreferrer" class="small">GitHub ${icon('external', 13)}</a>
    </footer>
  </div>`;

  const root = app.querySelector('.landing');
  let alive = true;
  let lenis = null;
  const disposers = [];
  cleanup = () => { alive = false; disposers.forEach((f) => f()); };

  $$('[data-scroll]', root).forEach((a) => (a.onclick = (e) => {
    e.preventDefault(); const t = $(a.getAttribute('href'));
    lenis ? lenis.scrollTo(t, { offset: -40 }) : t.scrollIntoView({ behavior: 'smooth' });
  }));
  const nav = $('.l-nav', root);
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 10);
  window.addEventListener('scroll', onScroll, { passive: true });
  disposers.push(() => window.removeEventListener('scroll', onScroll));

  // live, real numbers
  fetch('https://api.github.com/repos/denysovski/CheckIt').then((r) => (r.ok ? r.json() : null)).then((j) => {
    const el = $('#gh-stars', root); if (el && j && typeof j.stargazers_count === 'number') el.textContent = j.stargazers_count.toLocaleString('en-GB');
  }).catch(() => {});
  const own = ownStats();
  if (own) { const el = $('#own-stat', root); el.innerHTML = `<b>${own.done.toLocaleString('en-GB')}</b><span>tasks you’ve checked off here, over ${own.days} ${own.days === 1 ? 'day' : 'days'}</span>`; }

  // parallax for the scattered pieces
  const fls = $$('.fl', root);
  let mx = 0; let my = 0; let raf = 0;
  const onMove = (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; if (!raf) raf = requestAnimationFrame(applyPar); };
  const applyPar = () => { raf = 0; const sy = Math.min(window.scrollY, 900); fls.forEach((f) => { const d = +f.dataset.depth; f.style.translate = `${mx * 40 * d}px ${my * 30 * d - sy * 0.25 * d}px`; }); };
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(applyPar); }, { passive: true });
  disposers.push(() => window.removeEventListener('pointermove', onMove));

  $$('.dm-side > *', root).forEach((el, i) => el.style.setProperty('--k', i));
  $$('.dm-list li', root).forEach((el, i) => el.style.setProperty('--k', i));
  if (reducedMotion()) { root.classList.add('static'); return; }
  runDemo(root, () => alive);
  runCheckCard(root, () => alive);

  loadLibs().then(() => {
    if (!alive) return;
    const { gsap, ScrollTrigger, Lenis } = window;
    if (!gsap || !ScrollTrigger) { root.classList.add('static'); return; }
    gsap.registerPlugin(ScrollTrigger);
    if (Lenis) {
      lenis = new Lenis({ duration: 1.1, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      const raf = (t) => lenis.raf(t * 1000);
      gsap.ticker.add(raf); gsap.ticker.lagSmoothing(0);
      disposers.push(() => { gsap.ticker.remove(raf); lenis.destroy(); });
      document.documentElement.classList.add('lenis');
    }
    const ctx = gsap.context(() => {
      gsap.fromTo('.demo', { rotateX: 9, transformPerspective: 1600 }, { rotateX: 0, ease: 'none', scrollTrigger: { trigger: '.l-stage', start: 'top 85%', end: 'top 20%', scrub: true } });
      gsap.utils.toArray('.rv').forEach((el) => gsap.from(el, { y: 40, opacity: 0, duration: 1, ease: 'expo.out', delay: (+el.style.getPropertyValue('--i') || 0) * 0.06, scrollTrigger: { trigger: el, start: 'top 88%' } }));
      gsap.fromTo('.st-text span', { opacity: 0.14 }, { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: '.l-statement', start: 'top 70%', end: 'bottom 55%', scrub: true } });
    }, root);
    disposers.push(() => { ctx.revert(); ScrollTrigger.getAll().forEach((t) => t.kill()); });
  });
}

// ------------------------------------------------------------------ auth (minimal, centered)
export function renderAuthPage(mode, onDone) {
  destroyLanding();
  const isSignup = mode === 'signup';
  const app = $('#app');
  app.innerHTML = `
    <div class="auth2">
      <div class="auth-bg" aria-hidden="true"><i class="a1"></i><i class="a2"></i><i class="a3"></i><span class="auth-grid"></span></div>
      <a class="back-link" href="#/">${icon('chevL', 16)} Home</a>
      <form class="auth2-card" novalidate>
        <div class="auth2-icon">${logoMark('tile', 'animate')}</div>
        <h1>${isSignup ? 'Sign up for Check It' : 'Log in to Check It'}</h1>
        <div class="auth2-fields">
          <input class="a-in" id="a-user" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="Username" aria-label="Username" required>
          ${isSignup ? '<small class="field-msg" id="u-msg"></small>' : ''}
          <div class="pw"><input class="a-in" id="a-pass" type="password" autocomplete="${isSignup ? 'new-password' : 'current-password'}" placeholder="Password" aria-label="Password" required>
            <button type="button" class="pw-eye" aria-label="Show password" data-eye="a-pass">${icon('eye', 18)}</button></div>
          ${isSignup ? `
          <div class="pw"><input class="a-in" id="a-pass2" type="password" autocomplete="new-password" placeholder="Confirm password" aria-label="Confirm password" required>
            <button type="button" class="pw-eye" aria-label="Show password" data-eye="a-pass2">${icon('eye', 18)}</button></div>
          <small class="field-msg" id="p2-msg"></small>
          <ul class="pw-rules compact">${PASSWORD_RULES.map((r) => `<li data-rule="${r.id}"><span>${icon('check', 11)}</span>${r.label}</li>`).join('')}</ul>` : `
          <label class="remember"><input type="checkbox" id="a-remember" checked><span class="cb">${icon('check', 12)}</span>Remember me</label>`}
        </div>
        <p class="error" id="a-err" role="alert"></p>
        <button class="btn blue large full fx" id="a-submit" type="submit" ${isSignup ? 'disabled' : ''}>${isSignup ? 'Let’s go' : 'Log in'}</button>
        <p class="auth2-switch">${isSignup ? 'Already have an account? <a href="#/login">Log in</a>' : 'New here? <a href="#/signup">Create an account</a>'}</p>
        <p class="auth2-note">${icon('info', 14)} Your account is stored only in this browser.</p>
      </form>
    </div>`;

  const form = $('.auth2-card', app);
  $$('[data-eye]', form).forEach((b) => (b.onclick = () => {
    const inp = $(`#${b.dataset.eye}`, form); const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password'; b.innerHTML = icon(show ? 'eyeOff' : 'eye', 18);
  }));
  const pass = $('#a-pass', form);
  const btn = $('#a-submit', form);
  const validate = () => {
    if (!isSignup) return;
    const pw = pass.value;
    PASSWORD_RULES.forEach((r) => $(`[data-rule="${r.id}"]`, form).classList.toggle('ok', r.test(pw)));
    const u = $('#a-user', form).value;
    const ue = u ? usernameError(u) : '';
    const um = $('#u-msg', form); um.textContent = ue; um.className = `field-msg ${ue ? 'bad' : ''}`;
    const p2 = $('#a-pass2', form).value; const pm = $('#p2-msg', form);
    pm.textContent = !p2 ? '' : p2 === pw ? 'Passwords match' : 'Passwords don’t match';
    pm.className = `field-msg ${!p2 ? '' : p2 === pw ? 'good' : 'bad'}`;
    btn.disabled = !(u && !ue && passwordOk(pw) && p2 === pw);
  };
  form.addEventListener('input', validate);
  setTimeout(() => $('#a-user', form).focus(), 80);
  form.onsubmit = async (e) => {
    e.preventDefault();
    btn.disabled = true;
    try {
      const u = $('#a-user', form).value;
      if (isSignup) await register(u, pass.value, $('#a-pass2', form).value);
      else await login(u, pass.value, $('#a-remember', form).checked);
      onDone(isSignup ? 'register' : 'login');
    } catch (err) {
      $('#a-err', form).textContent = err.message;
      form.classList.add('shake'); setTimeout(() => form.classList.remove('shake'), 400);
      btn.disabled = false;
    }
  };
}
