import { scrollToEl, toTop } from './smooth.js';
// Public landing page (minimal, follows the theme, with a live product demo), legal pages and auth screens.
import { icon, logoMark } from './icons.js';
import { esc, $, $$, reducedMotion } from './ui.js';
import { login, register, PASSWORD_RULES, passwordOk, usernameError } from './auth.js';
import { setPrefs } from './store.js';

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
  ['tooth', 'Brush teeth', ['Today', '1 of 2 today'], true],
  ['pin', 'Upload Pinterest pins', ['Today'], false],
  ['gamepad', 'Download new Marvel Rivals videos', ['Due today', '0 of 1 this week'], false],
  ['interdental', 'Interdental brushes', ['Today'], false],
  ['braces', 'Put on retainer for the night', ['Today'], false],
];
const dzRow = ([ic, t, whens, done], i, extra = '') => `<li class="dz-task ${done ? 'done' : ''} ${extra}" data-row="${i}"><span class="dm-ck dz-ck">${check}</span><span class="dz-tile">${icon(ic, 26)}</span><span class="dz-tm"><b>${t}</b><span class="dz-whens">${whens.map((w, j) => `<em class="${j ? 'pl' : ''}">${w}</em>`).join('')}</span></span><span class="dz-edit">${icon('edit', 16)}</span></li>`;

