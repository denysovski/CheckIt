// Public landing page (minimal, follows the theme, with a live product demo), legal pages and auth screens.
import { icon, logoMark } from './icons.js';
import { esc, $, $$, reducedMotion } from './ui.js';
import { login, register, PASSWORD_RULES, passwordOk, usernameError } from './auth.js';

const REPO_URL = 'https://github.com/denysovski/CheckIt';

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
        <div class="dm-nav">${icon('doc', 13)}Biology: cells</div>
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
              <div class="dm-row"><span class="dm-hash">#</span><span><b>school</b><small>Exam on Friday, chapters 4–6</small></span></div>
              <div class="dm-row"><span class="dm-hash">#</span><span><b>ideas</b><small>Make a gym log channel</small></span></div>
              <div class="dm-ph mt">${icon('doc', 12)} Notes</div>
              <div class="dm-row">${icon('doc', 12)}<span><b>Biology: cells</b></span><em>Today</em></div>
            </div>
          </div>
          <div class="dm-composer"><span class="dm-chip">Add task</span><span class="dm-type" id="dm-type"></span><span class="dm-caret"></span><span class="dm-send">${icon('send', 12)}</span></div>
        </section>
        <section class="dm-view dm-channel">
          <h3 class="dm-chtitle"><span class="dm-hash">#</span>school</h3>
          <div class="dm-msgs" id="dm-msgs">
            <div class="dm-sep">Yesterday</div>
            <div class="dm-msg"><em>18:02</em>Exam on Friday, chapters 4–6</div>
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
// Animated week card: seven days fill up, then the check mark draws. Solid, no glass.
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
  ['138', 'studies', 'Tracking progress makes you more likely to reach a goal. Writing it down helps most.', 'Harkin et al., Psychological Bulletin, 2016', 'https://www.apa.org/news/press/releases/2015/10/progress-goals'],
  ['94', 'tests', 'Deciding when and where you will do something makes you far more likely to do it.', 'Gollwitzer & Sheeran, 2006', 'https://kops.uni-konstanz.de/entities/publication/2e749bfb-8533-437c-8203-7e788c910c5f'],
  ['66', 'days', 'The median time for a small daily action to become automatic.', 'Lally et al., European Journal of Social Psychology, 2010', 'https://www.thebehavioralscientist.com/articles/how-long-to-form-a-habit'],
];

const FEATURES = [
  ['today', 'Today', 'Only what is due today. Tick it and it stays put, marked done.'],
  ['calendar', 'Plan', 'Drag tasks into days, set a time and a reminder.'],
  ['chart', 'Stats', 'Streaks, best days and a weekly recap every Monday.'],
  ['pen', 'Journal', 'One line a day, with the weather and your mood.'],
];

// Real numbers only: the visitor's own history if they've used it here.
function ownStats() {
  try {
    const st = JSON.parse(localStorage.getItem('checkit:v1') || 'null');
    if (!st) return null;
    let done = 0; let days = 0;
    Object.values(st.data || {}).forEach((d) => Object.values(d.log || {}).forEach((day) => { const c = Object.keys(day).length; done += c; if (c) days++; }));
    return done ? { done, days } : null;
  } catch { return null; }
}

export function legalLinks(cls = '') {
  return `<a class="${cls}" href="#/privacy">Privacy</a><a class="${cls}" href="#/terms">Terms</a>`;
}

