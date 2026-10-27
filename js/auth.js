// Local-only accounts. Passwords are salted + hashed (PBKDF2, SHA-256) with WebCrypto
// and never stored in plain text. Nothing leaves the browser.
import { getState, save } from './store.js';

const enc = new TextEncoder();
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex) => new Uint8Array(hex.match(/.{2}/g).map((h) => parseInt(h, 16)));

async function hash(password, saltHex) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: fromHex(saltHex), iterations: 150000, hash: 'SHA-256' }, key, 256);
  return toHex(bits);
}

const norm = (u) => u.trim().toLowerCase();

export async function register(username, name, password) {
  const s = getState();
  const id = norm(username);
  if (id.length < 3) throw new Error('Uživatelské jméno musí mít aspoň 3 znaky.');
  if (!/^[a-z0-9._-]+$/.test(id)) throw new Error('Použij jen písmena bez diakritiky, čísla, tečku, pomlčku nebo podtržítko.');
  if (password.length < 6) throw new Error('Heslo musí mít aspoň 6 znaků.');
  if (s.users[id]) throw new Error('Tohle jméno už je obsazené. Zkus se přihlásit.');
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  s.users[id] = { name: name.trim() || username.trim(), salt, hash: await hash(password, salt), createdAt: Date.now() };
  s.session = id;
  save();
  return id;
}

export async function login(username, password) {
  const s = getState();
  const id = norm(username);
  const u = s.users[id];
  if (!u) throw new Error('Účet s tímhle jménem v tomhle prohlížeči neexistuje.');
  if ((await hash(password, u.salt)) !== u.hash) throw new Error('Špatné heslo.');
  s.session = id;
  save();
  return id;
}

export function logout() {
  const s = getState();
  s.session = null;
  save();
}

export function profile() {
  const s = getState();
  return s.session ? { id: s.session, ...s.users[s.session] } : null;
}

export function hasAnyUser() {
  return Object.keys(getState().users).length > 0;
}
