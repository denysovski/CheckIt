import { initStore, userData, update, onChange, applyPrefs } from './store.js';
import { profile } from './auth.js';
import { openPresets, askNotifications } from './views.js';
import { mountShell, renderRoute } from './shell.js';
import './notes.js';
import './channels.js';
import './palette.js';
import { has, parse } from './router.js';
import { renderLanding, renderAuthPage, destroyLanding } from './landing.js';
import { playIntro, playWelcome } from './intro.js';
import { initFx } from './fx.js';
import * as notify from './notify.js';

applyPrefs();
initFx();
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); window.__installPrompt = e; });

let started = false;
function startApp() {
  destroyLanding();
  if (!has(parse().name)) history.replaceState(null, '', '#/home');
  if (!document.querySelector('.shell')) mountShell();
  renderRoute();
  if (!started) { notify.startScheduler(); started = true; }
  notify.startupReminder();
}

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
  if (!userData().tasks.length) openPresets({ first: true });
}

// Logged-out routes: landing (#/), #/login, #/signup
function renderPublic() {
  const r = parse().name;
  if (r === 'login' || r === 'signup') renderAuthPage(r, afterAuth);
  else renderLanding();
}

async function boot() {
  await initStore();
  notify.registerSW();
  window.addEventListener('hashchange', () => {
    if (profile()) {
      if (!document.querySelector('.shell')) startApp(); else renderRoute();
    } else {
      window.scrollTo(0, 0);
      renderPublic();
    }
  });
  onChange(() => notify.syncBadge());
  if (profile()) startApp();
  else renderPublic();
}

boot();