export function renderLanding({ loggedIn = false } = {}) {
  destroyLanding();
  document.documentElement.classList.add('is-landing');
  const app = $('#app');
  const cta = loggedIn ? ['#/home', 'Open dashboard'] : ['#/signup', 'Create free account'];
  const own = ownStats();
  app.innerHTML = `
  <div class="landing lx">
    <header class="l-nav">
      <a class="brand" href="#/" aria-label="Check It home"><span class="brand-mark">${logoMark('plain')}</span><span class="brand-word">Check<b>It</b></span></a>
      <nav class="l-links" aria-label="Sections"><a href="#how" data-scroll>Product</a><a href="#research" data-scroll>Research</a><a href="#privacy" data-scroll>Privacy</a></nav>
      <div class="l-nav-actions">${loggedIn ? `<a class="btn pill small" href="#/home">Open dashboard</a>` : `<a class="l-login" href="#/login">Log in</a><a class="btn pill small" href="#/signup">Sign up</a>`}</div>
    </header>

    <section class="lx-hero">
      <h1 class="lx-title">Plan the day.<br><span>Check it off.</span></h1>
      <p class="lx-sub">A calm checklist for the things you repeat. Private, free, and it runs in your browser.</p>
      <div class="lx-cta">
        <a class="btn pill large" href="${cta[0]}">${cta[1]} ${icon('chevR', 16)}</a>
        <a class="btn pill large ghost" href="#how" data-scroll>See it work</a>
      </div>
    </section>

    <section class="lx-stage" id="how" aria-label="Live product demo">
      ${demoHTML()}
      <p class="lx-caption">The real app, running on its own. Nothing here is a mock-up.</p>
    </section>

    <section class="lx-band">
      <div class="lx-split">
        <div class="lx-copy">
          <h2 class="lx-h2">A week you can see.</h2>
          <p>Every day you finish fills a ring. Close all seven and the week is checked.</p>
        </div>
        ${checkCardHTML()}
      </div>
    </section>

    <section class="lx-features" aria-label="What's inside">
      ${FEATURES.map(([ic, t, d]) => `<div class="lx-f"><span class="lx-f-ic">${icon(ic, 22)}</span><div><h3>${t}</h3><p>${d}</p></div></div>`).join('')}
    </section>

    <section class="lx-research" id="research">
      <h2 class="lx-h2">Why writing it down works.</h2>
      <div class="lx-rows">
        ${RESEARCH.map(([big, unit, text, cite, url]) => `
          <div class="lx-row">
            <div class="lx-num"><b>${big}</b><span>${unit}</span></div>
            <p>${text}</p>
            <a href="${url}" target="_blank" rel="noopener noreferrer" class="lx-cite">${cite} ${icon('external', 12)}</a>
          </div>`).join('')}
      </div>
    </section>

    <section class="lx-privacy" id="privacy">
      <h2 class="lx-h2">Your data stays with you.</h2>
      <p>No servers, no tracking, no ads. Tasks, notes and history are saved in this browser. Export a backup any time.</p>
      <div class="lx-facts">
        <div><b>0</b><span>servers storing your data</span></div>
        <div><b>0</b><span>trackers or ads</span></div>
        ${own ? `<div><b>${own.done.toLocaleString('en-GB')}</b><span>tasks you checked off here</span></div>` : '<div><b>1</b><span>file to back it all up</span></div>'}
      </div>
      <a class="lx-link" href="#/privacy">Read the privacy policy ${icon('chevR', 14)}</a>
    </section>

    <section class="lx-final">
      <h2 class="lx-h2">Start with one task.</h2>
      <a class="btn pill large" href="${cta[0]}">${cta[1]} ${icon('chevR', 16)}</a>
    </section>

    <footer class="l-foot">
      <span class="brand-word small">Check<b>It</b></span>
      <span class="dim small">A personal school project by denysovski. Not a commercial product.</span>
      <nav class="lx-foot-links">${legalLinks()}<a href="${REPO_URL}" target="_blank" rel="noopener noreferrer">GitHub</a></nav>
    </footer>
  </div>`;

  const root = app.querySelector('.landing');
  let alive = true;
  const disposers = [];
  cleanup = () => { alive = false; disposers.forEach((f) => f()); };

  $$('[data-scroll]', root).forEach((a) => (a.onclick = (e) => {
    e.preventDefault(); const t = $(a.getAttribute('href'));
    t.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' });
  }));
  const nav = $('.l-nav', root);
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 10);
  window.addEventListener('scroll', onScroll, { passive: true });
  disposers.push(() => window.removeEventListener('scroll', onScroll));

  $$('.dm-side > *', root).forEach((el, i) => el.style.setProperty('--k', i));
  $$('.dm-list li', root).forEach((el, i) => el.style.setProperty('--k', i));
  if (reducedMotion()) { root.classList.add('static'); return; }
  runDemo(root, () => alive);
  runCheckCard(root, () => alive);
}

