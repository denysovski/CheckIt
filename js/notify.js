// Browser reminders.
// - On every app start (e.g. when the browser opens Check It as a startup page or
//   as an installed app) a system notification lists today's unfinished tasks.
// - While the tab is open, a reminder fires once at the chosen time.
// - The app/tab badge and the page title show the number of open tasks.
import { pendingToday, todayKey } from './schedule.js';
import { userData, update } from './store.js';

let swReg = null;

export async function registerSW() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    swReg = await navigator.serviceWorker.register('./sw.js');
    // Chromium installed-PWA bonus: periodic background check.
    if ('periodicSync' in swReg) {
      try {
        const st = await navigator.permissions.query({ name: 'periodic-background-sync' });
        if (st.state === 'granted') await swReg.periodicSync.register('checkit-reminder', { minInterval: 3 * 60 * 60 * 1000 });
      } catch {}
    }
  } catch {}
  return swReg;
}

export const supported = () => 'Notification' in window;
export const permission = () => (supported() ? Notification.permission : 'unsupported');

export async function requestPermission() {
  if (!supported()) return 'unsupported';
  const p = await Notification.requestPermission();
  update((d) => { d.settings.notifications = p === 'granted'; });
  return p;
}

async function show(title, body, tag = 'checkit') {
  if (permission() !== 'granted') return false;
  const opts = { body, tag, icon: 'assets/icon-192.png', badge: 'assets/icon-192.png', renotify: true };
  try {
    const reg = swReg || (await navigator.serviceWorker?.getRegistration());
    if (reg) { await reg.showNotification(title, opts); return true; }
  } catch {}
  try { new Notification(title, opts); return true; } catch { return false; }
}

function summary(list) {
  const names = list.map(({ t }) => t.title);
  const head = names.slice(0, 3).join(', ');
  return names.length > 3 ? `${head} and ${names.length - 3} more` : head;
}

export function syncBadge() {
  const d = userData();
  const n = d ? pendingToday(d).length : 0;
  document.title = n ? `(${n}) Check It` : 'Check It';
  try {
    if ('setAppBadge' in navigator) n ? navigator.setAppBadge(n) : navigator.clearAppBadge();
  } catch {}
  // Let the service worker know too, so periodic checks can notify.
  try {
    navigator.serviceWorker?.controller?.postMessage({ type: 'pending', count: n, names: d ? pendingToday(d).map(({ t }) => t.title) : [] });
  } catch {}
  return n;
}

// Called once after login / app start.
export async function startupReminder() {
  const d = userData();
  if (!d) return;
  const list = pendingToday(d);
  syncBadge();
  if (!list.length) return;
  const word = list.length === 1 ? 'unfinished task' : 'unfinished tasks';
  await show(`You have ${list.length} ${word}`, summary(list), 'checkit-startup');
}

let timer = null;
export function startScheduler() {
  clearInterval(timer);
  const tick = async () => {
    const d = userData();
    if (!d) return;
    syncBadge();
    const now = new Date();
    const [h, m] = (d.settings.reminderTime || '20:00').split(':').map(Number);
    const due = now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
    const key = todayKey();
    if (due && d.lastNotified !== key) {
      const list = pendingToday(d);
      update((x) => { x.lastNotified = key; });
      if (list.length) await show('Your day isn\'t done yet', `Left: ${summary(list)}`, 'checkit-evening');
    }
  };
  tick();
  timer = setInterval(tick, 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
}

export function stopScheduler() { clearInterval(timer); }

export async function testNotification() {
  const ok = await show('Check It works', 'This is how I\'ll remind you about unfinished tasks.', 'checkit-test');
  return ok;
}