// A 1:1 copy of the real Home screen, built at 1440×900 and scaled to fit.
// It always shows the opposite theme to the page so it stands out.
function demoHTML() {
  const now = new Date();
  const month = now.toLocaleDateString('en-GB', { month: 'long' });
  const first = (new Date(now.getFullYear(), now.getMonth(), 1).getDay() + 6) % 7;
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const today = now.getDate();
  const navs = [['home', 'Home', 'home'], ['today', 'Today', 'today', 4], ['list', 'Tasks'], ['clock', 'Planner'], ['calendar', 'Calendar', 'cal'], ['pen', 'Journal'], ['book', 'Notes'], ['chart', 'Stats'], ['archive', 'Recaps']];
  return `
  <div class="demo" aria-hidden="true">
    <div class="dm-bar">
      <span class="dm-dots"><i></i><i></i><i></i></span>
      <span class="dm-url">${icon('search', 12)} denysovski.github.io/CheckIt</span>
      <span class="dm-bar-r"></span>
    </div>
    <div class="dz-fit"><div class="dz">
      <aside class="dz-side">
        <div class="dz-top"><span class="dz-brand"><span class="dz-mark">${logoMark('plain')}</span><span>Check<b>It</b></span></span><span class="dz-ib">${icon('compose', 19)}</span></div>
        <div class="dz-search">${icon('search', 17)}<span>Search</span><kbd>Ctrl + K</kbd></div>
        <nav class="dz-nav">${navs.map(([ic, l, id, n], i) => `<span class="dm-nav ${i === 0 ? 'on' : ''}" ${id ? `data-dm="${id}"` : ''}>${icon(ic, 18)}<span>${l}</span>${n ? `<i class="dz-badge">${n}</i>` : ''}</span>`).join('')}</nav>
        <div class="dz-sec">Channels ${icon('plus', 15)}</div>
        <span class="dm-nav" data-dm="ch-school"><i class="dz-hash">#</i><span>school</span><em>2</em></span>
        <span class="dm-nav"><i class="dz-hash">#</i><span>ideas</span></span>
        <div class="dz-sec">Notes ${icon('plus', 15)}</div>
        <span class="dm-nav">${icon('doc', 18)}<span>Biology: cells</span></span>
        <span class="dm-nav">${icon('doc', 18)}<span>Trip packing list</span></span>
        <div class="dz-bottom">
          <span class="dz-leave">${icon('logout', 17)} Leave dashboard</span>
          <span class="dz-user"><span class="dz-av">U<i></i></span><span class="dz-ut"><b>user</b><small>Settings &amp; account</small></span>${icon('gear', 18)}</span>
        </div>
      </aside>
      <div class="dz-main">
        <section class="dm-view dm-home on">
          <p class="dz-date">${now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h3 class="dz-title">Welcome back<i>.</i></h3>
          <div class="dz-tiles">
            <div class="dz-tc c1"><div class="dz-tct">${icon('flag', 20)}<span>Due today</span></div><b id="dm-due">4</b><small>Left for today</small></div>
            <div class="dz-tc c2"><div class="dz-tct">${icon('check', 20)}<span>Done today</span></div><b id="dm-done">1</b><small>of 5 planned</small></div>
            <div class="dz-tc c3"><div class="dz-tct">${icon('flame', 20)}<span>Streak</span></div><b>12</b><small>Days in a row</small></div>
            <div class="dz-tc c4"><div class="dz-tct">${icon('chart', 20)}<span>This week</span></div><b>86<sup>%</sup></b><small>Success in the last 7 days</small></div>
          </div>
          <div class="dz-grid">
            <div class="dz-panel p1">
              <div class="dz-ph">${icon('today', 18)} Today <i class="dz-count">5</i><span class="dz-va">View all ${icon('chevR', 13)}</span></div>
              <ul class="dz-list" id="dm-list">${TASKS.map((t, i) => dzRow(t, i)).join('')}</ul>
            </div>
            <div class="dz-col">
              <div class="dz-panel p2">
                <div class="dz-ph">${icon('pen', 18)} Journal<span class="dz-va">${icon('edit', 13)} Open</span></div>
                <div class="dz-card"><span class="dz-wic">${icon('cloud', 26)}</span><span><b>8° Sunny</b><small>Good day for a walk</small></span></div>
                <div class="dz-card"><span class="dz-sic">${icon('pen', 16)}</span><span><b>How was your day?</b><small>0 / 20 words</small></span></div>
              </div>
              <div class="dz-panel p3">
                <div class="dz-ph"><i class="dz-hash big">#</i> Channels <i class="dz-count">2</i><span class="dz-va">${icon('plus', 13)} New</span></div>
                <div class="dz-card"><span class="dz-sic">#</span><span><b>school</b><small>Exam on Friday, chapters 4–6</small></span><em class="dz-n">2</em></div>
                <div class="dz-card"><span class="dz-sic">#</span><span><b>ideas</b><small>Make a gym log channel</small></span></div>
              </div>
            </div>
          </div>
          <div class="dz-composer dm-composer">
            <div class="dz-chips"><span class="on">Add task</span><span>Jot a note</span><span>Log to #school</span></div>
            <div class="dz-field"><span class="dz-ph2" id="dz-ph">Add a task for today…</span><span class="dm-type" id="dm-type"></span><span class="dz-caret"></span></div>
            <div class="dz-crow"><span class="dz-target">${icon('check', 16)} Task ${icon('chevR', 13)}</span><span class="dm-send dz-send">${icon('send', 18)}</span></div>
          </div>
        </section>
        <section class="dm-view dm-channel">
          <p class="dz-date">Channel</p>
          <h3 class="dz-title sm"><i class="dz-hash">#</i>school</h3>
          <div class="dz-panel p1 dz-msgs" id="dm-msgs">
            <div class="dz-sep">Yesterday</div>
            <div class="dm-msg dz-msg"><em>18:02</em>Exam on Friday, chapters 4–6</div>
            <div class="dm-msg dz-msg"><em>18:05</em>Ask about the lab report</div>
            <div class="dz-sep">Today</div>
          </div>
          <div class="dz-composer dm-composer">
            <div class="dz-chips"><span>Add task</span><span>Jot a note</span><span class="on">Log to #school</span></div>
            <div class="dz-field"><span class="dm-type" id="dm-type2"></span><span class="dz-caret"></span></div>
            <div class="dz-crow"><span class="dz-target">${icon('hash', 16)} school ${icon('chevR', 13)}</span><span class="dm-send dz-send">${icon('send', 18)}</span></div>
          </div>
        </section>
        <section class="dm-view dm-cal">
          <h3 class="dz-title cal">${month} <span>${now.getFullYear()}</span></h3>
          <p class="dz-date">${Math.round(((today - 1) * 0.86 / days) * 100)}% of tasks done this month.</p>
          <div class="dz-calwrap">
            <div class="dz-panel p1 dz-cal">
              <div class="dz-dows">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => `<span>${d}</span>`).join('')}</div>
              <div class="dz-calgrid dm-calgrid">${Array.from({ length: first }, () => '<i></i>').join('')}${Array.from({ length: days }, (_, i) => { const d = i + 1; const v = [1, 1, .7, 1, 1, .5, 1, 1, 1, .8, 1, 1, .3, 1, 1, 1, .9, 1, .6, 1, 1, 1, 1, .8, 1, 1, .5, .6, 1, .9, 1][i]; return `<span class="${d === today ? 'today' : ''} ${d > today ? 'fut' : ''}" style="--v:${d < today ? v : d === today ? .6 : 0}"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" class="t"/><circle cx="18" cy="18" r="15" class="v"/></svg><em>${d}</em></span>`; }).join('')}</div>
            </div>
            <div class="dz-panel p2 dz-day">
              <small>Today</small><b>${now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</b>
              <span class="dz-donechip">${icon('check', 13)} 3 done</span>
              <ul class="dz-list">${TASKS.slice(0, 4).map((t, i) => dzRow([t[0], t[1], [i < 3 ? 'Done' : 'Not done yet'], i < 3], 'c' + i)).join('')}</ul>
            </div>
          </div>
        </section>
      </div>
    </div></div>
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
    const ph = $('#dz-ph', root); if (ph) ph.style.opacity = '';
  };
  const tick = (i, done, due) => { $(`[data-row="${i}"]`, root).classList.add('done'); $('#dm-done', root).textContent = done; $('#dm-due', root).textContent = due; };

  (async () => {
    await sleep(1200);
    while (alive()) {
      reset();
      await moveTo($('[data-row="1"] .dm-ck', root), 0.5, 0.5, 1100); await click(); tick(1, '2', '3');
      await sleep(450);
      await moveTo($('[data-row="2"] .dm-ck', root), 0.5, 0.5, 600); await click(); tick(2, '3', '2');
      await sleep(400);
      await moveTo($('.dm-home .dm-composer', root), 0.3, 0.5, 900); await click();
      $('#dz-ph', root).style.opacity = '0';
      await type($('#dm-type', root), 'Finish math homework');
      await sleep(250); await moveTo($('.dm-home .dm-send', root), 0.5, 0.5, 500); await click();
      if (!alive()) return;
      const tmp = document.createElement('ul'); tmp.innerHTML = dzRow(['star', 'Finish math homework', ['Today']], 9, 'added');
      $('#dm-list', root).appendChild(tmp.firstChild); $('#dz-ph', root).style.opacity = ''; $('#dm-type', root).textContent = ''; $('#dm-due', root).textContent = '3';
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

// Small illustrations for the sneak-peek cards (pure markup, no images).
function peekArt(c) {
  if (c === 'peek-today') return ['Brush teeth', 'Gym', 'Read'].map((t, i) => `<i class="pa-row ${i < 2 ? 'on' : ''}"><em></em>${t}</i>`).join('');
  if (c === 'peek-plan') return ['M', 'T', 'W', 'T', 'F'].map((d, i) => `<i class="pa-col"><span>${d}</span>${i % 2 ? '<em></em>' : '<em></em><em></em>'}</i>`).join('');
  if (c === 'peek-journal') return `<i class="pa-faces">${[1, 2, 3, 4, 5].map((v) => `<em class="${v === 4 ? 'on' : ''}"></em>`).join('')}</i><i class="pa-lines"><em></em><em></em><em></em></i>`;
  if (c === 'peek-notes') return '<i class="pa-note"><b></b><em></em><em></em><em class="s"></em></i>';
  return [0.5, 0.8, 0.6, 1, 0.7, 0.9, 0.4].map((v) => `<i class="pa-bar" style="--v:${v}"></i>`).join('');
}

// Analytics donut: three arcs with leader lines and labels.
function donutHTML() {
  const R = 120; const C = 2 * Math.PI * R;
  const segs = [[69, 'Completed', '#12AAD4'], [30, 'Still open', '#7FDDF5'], [1, 'Forgotten', '#FF9C8F']];
  let off = 0;
  const arcs = segs.map(([p, , c], i) => { const len = (p / 100) * C; const a = `<circle class="dn-arc" style="--d:${0.2 + i * 0.9}s;--len:${Math.max(len - 4, 2).toFixed(1)}px;--C:${C.toFixed(1)}px" cx="160" cy="160" r="${R}" fill="none" stroke="${c}" stroke-width="34" stroke-dashoffset="${-off}" transform="rotate(-90 160 160)"/>`; off += len; return a; }).join('');
  return `
    <div class="lx-donut">
      <svg viewBox="0 0 320 320"><circle cx="160" cy="160" r="${R}" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="34"/>${arcs}</svg>
      <div class="dn-center"><b>69%</b><span>this week</span></div>
      <div class="dn-label l1"><i style="background:#12AAD4"></i><b>69%</b><span>Completed</span></div>
      <div class="dn-label l2"><i style="background:#7FDDF5"></i><b>30%</b><span>Still open</span></div>
      <div class="dn-label l3"><i style="background:#FF9C8F"></i><b>1%</b><span>Forgotten</span></div>
    </div>`;
}

// Weekly recap card (3D, follows the pointer like the week card).
function recapCardHTML() {
  return `
    <div class="rc3" aria-hidden="true">
      <div class="rc3-top"><span>Week 45 recap</span><em>2 – 8 Nov</em></div>
      <div class="rc3-hero"><b>86<small>%</small></b><span>of planned tasks done</span></div>
      <div class="rc3-grid">
        <div><span>Best day</span><b>Thursday</b></div>
        <div><span>Earliest finish</span><b>06:48</b></div>
        <div class="good"><span>Went well</span><b>Brush teeth, 14 of 14</b></div>
        <div class="bad"><span>Slipped</span><b>Gym, 1 of 3</b></div>
      </div>
      <p class="rc3-tip">Try next week: book gym for Tuesday at 17:00.</p>
    </div>`;
}

export function legalLinks(cls = '') {
  return `<a class="${cls}" href="#/privacy">Privacy</a><a class="${cls}" href="#/terms">Terms</a><a class="${cls}" href="#/cookies">Cookies</a>`;
}

const SOCIAL = [
  ['GitHub', 'https://github.com/denysovski'],
  ['Instagram', 'https://www.instagram.com/denysovski2/'],
];

function footerHTML() {
  return `
    <footer class="lx-footer">
      <div class="lx-foot-top">
        <div class="lx-news">
          <h3>Release notes, now and then.</h3>
          <p>One short email when something new ships. No spam.</p>
          <form class="lx-news-form" novalidate>
            <label class="sr-only" for="lx-email">Email address</label>
            <input id="lx-email" type="email" placeholder="you@example.com" autocomplete="email" required>
            <button class="btn pill" type="submit">Subscribe</button>
          </form>
          <p class="lx-news-msg" role="status" aria-live="polite"></p>
        </div>
        <nav class="lx-cols" aria-label="Footer">
          <div><h4>Product</h4><a href="#how" data-scroll>Live demo</a><a href="#research" data-scroll>Research</a><a href="#privacy" data-scroll>Privacy</a><a href="#/signup">Create account</a><a href="#/login">Log in</a></div>
          <div><h4>Legal</h4><a href="#/terms">Terms &amp; Conditions</a><a href="#/privacy">Privacy Policy</a><a href="#/cookies">Cookies</a></div>
          <div><h4>Code</h4><a href="${REPO_URL}" target="_blank" rel="noopener noreferrer">GitHub repository</a><a href="${REPO_URL}/releases" target="_blank" rel="noopener noreferrer">Releases</a><a href="${REPO_URL}/issues/new" target="_blank" rel="noopener noreferrer">Report an issue</a></div>
          <div><h4>Social</h4>${SOCIAL.map(([n, u]) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${n}</a>`).join('')}</div>
        </nav>
      </div>
      <div class="lx-foot-bottom">
        <span>© 2026 Check It. Designed and built by <a href="https://github.com/denysovski" target="_blank" rel="noopener noreferrer">denysovski</a>.</span>
        <span>A personal school project, not a commercial product.</span>
      </div>
    </footer>`;
}

function bindFooter(root) {
  const f = $('.lx-news-form', root);
  if (!f) return;
  f.onsubmit = (e) => {
    e.preventDefault();
    const inp = $('#lx-email', f); const msg = $('.lx-news-msg', root);
    if (!inp.checkValidity()) { msg.textContent = 'Enter a valid email address.'; msg.className = 'lx-news-msg bad'; inp.focus(); return; }
    // No server yet: nothing is sent. Be honest about it.
    msg.innerHTML = `Thanks. Check It has no server, so nothing was sent. Follow <a href="${REPO_URL}/releases" target="_blank" rel="noopener noreferrer">releases on GitHub</a> for now.`;
    msg.className = 'lx-news-msg good'; inp.value = '';
  };
}

export function renderLanding({ loggedIn = false } = {}) {
  destroyLanding();
  document.documentElement.classList.add('is-landing');
  const app = $('#app');
  const cta = loggedIn ? ['#/home', 'Open dashboard'] : ['#/signup', 'Create free account'];
  app.innerHTML = `
  <div class="landing lx">
    <div class="lx-bg" aria-hidden="true"><i></i><i></i><i></i><b class="lx-calm t"></b><b class="lx-calm b"></b></div>
    <header class="l-nav">
      <a class="brand" href="#/" aria-label="Check It home"><span class="brand-mark">${logoMark('plain')}</span><span class="brand-word">Check<b>It</b></span></a>
      <nav class="l-links" aria-label="Sections"><a href="#how" data-scroll>Product</a><a href="#analytics" data-scroll>Analytics</a><a href="#recaps" data-scroll>Recaps</a></nav>
      <div class="l-nav-actions"><button class="lx-theme theme-tg" id="lx-theme" aria-label="Switch light or dark theme">${icon('sun', 18)}${icon('moon', 18)}</button>${loggedIn ? `<a class="btn pill small" href="#/home">Open dashboard</a>` : `<a class="l-login" href="#/login">Log in</a><a class="btn pill small" href="#/signup">Sign up</a>`}</div>
    </header>

    <section class="lx-hero">
      <h1 class="lx-title">Plan the day.</h1>
      <p class="lx-sub">Repeat tasks. Tick them off. See your week.</p>
      <div class="lx-cta">
        <a class="btn pill large" href="${cta[0]}">${cta[1]} ${icon('chevR', 16)}</a>
        <a class="btn pill large ghost" href="#how" data-scroll>See it work</a>
      </div>
    </section>

    <section class="lx-stage" id="how" aria-label="Live product demo">
      <div class="lx-demo-glow"><i class="lx-wave"></i><i class="lx-wave w2"></i><i class="lx-wave w3"></i>${demoHTML()}</div>
      <p class="lx-caption-big">The real app.<br><span>Running on its own.</span></p>
    </section>

    <section class="lx-peek" aria-label="A look inside">
      ${[['today', 'Today', 'peek-today', 'Everything due today, one tap to tick.'], ['clock', 'Planner', 'peek-plan', 'Drag tasks into the days of your week.'], ['pen', 'Journal', 'peek-journal', 'A mood and a few lines every evening.'], ['book', 'Notes', 'peek-notes', 'Quick notes with simple formatting.'], ['chart', 'Stats', 'peek-stats', 'Streaks, best days and what slipped.']].map(([ic, t, c, d]) => `
        <div class="pk ${c}"><span class="pk-ic">${icon(ic, 20)}</span><b>${t}</b><p>${d}</p><div class="pk-art" aria-hidden="true">${peekArt(c)}</div></div>`).join('')}
    </section>

    <section class="lx-band lx-week">
      <div class="lx-split">
        <div class="lx-copy">
          <h2 class="lx-h2 big">A week you can see.</h2>
          <p>Finish a day, fill a ring.</p>
          <a class="btn pill large lx-copy-btn" href="${loggedIn ? '#/home' : '#/signup'}">Open the dashboard ${icon('chevR', 16)}</a>
        </div>
        <div class="lx-tilt" id="lx-tilt">${checkCardHTML()}</div>
      </div>
    </section>

    <section class="lx-band lx-analytics" id="analytics">
      <div class="lx-split rev">
        <div class="lx-donut-wrap" aria-hidden="true">${donutHTML()}</div>
        <div class="lx-copy">
          <h2 class="lx-h2 big">Know how you’re doing.</h2>
          <p>What you finished. What slipped.</p>
        </div>
      </div>
    </section>

    <section class="lx-band lx-recaps" id="recaps">
      <div class="lx-recap-wide">
        <div class="lx-copy">
          <h2 class="lx-h2 big">A recap every Monday.</h2>
          <p>What went well. What to fix.</p>
        </div>
        <div class="lx-tilt lx-tilt-b" id="lx-tilt-b">${recapCardHTML()}</div>
      </div>
    </section>

    <section class="lx-trial">
      <div class="lx-trial-card">
        <span class="lx-trial-tag">Free while in testing</span>
        <h2 class="lx-h2">Try it today.</h2>
        <p>Free for personal use.</p>
        <a class="btn pill large" href="${cta[0]}">${loggedIn ? 'Open dashboard' : 'Start for free'} ${icon('chevR', 16)}</a>
      </div>
    </section>

    ${footerHTML()}
  </div>`;

  const root = app.querySelector('.landing');
  let alive = true;
  const disposers = [];
  cleanup = () => { alive = false; disposers.forEach((f) => f()); };

  $$('[data-scroll]', root).forEach((a) => (a.onclick = (e) => {
    e.preventDefault(); scrollToEl($(a.getAttribute('href')));
  }));
  const nav = $('.l-nav', root);
  const demo = $('.lx-stage .lx-demo-glow', root); // tilt the frame, so the ripples tilt with it
  const tilt = $('#lx-tilt', root);
  const bgEl = $('.lx-bg', root);
  const foot = $('.lx-footer', root);
  const still = reducedMotion();
  let raf = 0;
  const paint = () => {
    raf = 0;
    nav.classList.toggle('scrolled', window.scrollY > 24);
    // no glow behind the nav at the very top, nor behind the footer
    if (bgEl) {
      bgEl.classList.toggle('at-top', window.scrollY < 40);
      bgEl.classList.toggle('at-foot', !!foot && foot.getBoundingClientRect().top < innerHeight * 0.85);
    }
    if (still) return;
    // 3D: the demo lies back and stands up as it scrolls into view
    if (demo) {
      const r = demo.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight * 0.9)));
      demo.style.transform = `perspective(1800px) rotateX(${(1 - p) * 22}deg) scale(${0.92 + p * 0.08})`;
    }
    if (tilt && !tilt.matches(':hover')) {
      const r = tilt.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight - r.top) / innerHeight));
      tilt.style.setProperty('--rx', `${14 - p * 6}deg`);
    }
  };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(paint); };
  window.addEventListener('scroll', onScroll, { passive: true });
  disposers.push(() => window.removeEventListener('scroll', onScroll));
  paint();
  // both 3D cards lean towards the pointer; wheel scrolling over them stays smooth (Lenis)
  if (!still) $$('.lx-tilt', root).forEach((t) => {
    t.addEventListener('pointermove', (e) => {
      const r = t.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5; const y = (e.clientY - r.top) / r.height - 0.5;
      t.style.setProperty('--ry', `${-24 + x * 26}deg`); t.style.setProperty('--rx', `${8 - y * 22}deg`);
    });
    t.addEventListener('pointerleave', () => { t.style.removeProperty('--ry'); t.style.removeProperty('--rx'); paint(); });
  });

  // donut draws itself once it scrolls into view
  const donut = $('.lx-donut', root);
  if (donut && 'IntersectionObserver' in window) {
    // draws itself every time it scrolls into view
    const io = new IntersectionObserver((es) => es.forEach((en) => donut.classList.toggle('in', en.isIntersecting)), { threshold: 0.35 });
    io.observe(donut); disposers.push(() => io.disconnect());
  } else if (donut) donut.classList.add('in');

  // back to top
  const top = document.createElement('button');
  top.className = 'lx-top'; top.setAttribute('aria-label', 'Back to top'); top.innerHTML = icon('arrowUp', 20);
  root.appendChild(top);
  top.onclick = () => (window.__lenis ? window.__lenis.scrollTo(0, { duration: 1.4 }) : window.scrollTo({ top: 0, behavior: 'smooth' }));
  const showTop = () => top.classList.toggle('on', window.scrollY > 200);
  window.addEventListener('scroll', showTop, { passive: true });
  disposers.push(() => window.removeEventListener('scroll', showTop));
  showTop();
  bindFooter(root);
  bindLandingExtras(root, disposers);

  // scale the 1440×900 screen to whatever width the demo has
  const fit = $('.dz-fit', root);
  if (fit) {
    const size = () => { const w = fit.clientWidth; fit.style.setProperty('--dz-s', w / 1440); fit.style.height = `${(w / 1440) * 900}px`; };
    size();
    const ro = new ResizeObserver(size); ro.observe(fit);
    disposers.push(() => ro.disconnect());
  }
  if (reducedMotion()) { root.classList.add('static'); return; }
  runDemo(root, () => alive);
  runCheckCard(root, () => alive);
}

// Theme switch, pointer-following background with a click ripple, cookie question.
function bindLandingExtras(root, disposers) {
  const tb = $('#lx-theme', root);
  if (tb) tb.onclick = () => { const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; setPrefs({ theme: next }); };

  const bg = $('.lx-bg', root);
  if (bg && !reducedMotion()) {
    let tx = 0.5; let ty = 0.3; let x = tx; let y = ty; let raf = 0;
    const loop = () => { x += (tx - x) * 0.06; y += (ty - y) * 0.06; bg.style.setProperty('--mx', `${(x * 100).toFixed(2)}%`); bg.style.setProperty('--my', `${(y * 100).toFixed(2)}%`); raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.001 ? requestAnimationFrame(loop) : 0; };
    const move = (e) => { tx = e.clientX / innerWidth; ty = e.clientY / innerHeight; if (!raf) raf = requestAnimationFrame(loop); };
    const click = (e) => {
      if (e.target.closest('a, button, input, .lx-cookie')) return;
      const r = document.createElement('span'); r.className = 'lx-ripple';
      r.style.left = `${e.clientX}px`; r.style.top = `${e.clientY}px`;
      root.appendChild(r); setTimeout(() => r.remove(), 1500);
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', click);
    disposers.push(() => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerdown', click); cancelAnimationFrame(raf); });
  }

  // Ask once about browser storage (there are no tracking cookies).
  let choice = null; try { choice = localStorage.getItem('checkit:consent'); } catch { /* private mode */ }
  if (!choice) {
    const c = document.createElement('div');
    c.className = 'lx-cookie'; c.setAttribute('role', 'dialog'); c.setAttribute('aria-label', 'Cookies');
    c.innerHTML = `<span class="lx-cookie-ic">${icon('info', 18)}</span><p><b>Cookies?</b> We only save your settings in this browser. No tracking. <a href="#/cookies">Details</a></p><div class="lx-cookie-btns"><button class="btn pill small ghost" data-c="essential">Only essential</button><button class="btn pill small" data-c="all">Allow</button></div>`;
    root.appendChild(c);
    requestAnimationFrame(() => c.classList.add('on'));
    $$('[data-c]', c).forEach((b) => (b.onclick = () => {
      try { localStorage.setItem('checkit:consent', b.dataset.c); } catch { /* ignore */ }
      c.classList.remove('on'); setTimeout(() => c.remove(), 450);
    }));
  }
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
  cookies: ['Cookies', [
    ['No cookies', 'Check It sets no cookies. There is no analytics, no advertising and no tracking pixel.'],
    ['Browser storage', 'To work without a server, the app saves your account and data in localStorage and IndexedDB in this browser. This is needed for the app to function and never leaves your device.'],
    ['Offline cache', 'A service worker keeps a copy of the app files so it opens offline. It stores code, not personal data.'],
    ['Removing it', 'Use Settings, then Clear all data, or clear site data in your browser.'],
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
      <nav class="lg-switch">${['privacy', 'terms', 'cookies'].filter((x) => x !== kind).map((x) => `<a href="#/${x}">${LEGAL[x][0]}</a>`).join('')}</nav>
    </article>
    ${footerHTML()}
  </div>`;
  toTop();
  bindFooter($('#app'));
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