// ------------------------------------------------------------------ privacy & terms
const LEGAL = {
  privacy: ['Privacy Policy', [
    ['What this is', 'Check It is a personal school and portfolio project. It is not a company and does not sell anything.'],
    ['What is stored', 'Your username, a salted PBKDF2 hash of your password, your tasks, history, notes, channels, journal and settings. All of it is saved in your browser (localStorage and IndexedDB) on this device only.'],
    ['What is sent', 'Nothing about you is sent to a server we run, because there is none. If you allow location, your approximate coordinates are sent to Open-Meteo to get the weather. If you refuse, your city is guessed once from your IP address by BigDataCloud. Icons are loaded from Iconify. These services see a normal web request, nothing from your checklist.'],
    ['Notifications', 'Reminders are shown by your browser. You can turn them off in Settings or in your browser at any time.'],
    ['Cookies and tracking', 'No cookies, analytics, ads or trackers are used.'],
    ['Your control', 'Export a full backup from Settings, import it elsewhere, or delete everything with one button. Clearing your browser data also removes it.'],
    ['Contact', 'Open an issue on GitHub: github.com/denysovski/CheckIt.'],
  ]],
  terms: ['Terms of Use', [
    ['Use', 'Check It is free to use for personal purposes. The source code is public on GitHub.'],
    ['No warranty', 'It is a student project provided as is. It may change or stop working, and data saved only in your browser can be lost. Export backups if your data matters to you.'],
    ['Your content', 'What you write is yours. It never leaves your device unless you export it.'],
    ['Third-party services', 'Weather comes from Open-Meteo and icons from Iconify. Their own terms apply to those requests.'],
    ['Changes', 'These terms may be updated with the app. The date below shows the latest version.'],
  ]],
};

export function renderLegal(kind, loggedIn = false) {
  destroyLanding();
  document.documentElement.classList.add('is-landing');
  const [title, sections] = LEGAL[kind];
  $('#app').innerHTML = `
  <div class="landing lx legal">
    <header class="l-nav scrolled">
      <a class="brand" href="#/" aria-label="Check It home"><span class="brand-mark">${logoMark('plain')}</span><span class="brand-word">Check<b>It</b></span></a>
      <div class="l-nav-actions"><a class="btn pill small" href="${loggedIn ? '#/home' : '#/'}">${loggedIn ? 'Back to app' : 'Home'}</a></div>
    </header>
    <article class="lg-doc">
      <h1 class="lx-h2">${title}</h1>
      <p class="lg-date">Last updated 6 November 2026</p>
      ${sections.map(([h, p]) => `<section><h2>${h}</h2><p>${esc(p)}</p></section>`).join('')}
      <nav class="lg-switch">${kind === 'privacy' ? '<a href="#/terms">Terms of Use</a>' : '<a href="#/privacy">Privacy Policy</a>'}</nav>
    </article>
    <footer class="l-foot"><span class="brand-word small">Check<b>It</b></span><nav class="lx-foot-links">${legalLinks()}</nav></footer>
  </div>`;
  window.scrollTo(0, 0);
}

// ------------------------------------------------------------------ auth (minimal, centered)
export function renderAuthPage(mode, onDone) {
  destroyLanding();
  const isSignup = mode === 'signup';
  const app = $('#app');
  app.innerHTML = `
    <div class="auth2">
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
        <button class="btn blue large full fx" id="a-submit" type="submit" ${isSignup ? 'disabled' : ''}>${isSignup ? 'Create account' : 'Log in'}</button>
        <p class="auth2-switch">${isSignup ? 'Already have an account? <a href="#/login">Log in</a>' : 'New here? <a href="#/signup">Create an account</a>'}</p>
        <p class="auth2-note">${icon('info', 14)} Your account is stored only in this browser. <a href="#/privacy">Privacy</a> · <a href="#/terms">Terms</a></p>
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
