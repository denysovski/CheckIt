// Onboarding motion piece shown after registration (full) and login (short).
import { icon, logoMark } from './icons.js';
import { esc, reducedMotion } from './ui.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const LOGO = (cls = '') => `<div class="logo-mark ${cls}">${logoMark(cls === 'tiny' ? 'tile' : 'plain')}</div>`;

function letters(text, cls = '') {
  return `<span class="letters ${cls}" aria-label="${esc(text)}">${[...text].map((c, i) =>
    `<span style="--i:${i}">${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('')}</span>`;
}

const SCENES = [
  { id: 's-logo', dur: 3400, html: `
      <div class="stage-center">
        <div class="orb"></div>
        ${LOGO('big')}
        <h1 class="intro-title">${letters('Check It')}</h1>
        <p class="intro-sub fade-up" style="--d:1.6s">Your calm daily rhythm.</p>
      </div>` },
  { id: 's-list', dur: 5200, html: `
      <div class="stage-split">
        <div class="copy">
          <p class="eyebrow fade-up">Checklist</p>
          <h2 class="fade-up" style="--d:.1s">Everything you need to do.<br><span class="soft">In one place.</span></h2>
        </div>
        <div class="mock-list">
          ${[['pin', 'Upload Pinterest pins', '12 / 200 pins'], ['gamepad', 'Download Marvel Rivals videos', '3× a week'], ['tooth', 'Brush teeth', '2× a day'], ['interdental', 'Interdental brushes', 'Every day'], ['braces', 'Put on retainer for the night', 'Every day']]
            .map(([ic, t, f], i) => `
            <div class="mock-row" style="--i:${i}">
              <span class="mock-check"><svg viewBox="0 0 24 24"><path d="M6 12.5l4 4L18 8"/></svg></span>
              <span class="mock-ic">${icon(ic, 20)}</span>
              <span class="mock-text"><b>${t}</b><small>${f}</small></span>
            </div>`).join('')}
        </div>
      </div>` },
  { id: 's-freq', dur: 4200, html: `
      <div class="stage-center">
        <p class="eyebrow fade-up">Frequency</p>
        <h2 class="fade-up" style="--d:.1s">How many times a week? <span class="soft">You decide.</span></h2>
        <div class="freq-demo fade-up" style="--d:.3s">
          <div class="freq-num"><span id="freq-count">1</span><small>× a week</small></div>
          <div class="freq-days">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => `<span style="--i:${i}">${d}</span>`).join('')}</div>
        </div>
      </div>` },
  { id: 's-cal', dur: 4200, html: `
      <div class="stage-split reverse">
        <div class="copy">
          <p class="eyebrow fade-up">Calendar</p>
          <h2 class="fade-up" style="--d:.1s">Every day is a ring.<br><span class="soft">Close it.</span></h2>
        </div>
        <div class="mock-cal">
          ${Array.from({ length: 28 }, (_, i) => {
            const v = [1, 1, .8, 1, .6, 1, 1, .4, 1, 1, 1, .8, 1, .2, 1, 1, .6, 1, 1, 1, .8, 1, 1, 1, .4, 1, 1, 1][i];
            return `<span class="mc-day" style="--i:${i};--v:${v}"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="14" class="t"/><circle cx="18" cy="18" r="14" class="v"/></svg><em>${i + 1}</em></span>`;
          }).join('')}
        </div>
      </div>` },
  { id: 's-stats', dur: 5000, html: `
      <div class="stage-split">
        <div class="copy">
          <p class="eyebrow fade-up">Stats</p>
          <h2 class="fade-up" style="--d:.1s">Numbers that<br><span class="soft">tell the truth.</span></h2>
        </div>
        <div class="mock-stats">
          <div class="bars">${[.7, .9, .55, 1, .8, .35, .95].map((v, i) => `<span style="--i:${i};--v:${v}" class="${v < .5 ? 'low' : ''}"></span>`).join('')}</div>
          <div class="insight-pop">
            <span class="ip-ic">${icon('flag', 18)}</span>
            <div><b>Hey, you skipped the retainer 4×.</b><small>You need to work on this one.</small></div>
          </div>
        </div>
      </div>` },
  { id: 's-notify', dur: 4200, html: `
      <div class="stage-center">
        <p class="eyebrow fade-up">Reminders</p>
        <h2 class="fade-up" style="--d:.1s">Open your browser. <span class="soft">Check It reminds you of the rest.</span></h2>
        <div class="mock-browser fade-up" style="--d:.3s">
          <div class="mb-bar"><i></i><i></i><i></i><span></span></div>
          <div class="mb-body">
            <div class="mb-note">
              <span class="mb-app">${LOGO('tiny')}</span>
              <div><b>You have 3 unfinished tasks</b><small>Brush teeth, Interdental brushes, Retainer…</small></div>
            </div>
          </div>
        </div>
      </div>` },
  { id: 's-end', dur: 0, html: `
      <div class="stage-center">
        <div class="orb end"></div>
        ${LOGO('big')}
        <h1 class="intro-title">${letters('Let’s go.')}</h1>
        <p class="intro-sub fade-up" style="--d:.9s">Your data stays in this browser only.</p>
        <button class="btn primary large fade-up" style="--d:1.2s" id="intro-start">Get started</button>
      </div>` },
];

export function playIntro({ name = '' } = {}) {
  return new Promise((resolve) => {
    const root = document.createElement('div');
    root.className = 'intro';
    root.innerHTML = `
      <div class="intro-progress">${SCENES.map(() => '<span><i></i></span>').join('')}</div>
      <button class="intro-skip" type="button">Skip</button>
      <div class="intro-stage" aria-live="polite"></div>`;
    document.body.appendChild(root);
    const stage = root.querySelector('.intro-stage');
    const bars = [...root.querySelectorAll('.intro-progress span')];
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      root.classList.add('out');
      setTimeout(() => { root.remove(); resolve(); }, 650);
    };
    root.querySelector('.intro-skip').onclick = finish;

    const show = async (i) => {
      const sc = SCENES[i];
      const old = stage.firstElementChild;
      if (old) { old.classList.add('leave'); await sleep(450); old.remove(); }
      const el = document.createElement('section');
      el.className = `scene ${sc.id}`;
      el.innerHTML = sc.html;
      if (i === 1 && name) el.querySelector('.eyebrow').textContent = `Hi, ${name}`;
      stage.appendChild(el);
      void el.offsetWidth;
      el.classList.add('play');
      bars.forEach((b, j) => b.classList.toggle('done', j < i));
      if (bars[i]) { bars[i].classList.add('run'); bars[i].style.setProperty('--dur', `${sc.dur || 1200}ms`); }
      if (sc.id === 's-freq') {
        const c = el.querySelector('#freq-count');
        for (let n = 1; n <= 7; n++) { if (done) break; c.textContent = n; await sleep(330); }
      }
      if (sc.id === 's-end') el.querySelector('#intro-start').onclick = finish;
    };

    (async () => {
      if (reducedMotion()) { root.classList.add('reduced'); await show(SCENES.length - 1); return; }
      for (let i = 0; i < SCENES.length; i++) {
        if (done) return;
        const t0 = performance.now();
        await show(i);
        if (!SCENES[i].dur) return;
        const rest = SCENES[i].dur - (performance.now() - t0);
        if (rest > 0) await sleep(rest);
      }
    })();
  });
}

// Short welcome after login
export function playWelcome(name) {
  return new Promise((resolve) => {
    const root = document.createElement('div');
    root.className = 'intro welcome';
    root.innerHTML = `
      <div class="intro-stage"><section class="scene s-logo play">
        <div class="stage-center">
          <div class="orb"></div>
          ${LOGO('big')}
          <h1 class="intro-title">${letters(`Welcome back${name ? ', ' + name : ''}`)}</h1>
        </div>
      </section></div>`;
    document.body.appendChild(root);
    const end = () => { root.classList.add('out'); setTimeout(() => { root.remove(); resolve(); }, 600); };
    root.onclick = end;
    setTimeout(end, reducedMotion() ? 600 : 2300);
  });
}
