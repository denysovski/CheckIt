import { initStore, userData, update, onChange, applyPrefs } from './store.js';
import { profile } from './auth.js';
import { openPresets, askNotifications } from './views.js';
import { mountShell, renderRoute } from './shell.js';
import './notes.js';
import './journal.js';
import './planner.js';
import { ensureRecaps, showNewRecap } from './recaps.js';
import { locationSheet } from './weather.js';
import './channels.js';
import './palette.js';
import { has, parse } from './router.js';
import { renderLanding, renderAuthPage, destroyLanding, renderLegal } from './landing.js';
import { playIntro, playWelcome } from './intro.js';
import * as notify from './notify.js';

applyPrefs();
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); window.__installPrompt = e; });

let started = false;
function startApp() {
  destroyLanding();
  if (!has(parse().name)) history.replaceState(null, '', '#/home');
  if (!document.querySelector('.shell')) mountShell();
  renderRoute();
  if (!started) { notify.startScheduler(); started = true; }
  notify.startupReminder();
  // Weekly recap: generated from Monday 00:01, shown once.
  const checkRecap = () => { if (!profile() || document.querySelector('.sheet-wrap')) return; if (ensureRecaps().length) refreshNav(); showNewRecap() && refreshNav(); };
  setTimeout(checkRecap, 900);
  clearInterval(window.__recapTimer); window.__recapTimer = setInterval(checkRecap, 60 * 1000);
}
function refreshNav() { import('./shell.js').then((m) => m.refreshSidebar()); }

async function afterAuth(mode) {
  const p = profile();
  const d = userData();
  document.getElementById('app').innerHTML = '';
  if (mode === 'register' || !d.onboarded) {
    await playIntro({ name: p.name });
    update((x) => { x.onboarded = true; });
  } else {
    await playWelcome(p.name);
  }
  history.replaceState(null, '', '#/home');
  startApp();
  await askNotifications();
  if (mode === 'register' && !(userData().profile && userData().profile.location)) await locationSheet({ onboarding: true });
  if (!userData().tasks.length) openPresets({ first: true });
}

// Logged-out routes: landing (#/), #/login, #/signup
function renderPublic() {
  const r = parse().name;
  if (r === 'login' || r === 'signup') renderAuthPage(r, afterAuth);
  else if (r === 'privacy' || r === 'terms') renderLegal(r);
  else renderLanding();
}

function showWelcome() {
  document.querySelector('.shell') && (document.getElementById('app').innerHTML = '');
  document.body.classList.remove('drawer-open');
  renderLanding({ loggedIn: true, name: profile().name });
}

async function boot() {
  await initStore();
  notify.registerSW();
  window.addEventListener('hashchange', () => {
    if (profile()) {
      if (parse().name === 'welcome') { window.scrollTo(0, 0); showWelcome(); return; }
      if (['privacy', 'terms'].includes(parse().name)) { document.body.classList.remove('drawer-open'); renderLegal(parse().name, true); return; }
      if (!document.querySelector('.shell')) startApp(); else renderRoute();
    } else {
      window.scrollTo(0, 0);
      renderPublic();
    }
  });
  onChange(() => notify.syncBadge());
  const n0 = parse().name;
  if (profile()) (n0 === 'welcome' ? showWelcome() : ['privacy', 'terms'].includes(n0) ? renderLegal(n0, true) : startApp());
  else renderPublic();
}

boot();
