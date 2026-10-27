import { initStore, userData, update, onChange } from './store.js';
import { profile } from './auth.js';
import { renderAuth, renderShell, openPresets } from './views.js';
import { playIntro, playWelcome } from './intro.js';
import * as notify from './notify.js';

window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); window.__installPrompt = e; });

function route() {
  const r = (location.hash.replace('#/', '') || 'today').split('?')[0];
  return ['today', 'calendar', 'stats', 'tasks', 'settings'].includes(r) ? r : 'today';
}

function startApp() {
  renderShell(route());
  notify.startScheduler();
  notify.startupReminder();
}

async function afterAuth(mode) {
  const p = profile();
  const d = userData();
  if (mode === 'register' || !d.onboarded) {
    await playIntro({ name: p.name });
    update((x) => { x.onboarded = true; });
    document.getElementById('app').innerHTML = '';
    location.hash = '#/today';
    startApp();
    if (!d.tasks.length) setTimeout(() => openPresets({ first: true }), 250);
  } else {
    await playWelcome(p.name);
    document.getElementById('app').innerHTML = '';
    location.hash = '#/today';
    startApp();
  }
}

async function boot() {
  await initStore();
  notify.registerSW();
  window.addEventListener('hashchange', () => { if (profile()) renderShell(route()); });
  onChange(() => notify.syncBadge());
  if (profile()) startApp();
  else renderAuth(afterAuth, Object.keys((await import('./store.js')).getState().users).length ? 'login' : 'register');
}

boot();
