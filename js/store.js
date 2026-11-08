// Persistent local storage: localStorage + IndexedDB mirror.
// Data lives only in this browser. It survives restarts and is only gone
// when the person clears site data (cookies & site data) for this page.

const KEY = 'checkit:v1';
const DB_NAME = 'checkit';
const STORE = 'kv';

let state = null;
const SESSION_KEY = 'checkit:session'; // used when "Remember me" is off
let ephemeral = false;
const listeners = new Set();

function emptyState() {
  return { version: 1, users: {}, session: null, data: {} };
}

function idb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('no idb'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet() {
  try {
    const db = await idb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const r = tx.objectStore(STORE).get(KEY);
      r.onsuccess = () => resolve(r.result || null);
      r.onerror = () => resolve(null);
    });
  } catch { return null; }
}

let idbTimer = null;
function idbPut(value) {
  clearTimeout(idbTimer);
  idbTimer = setTimeout(async () => {
    try {
      const db = await idb();
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, KEY);
    } catch { /* ignore */ }
  }, 150);
}

function readLocal() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function initStore() {
  let local = readLocal();
  const mirror = await idbGet();
  // Restore from IndexedDB when localStorage was wiped but IDB survived (or vice versa).
  if (!local && mirror) local = mirror;
  if (local && mirror && (mirror.savedAt || 0) > (local.savedAt || 0)) local = mirror;
  state = local || emptyState();
  if (!state.session) {
    try { const sid = sessionStorage.getItem(SESSION_KEY); if (sid && state.users[sid]) { state.session = sid; ephemeral = true; } } catch {}
  }
  // Ask the browser not to evict our storage under pressure.
  try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch {}
  save();
  return state;
}

export function getState() { return state; }

// remember = keep me logged in across browser restarts
export function setSession(id, remember = true) {
  state.session = id;
  ephemeral = !!id && !remember;
  try { if (ephemeral) sessionStorage.setItem(SESSION_KEY, id); else sessionStorage.removeItem(SESSION_KEY); } catch {}
  save();
}

export function save() {
  state.savedAt = Date.now();
  const raw = JSON.stringify(ephemeral ? { ...state, session: null } : state);
  try { localStorage.setItem(KEY, raw); } catch {}
  idbPut(JSON.parse(raw));
  listeners.forEach((fn) => fn(state));
}

export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

// ---- user-scoped data ----
export function currentUser() { return state.session; }

export function userData() {
  const u = state.session;
  if (!u) return null;
  if (!state.data[u]) {
    state.data[u] = {
      tasks: [],
      log: {},           // { 'YYYY-MM-DD': { taskId: count } }
      settings: { reminderTime: '20:00', notifications: false, weekStart: 1 },
      onboarded: false,
      lastNotified: null,
    };
  }
  const d = state.data[u];
  // v3 additions: text channels, notes, completion times
  if (!d.doneAt) d.doneAt = {};
  if (!d.channels) {
    const now = Date.now();
    d.channels = [
      { id: 'ch-general', name: 'general', createdAt: now },
      { id: 'ch-ideas', name: 'ideas', createdAt: now },
    ];
    d.messages = [
      { id: 'm-1', channelId: 'ch-general', text: 'This is your own channel. Dump thoughts, links or a quick log of what you did, only you can see it.', ts: now },
    ];
  }
  if (!d.messages) d.messages = [];
  if (!d.journal) d.journal = {};
  if (!d.plans) d.plans = [];
  if (!d.profile) d.profile = {};
  if (!d.settings.hiddenNudges) d.settings.hiddenNudges = {};
  if (!d.notes) d.notes = [];
  // The built-in Guide replaces the old seeded welcome note (only if it was never edited).
  if (!d.settings.welcomeNoteRemoved) {
    d.notes = d.notes.filter((n) => !(n.id === 'n-welcome' && n.createdAt === n.updatedAt) && !(n.id === 'n-welcome' && n.body && n.body.startsWith('# Notes\n\nWrite anything here')));
    d.settings.welcomeNoteRemoved = true;
  }
  return d;
}

export function update(fn) {
  const d = userData();
  fn(d);
  save();
}

export function exportJSON() {
  const u = state.session;
  return JSON.stringify({ app: 'checkit', version: 4, exportedAt: new Date().toISOString(), user: u, data: state.data[u] }, null, 2);
}

