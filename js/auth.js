// Local-only accounts. Passwords are salted + hashed (PBKDF2, SHA-256) with WebCrypto
// and never stored in plain text. Nothing leaves the browser.
import { getState, save, setSession } from './store.js';

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

export const MIN_USERNAME = 6; // "longer than 5 characters"
export const PASSWORD_RULES = [
  { id: 'len', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'lower', label: 'A lowercase letter', test: (p) => /[a-z]/.test(p) },
  { id: 'upper', label: 'An uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'num', label: 'A number', test: (p) => /[0-9]/.test(p) },
  { id: 'sym', label: 'A symbol (!@#…)', test: (p) => /[^A-Za-z0-9\s]/.test(p) },
];
export const passwordOk = (p) => PASSWORD_RULES.every((r) => r.test(p));
export function usernameError(u) {
  const id = norm(u);
  if (id.length < MIN_USERNAME) return `Username must be longer than ${MIN_USERNAME - 1} characters.`;
  if (!/^[a-z0-9._-]+$/.test(id)) return 'Use only letters, numbers, dot, dash or underscore.';
  return '';
}

export async function register(username, password, confirm = password) {
  const s = getState();
  const id = norm(username);
  const name = username.trim();
  const ue = usernameError(username);
  if (ue) throw new Error(ue);
  if (!passwordOk(password)) throw new Error('Your password doesn’t meet all the requirements yet.');
  if (password !== confirm) throw new Error('Passwords don’t match.');
  if (s.users[id]) throw new Error('This username is taken. Try logging in.');
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  s.users[id] = { name, salt, hash: await hash(password, salt), createdAt: Date.now() };
  setSession(id, true);
  return id;
}

export async function login(username, password, remember = true) {
  const s = getState();
  const id = norm(username);
  const u = s.users[id];
  if (!u) throw new Error('No account with this username in this browser.');
  if ((await hash(password, u.salt)) !== u.hash) throw new Error('Wrong password.');
  setSession(id, remember);
  return id;
}

export function logout() {
  setSession(null, true);
}

export function profile() {
  const s = getState();
  return s.session ? { id: s.session, ...s.users[s.session] } : null;
}

export function hasAnyUser() {
  return Object.keys(getState().users).length > 0;
}
