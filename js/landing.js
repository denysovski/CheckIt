// Public landing page (GSAP + ScrollTrigger + Lenis smooth scroll) and the auth screens.
// Libraries load from a CDN; if they can't load, the page still renders fully, just without motion.
import { icon, logoMark } from './icons.js';
import { esc, $, $$, reducedMotion } from './ui.js';
import { login, register, PASSWORD_RULES, passwordOk, usernameError, MIN_USERNAME } from './auth.js';

const REPO_URL = 'https://github.com/denysovski/CheckIt';
const LIBS = [
  'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js',
  'https://unpkg.com/lenis@1.1.13/dist/lenis.min.js',
];

let libsPromise = null;
function loadScript(src) {
  return new Promise((resolve) => {
    if ([...document.scripts].some((s) => s.src === src)) return resolve(true);
    const s = document.createElement('script');
    s.src = src; s.async = false;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}
function loadLibs() {
  if (!libsPromise) libsPromise = Promise.all(LIBS.map(loadScript));
  return libsPromise;
}

let cleanup = null;
export function destroyLanding() {
  if (cleanup) { cleanup(); cleanup = null; }
  document.documentElement.classList.remove('is-landing', 'lenis', 'lenis-smooth');
}

const split = (text) => text.split(' ').map((w) => `<span class="w"><span>${esc(w)}</span></span>`).join(' ');

const TASKS = [
  ['tooth', 'Brush teeth', '2× a day'],
  ['pin', 'Upload Pinterest pins', '120 / 200 pins'],
  ['gamepad', 'Download Marvel Rivals clips', '3× a week'],
  ['interdental', 'Interdental brushes', 'Every day'],
  ['braces', 'Retainer for the night', 'Every day'],
];
const CHIPS = ['Brush teeth', 'Retainer for the night', 'Pinterest pins', 'Drink water', 'Read 20 minutes', 'Interdental brushes', 'Workout', 'Marvel Rivals clips', 'Stretch', 'Inbox zero', 'Vitamins', 'Walk 8k steps'];

export function renderLanding() {
  destroyLanding();
  document.documentElement.classList.add('is-landing');
  const app = $('#app');
  app.innerHTML = `
  <div class="landing">
    <header class="l-nav">
      <a class="brand" href="#/" aria-label="Check It">
        <span class="brand-mark">${logoMark('plain')}</span>
        <span class="brand-word">Check<b>It</b></span>
      </a>
      <nav class="l-nav-actions">
        <a class="btn text" href="#/login">Log in</a>
        <a class="btn primary small" href="#/signup">Create account</a>
      </nav>
    </header>

    <section class="l-hero">
      <div class="l-hero-bg" aria-hidden="true"><i></i><i></i></div>
      <p class="l-eyebrow reveal">Open source · Runs in your browser</p>
      <h1 class="l-title">${split('Small things.')}<br><span class="soft">${split('Every single day.')}</span></h1>
      <p class="l-lead reveal">A calm checklist for the things you keep forgetting — teeth, retainer, uploads, clips. Set how often, tick it off, see the truth.</p>
      <div class="l-cta reveal">
        <a class="btn primary large" href="#/signup">Get started — it’s free</a>
        <a class="btn ghost large" href="#features">See how it works</a>
      </div>
      <div class="l-device" aria-hidden="true">
        <div class="ld-top"><div><small>Tuesday, October 27</small><b>Good morning.</b></div><div class="ld-ring"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="27" class="t"/><circle cx="32" cy="32" r="27" class="v"/></svg><span>60%</span></div></div>
        <ul>${TASKS.map(([ic, t, f], i) => `
          <li class="${i < 3 ? 'done' : ''}" style="--i:${i}"><span class="lc"><svg viewBox="0 0 24 24"><path d="M6 12.5l4 4L18 8"/></svg></span><span class="li">${icon(ic, 18)}</span><span class="lt"><b>${t}</b><small>${f}</small></span></li>`).join('')}
        </ul>
      </div>
    </section>

    <section class="l-marquee" aria-hidden="true">
      <div class="mq-track">${[...CHIPS, ...CHIPS].map((c, i) => `<span class="mq-chip ${i % 3 === 0 ? 'on' : ''}"><i>${i % 3 === 0 ? '<svg viewBox="0 0 24 24"><path d="M6 12.5l4 4L18 8"/></svg>' : ''}</i>${c}</span>`).join('')}</div>
    </section>

    <section class="l-pin" id="features">
      <div class="lp-inner">
        <div class="lp-steps">
          ${[['01', 'Add what matters.', 'Type it, hit Enter. A logo or a symbol, a link to Pinterest or Meta Business — done.'],
            ['02', 'Set the rhythm.', 'Every day, 3× a week, only on Mondays. Twice a day for teeth.'],
            ['03', 'Close the ring.', 'Tick things off. Watch today’s ring fill. That’s the whole game.']]
            .map(([n, h, p], i) => `<div class="lp-step ${i === 0 ? 'on' : ''}" data-step="${i}"><span>${n}</span><h2>${h}</h2><p>${p}</p></div>`).join('')}
        </div>
        <div class="lp-visual" aria-hidden="true">
          <div class="lp-card">
            ${TASKS.slice(0, 4).map(([ic, t, f], i) => `<div class="lp-row" data-row="${i}"><span class="lc"><svg viewBox="0 0 24 24"><path d="M6 12.5l4 4L18 8"/></svg></span><span class="li">${icon(ic, 18)}</span><span class="lt"><b>${t}</b><small>${f}</small></span>${i === 1 ? `<span class="lp-link">${icon('link', 14)} Pinterest</span>` : ''}</div>`).join('')}
            <div class="lp-freq">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => `<span data-day="${i}">${d}</span>`).join('')}</div>
            <div class="lp-big-ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" class="t"/><circle cx="60" cy="60" r="50" class="v"/></svg><b><span id="lp-pct">0</span>%</b></div>
          </div>
        </div>
      </div>
    </section>

    <section class="l-bento">
      <h2 class="l-h2 reveal">Everything you need.<br><span class="soft">Nothing you don’t.</span></h2>
      <div class="bento">
        <article class="bn bn-cal reveal">
          <h3>A calendar of rings</h3><p>Look back and see exactly which days you showed up.</p>
          <div class="bn-cal-grid">${Array.from({ length: 21 }, (_, i) => { const v = [1, 1, .7, 1, .4, 1, 1, 1, .8, 1, 1, .3, 1, 1, 1, .9, 1, .6, 1, 1, 1][i]; return `<span style="--v:${v};--i:${i}"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="14" class="t"/><circle cx="18" cy="18" r="14" class="v"/></svg></span>`; }).join('')}</div>
        </article>
        <article class="bn bn-nudge reveal">
          <h3>Honest nudges</h3><p>It tells you what you skip the most.</p>
          <div class="bn-bubble"><span>${icon('flag', 16)}</span><div><b>Hey, you skipped the retainer 4×.</b><small>You need to work on this one.</small></div></div>
        </article>
        <article class="bn bn-notify reveal">
          <h3>Reminds you on start</h3><p>Open the browser, get a list of what’s left.</p>
          <div class="bn-note"><span class="bn-app">${logoMark('tile')}</span><div><b>You have 3 unfinished tasks</b><small>Brush teeth, Retainer…</small></div></div>
        </article>
        <article class="bn bn-stats reveal">
          <h3>Stats that matter</h3><p>Streaks, success rate, your weakest day.</p>
          <div class="bn-bars">${[.7, .9, .5, 1, .8, .35, .95].map((v, i) => `<i style="--v:${v};--i:${i}" class="${v < .5 ? 'low' : ''}"></i>`).join('')}</div>
        </article>
      </div>
    </section>

    <section class="l-statement">
      <p class="st-text">${'Everything stays in your browser. No servers, no tracking, no ads. Nobody sees your list but you.'.split(' ').map((w) => `<span>${esc(w)}</span>`).join(' ')}</p>
    </section>

    <section class="l-final">
      <div class="lf-mark">${logoMark('tile', 'final-dots')}</div>
      <h2 class="l-h2 reveal">Start checking it.</h2>
      <p class="l-lead reveal">Free and open source. Made for my own routine — use it for yours.</p>
      <div class="l-cta reveal">
        <a class="btn primary large" href="#/signup">Create account</a>
        <a class="btn ghost large" href="#/login">Log in</a>
      </div>
    </section>

    <footer class="l-foot">
      <span class="brand-word small">Check<b>It</b></span>
      <span class="muted small">Open source · data stored locally in your browser</span>
      <a href="${REPO_URL}" target="_blank" rel="noopener noreferrer" class="small">GitHub ${icon('external', 14)}</a>
    </footer>
  </div>`;

  // smooth anchor for "See how it works"
  const how = $('a[href="#features"]', app);
  let lenis = null;
  how.onclick = (e) => { e.preventDefault(); const t = $('#features'); lenis ? lenis.scrollTo(t, { offset: -20 }) : t.scrollIntoView({ behavior: 'smooth' }); };

  const nav = $('.l-nav', app);
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 10);
  window.addEventListener('scroll', onScroll, { passive: true });
  let alive = true;
  const disposers = [() => window.removeEventListener('scroll', onScroll)];
  cleanup = () => { alive = false; disposers.forEach((f) => f()); };

  if (reducedMotion()) { app.querySelector('.landing').classList.add('static'); return; }

  loadLibs().then(() => {
    if (!alive) return;
    const { gsap, ScrollTrigger, Lenis } = window;
    if (!gsap || !ScrollTrigger) { app.querySelector('.landing').classList.add('static'); return; }
    gsap.registerPlugin(ScrollTrigger);

    if (Lenis) {
      lenis = new Lenis({ duration: 1.15, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      const raf = (t) => lenis.raf(t * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
      disposers.push(() => { gsap.ticker.remove(raf); lenis.destroy(); });
    }

    const ctx = gsap.context(() => {
      // Hero
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      tl.from('.l-nav', { y: -30, opacity: 0, duration: 1 })
        .from('.l-title .w > span', { yPercent: 110, rotate: 4, duration: 1.2, stagger: 0.08 }, 0.1)
        .from('.l-hero .reveal', { y: 24, opacity: 0, filter: 'blur(8px)', duration: 1, stagger: 0.12 }, 0.5)
        .from('.l-hero-bg i', { scale: 0.4, opacity: 0, duration: 2.2, stagger: 0.2, ease: 'power3.out' }, 0)
        .from('.l-device', { y: 120, opacity: 0, rotateX: 18, duration: 1.6 }, 0.6)
        .from('.l-device li', { x: 40, opacity: 0, duration: 0.8, stagger: 0.08 }, 1.1)
        .from('.l-device .ld-ring .v', { strokeDashoffset: 170, duration: 1.4, ease: 'power3.out' }, 1.2);

      gsap.to('.l-hero-bg', { yPercent: 35, scale: 1.15, ease: 'none', scrollTrigger: { trigger: '.l-hero', start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('.l-device', { yPercent: -12, ease: 'none', scrollTrigger: { trigger: '.l-hero', start: 'top top', end: 'bottom top', scrub: true } });

      // Pinned story
      const rows = gsap.utils.toArray('.lp-row');
      const days = gsap.utils.toArray('.lp-freq span');
      const steps = gsap.utils.toArray('.lp-step');
      const ringC = 2 * Math.PI * 50;
      const pct = { v: 0 };
      const story = gsap.timeline({
        scrollTrigger: {
          trigger: '.l-pin', start: 'top top', end: '+=2200', pin: true, scrub: 0.6,
          onUpdate: (self) => {
            const pr = self.progress;
            const i = Math.min(2, Math.floor(pr * 3));
            steps.forEach((s, j) => s.classList.toggle('on', j === i));
            rows.forEach((r, j) => r.classList.toggle('done', pr > 0.62 + j * 0.07));
          },
        },
      });
      story.from(rows, { x: 60, opacity: 0, stagger: 0.15, duration: 0.5 })
        .to('.lp-link', { opacity: 1, scale: 1, duration: 0.3 })
        .to(days, { backgroundColor: 'var(--ink)', color: 'var(--bg)', stagger: 0.08, duration: 0.2 }, '+=0.2')
        .fromTo('.lp-big-ring .v', { strokeDashoffset: ringC }, { strokeDashoffset: 0, duration: 1.4, ease: 'none' }, '+=0.3')
        .to(pct, { v: 100, duration: 1.4, ease: 'none', onUpdate: () => { const el = $('#lp-pct'); if (el) el.textContent = Math.round(pct.v); } }, '<');

      // Generic reveals
      gsap.utils.toArray('.l-bento .reveal, .l-final .reveal').forEach((el) => {
        gsap.from(el, { y: 50, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%' } });
      });
      gsap.from('.bn-cal-grid .v', { strokeDashoffset: 88, duration: 1.2, stagger: 0.03, ease: 'power2.out', scrollTrigger: { trigger: '.bn-cal', start: 'top 75%' } });
      gsap.from('.bn-bars i', { scaleY: 0, transformOrigin: 'bottom', duration: 1, stagger: 0.07, ease: 'back.out(1.6)', scrollTrigger: { trigger: '.bn-stats', start: 'top 80%' } });
      gsap.from('.bn-bubble', { y: 30, scale: 0.9, opacity: 0, duration: 0.9, ease: 'back.out(2)', scrollTrigger: { trigger: '.bn-nudge', start: 'top 75%' } });
      gsap.from('.bn-note', { x: 80, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.bn-notify', start: 'top 75%' } });

      // Statement: words light up as you scroll
      gsap.fromTo('.st-text span', { opacity: 0.12 }, { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: '.l-statement', start: 'top 70%', end: 'bottom 60%', scrub: true } });

      // Final dots
      gsap.from('.final-dots .ld', { scale: 0, transformOrigin: '50% 50%', stagger: 0.08, duration: 0.6, ease: 'back.out(3)', scrollTrigger: { trigger: '.l-final', start: 'top 70%' } });
    }, app);
    disposers.push(() => { ctx.revert(); ScrollTrigger.getAll().forEach((t) => t.kill()); });
    document.documentElement.classList.add('lenis');
  });
}

// ============================================================ auth page
export function renderAuthPage(mode, onDone) {
  destroyLanding();
  const isSignup = mode === 'signup';
  const app = $('#app');
  app.innerHTML = `
    <div class="auth">
      <div class="auth-visual" aria-hidden="true">
        <a class="brand on-visual" href="#/" tabindex="-1"><span class="brand-mark">${logoMark('plain')}</span><span class="brand-word">Check<b>It</b></span></a>
        <div class="av-art">
          <div class="av-glow"></div>
          <div class="av-icon">${logoMark('tile', 'animate')}</div>
          <div class="av-card c1"><span class="lc on"><svg viewBox="0 0 24 24"><path d="M6 12.5l4 4L18 8"/></svg></span>${icon('tooth', 18)}<b>Brush teeth</b></div>
          <div class="av-card c2"><span class="lc"><svg viewBox="0 0 24 24"><path d="M6 12.5l4 4L18 8"/></svg></span>${icon('braces', 18)}<b>Retainer</b></div>
          <div class="av-card c3"><span class="lc on"><svg viewBox="0 0 24 24"><path d="M6 12.5l4 4L18 8"/></svg></span>${icon('pin', 18)}<b>Pinterest pins</b></div>
        </div>
        <p class="av-quote">${isSignup ? 'Ten seconds to set up.<br><span class="soft">A lifetime of not forgetting.</span>' : 'Welcome back.<br><span class="soft">Your rhythm is waiting.</span>'}</p>
      </div>
      <div class="auth-panel">
        <a class="back-link" href="#/">${icon('chevL', 16)} Home</a>
        <form class="auth-card" novalidate>
          <h2>${isSignup ? 'Create your account' : 'Log in'}</h2>
          <p class="muted">${isSignup ? 'Stored only in this browser. No email needed.' : 'Use the account you created in this browser.'}</p>
          ${isSignup ? `<label class="field"><span>Name</span><input id="a-name" autocomplete="given-name" placeholder="What should we call you?" required></label>` : ''}
          <label class="field"><span>Username</span><input id="a-user" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="${isSignup ? `More than ${MIN_USERNAME - 1} characters` : 'Your username'}" required>
            ${isSignup ? '<small class="field-msg" id="u-msg"></small>' : ''}</label>
          <label class="field"><span>Password</span>
            <div class="pw"><input id="a-pass" type="password" autocomplete="${isSignup ? 'new-password' : 'current-password'}" placeholder="${isSignup ? 'Create a strong password' : 'Your password'}" required>
              <button type="button" class="pw-eye" aria-label="Show password" data-eye="a-pass">${icon('eye', 18)}</button></div>
          </label>
          ${isSignup ? `
            <div class="pw-meter" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
            <ul class="pw-rules">${PASSWORD_RULES.map((r) => `<li data-rule="${r.id}"><span>${icon('check', 12)}</span>${r.label}</li>`).join('')}</ul>
            <label class="field"><span>Confirm password</span>
              <div class="pw"><input id="a-pass2" type="password" autocomplete="new-password" placeholder="Type it again" required>
                <button type="button" class="pw-eye" aria-label="Show password" data-eye="a-pass2">${icon('eye', 18)}</button></div>
              <small class="field-msg" id="p2-msg"></small>
            </label>` : ''}
          <p class="error" id="a-err" role="alert"></p>
          <button class="btn primary large full" id="a-submit" type="submit">${isSignup ? 'Create account' : 'Log in'}</button>
          <p class="muted small center switch-auth">${isSignup ? 'Already have an account? <a href="#/login">Log in</a>' : 'New here? <a href="#/signup">Create an account</a>'}</p>
        </form>
      </div>
    </div>`;

  const form = $('.auth-card', app);
  $$('[data-eye]', form).forEach((b) => (b.onclick = () => {
    const inp = $(`#${b.dataset.eye}`, form);
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    b.innerHTML = icon(show ? 'eyeOff' : 'eye', 18);
    b.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  }));

  const pass = $('#a-pass', form);
  const validate = () => {
    if (!isSignup) return true;
    const pw = pass.value;
    let score = 0;
    PASSWORD_RULES.forEach((r) => { const ok = r.test(pw); score += ok; $(`[data-rule="${r.id}"]`, form).classList.toggle('ok', ok); });
    $$('.pw-meter i', form).forEach((i, n) => { i.className = n < score ? `on s${score}` : ''; });
    const u = $('#a-user', form).value;
    const ue = u ? usernameError(u) : '';
    const um = $('#u-msg', form); um.textContent = ue; um.className = `field-msg ${ue ? 'bad' : ''}`;
    const p2 = $('#a-pass2', form).value;
    const pm = $('#p2-msg', form);
    if (!p2) { pm.textContent = ''; pm.className = 'field-msg'; }
    else if (p2 === pw) { pm.textContent = 'Passwords match'; pm.className = 'field-msg good'; }
    else { pm.textContent = 'Passwords don’t match'; pm.className = 'field-msg bad'; }
    return passwordOk(pw) && !ue && u && p2 === pw && $('#a-name', form).value.trim().length >= 2;
  };
  form.addEventListener('input', validate);

  setTimeout(() => $('input', form).focus(), 80);
  form.onsubmit = async (e) => {
    e.preventDefault();
    const btn = $('#a-submit', form);
    btn.disabled = true;
    try {
      const u = $('#a-user', form).value; const pw = pass.value;
      if (isSignup) await register(u, $('#a-name', form).value, pw, $('#a-pass2', form).value);
      else await login(u, pw);
      onDone(isSignup ? 'register' : 'login');
    } catch (err) {
      $('#a-err', form).textContent = err.message;
      form.classList.add('shake'); setTimeout(() => form.classList.remove('shake'), 400);
      btn.disabled = false;
    }
  };
}