// ---- backup files ----
// A .checkit.json file holds everything for one account: tasks, history, notes, channels, journal, settings.
export function parseBackup(text) {
  let parsed;
  try { parsed = JSON.parse(text); } catch { throw new Error('This file isn’t a Check It backup.'); }
  if (!parsed || parsed.app !== 'checkit' || !parsed.data || typeof parsed.data !== 'object') throw new Error('This file isn’t a Check It backup.');
  const d = parsed.data;
  const arr = (x) => (Array.isArray(x) ? x : []);
  const obj = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
  return {
    meta: { user: parsed.user || '', exportedAt: parsed.exportedAt || '' },
    data: {
      tasks: arr(d.tasks).filter((t) => t && t.id && t.title), log: obj(d.log), doneAt: obj(d.doneAt),
      notes: arr(d.notes).filter((n) => n && n.id), channels: arr(d.channels).filter((c) => c && c.id && c.name),
      messages: arr(d.messages).filter((m) => m && m.id && m.channelId), journal: obj(d.journal),
      settings: obj(d.settings), profile: obj(d.profile), onboarded: true, lastNotified: null,
    },
  };
}

export function backupSummary(data) {
  return { tasks: data.tasks.length, notes: data.notes.length, channels: data.channels.length, messages: data.messages.length, journal: Object.keys(data.journal).length, days: Object.keys(data.log).length };
}

// mode: 'merge' keeps what's here and adds what's new; 'replace' swaps everything.
export function importBackup(incoming, mode = 'merge') {
  const u = state.session;
  if (mode === 'replace') {
    const keepSettings = state.data[u]?.settings || {};
    state.data[u] = { ...incoming, settings: { ...keepSettings, ...incoming.settings } };
    save();
    return;
  }
  const cur = userData();
  const byId = (list, add) => { const ids = new Set(list.map((x) => x.id)); add.forEach((x) => { if (!ids.has(x.id)) list.push(x); }); };
  byId(cur.tasks, incoming.tasks);
  byId(cur.notes, incoming.notes);
  byId(cur.messages, incoming.messages);
  incoming.channels.forEach((c) => { if (!cur.channels.some((x) => x.id === c.id)) cur.channels.push(c); });
  for (const [k, day] of Object.entries(incoming.log)) {
    cur.log[k] = cur.log[k] || {};
    for (const [id, n] of Object.entries(day || {})) cur.log[k][id] = Math.max(cur.log[k][id] || 0, +n || 0);
  }
  for (const [k, day] of Object.entries(incoming.doneAt)) cur.doneAt[k] = { ...(day || {}), ...(cur.doneAt[k] || {}) };
  for (const [k, e] of Object.entries(incoming.journal)) {
    const mine = cur.journal[k];
    if (!mine || !mine.text) cur.journal[k] = e;
    else if (e && e.text && e.text !== mine.text) cur.journal[k] = { ...mine, text: `${mine.text}\n\n${e.text}`, mood: mine.mood ?? e.mood };
  }
  if (!cur.profile.location && incoming.profile.location) cur.profile.location = incoming.profile.location;
  save();
}

// ---- device-wide preferences (theme, motion). Applied before login too. ----
const PREFS_KEY = 'checkit:prefs';
const defaultPrefs = { theme: 'system', motion: true };

export function getPrefs() {
  try { return { ...defaultPrefs, ...(JSON.parse(localStorage.getItem(PREFS_KEY)) || {}) }; } catch { return { ...defaultPrefs }; }
}

export function setPrefs(patch) {
  const p = { ...getPrefs(), ...patch };
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch {}
  applyPrefs();
  return p;
}

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
export function resolvedTheme() {
  const t = getPrefs().theme;
  return t === 'system' ? (darkQuery.matches ? 'dark' : 'light') : t;
}

export function applyPrefs() {
  const root = document.documentElement;
  const theme = resolvedTheme();
  root.dataset.theme = theme;
  root.classList.toggle('no-motion', !getPrefs().motion);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = theme === 'dark' ? '#000000' : '#FFFFFF';
}
darkQuery.addEventListener?.('change', applyPrefs);

// Wipe everything for every account on this device.
export async function clearAllData() {
  try { localStorage.removeItem(KEY); localStorage.removeItem(PREFS_KEY); } catch {}
  try { await new Promise((r) => { const q = indexedDB.deleteDatabase(DB_NAME); q.onsuccess = q.onerror = q.onblocked = () => r(); }); } catch {}
  state = emptyState();
}
