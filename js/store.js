// Persistent local storage: localStorage + IndexedDB mirror.
// Data lives only in this browser. It survives restarts and is only gone
// when the person clears site data (cookies & site data) for this page.

const KEY = 'checkit:v1';
const DB_NAME = 'checkit';
const STORE = 'kv';

let state = null;
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
  // Ask the browser not to evict our storage under pressure.
  try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch {}
  save();
  return state;
}

export function getState() { return state; }

export function save() {
  state.savedAt = Date.now();
  const raw = JSON.stringify(state);
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
  return state.data[u];
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
  if (!parsed || parsed.app !== 'checkit' || !parsed.data) throw new Error('Neplatný soubor');
  state.data[state.session] = parsed.data;
  save();
}
