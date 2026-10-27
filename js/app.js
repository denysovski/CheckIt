import { initStore, userData, update, onChange, applyPrefs } from './store.js';
import { profile } from './auth.js';
import { renderShell, openPresets, askNotifications } from './views.js';
import { renderLanding, renderAuthPage, destroyLanding } from './landing.js';
import { playIntro, playWelcome } from './intro.js';
import * as notify from './notify.js';

applyPrefs();
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); window.__installPrompt = e; });

const APP_ROUTES = ['today', 'calendar', 'stats', 'tasks', 'settings'];
const hashRoute = () => (location.hash.replace('#/', '') || '').split('?')[0];
const appRoute = () => (APP_ROUTES.includes(hashRoute()) ? hashRoute() : 'today');

let started = false;
function startApp() {
  destroyLanding();
  if (!APP_ROUTES.includes(hashRoute())) history.replaceState(null, '', '#/today');
  renderShell(appRoute());
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
  history.replaceState(null, '', '#/today');
  startApp();
  await askNotifications();
  if (!userData().tasks.length) openPresets({ first: true });
}

// Logged-out routes: landing (#/), #/login, #/signup
function renderPublic() {
  const r = hashRoute();
  if (r === 'login' || r === 'signup') renderAuthPage(r, afterAuth);
  else renderLanding();
}

async function boot() {
  await initStore();
  notify.registerSW();
  window.addEventListener('hashchange', () => {
    if (profile()) {
      if (!document.querySelector('.shell')) startApp(); else renderShell(appRoute());
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
