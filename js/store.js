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
      { id: 'm-1', channelId: 'ch-general', text: 'This is your own channel. Dump thoughts, links or a quick log of what you did — only you can see it.', ts: now },
    ];
  }
  if (!d.messages) d.messages = [];
  if (!d.notes) {
    const now = Date.now();
    d.notes = [{
      id: 'n-welcome', title: 'Welcome to Notes', tag: 'Guide', pinned: true, createdAt: now, updatedAt: now,
      body: '# Notes\n\nWrite anything here — school notes, plans, lists.\n\n- Use **bold** with two stars\n- Start a line with `- ` for a list\n- Start with `[ ] ` for a checkbox\n\n[ ] Try making your first note\n',
    }];
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
  return JSON.stringify({ app: 'checkit', exportedAt: new Date().toISOString(), user: u, data: state.data[u] }, null, 2);
}

export function importJSON(text) {
  const parsed = JSON.parse(text);
  if (!parsed || parsed.app !== 'checkit' || !parsed.data) throw new Error('Invalid backup file');
  state.data[state.session] = parsed.data;
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
