// Location + weather for the journal.
// - Location is only stored in this browser (profile.location) and is only set after the person agrees.
// - Weather comes from Open-Meteo (free, no account). City search uses Open-Meteo geocoding.
// - "Use my location" asks the browser for permission; if refused, it falls back to an approximate
//   city from the IP address (BigDataCloud), and says so.
import { icon } from './icons.js';
import { esc, $, $$, sheet, toast } from './ui.js';
import { userData, update } from './store.js';

const CACHE_MS = 30 * 60 * 1000;
let memo = null;

export const getLocation = (d = userData()) => (d && d.profile && d.profile.location) || null;

export function setLocation(loc) {
  update((d) => { d.profile = { ...(d.profile || {}), location: loc }; });
  memo = null;
  try { sessionStorage.removeItem('checkit:wx'); } catch {}
}

const CODES = [
  [[0], 'Clear', 'sun'], [[1], 'Mostly clear', 'sun'], [[2], 'Partly cloudy', 'cloud'], [[3], 'Cloudy', 'cloud'],
  [[45, 48], 'Foggy', 'fog'], [[51, 53, 55, 56, 57], 'Drizzle', 'rain'], [[61, 63, 65, 66, 67, 80, 81, 82], 'Rain', 'rain'],
  [[71, 73, 75, 77, 85, 86], 'Snow', 'snow'], [[95, 96, 99], 'Thunderstorm', 'storm'],
];
export function codeInfo(code) {
  const hit = CODES.find(([c]) => c.includes(code));
  return hit ? { text: hit[1], icon: hit[2] } : { text: 'Weather', icon: 'cloud' };
}

export async function getWeather(loc = getLocation()) {
  if (!loc) return null;
  const key = `${loc.lat.toFixed(2)},${loc.lon.toFixed(2)}`;
  if (memo && memo.key === key && Date.now() - memo.at < CACHE_MS) return memo.data;
  try {
    const c = JSON.parse(sessionStorage.getItem('checkit:wx') || 'null');
    if (c && c.key === key && Date.now() - c.at < CACHE_MS) { memo = c; return c.data; }
  } catch {}
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=1&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('weather unavailable');
  const j = await res.json();
  const cur = j.current || {};
  const info = codeInfo(cur.weather_code);
  const data = {
    temp: Math.round(cur.temperature_2m), feels: Math.round(cur.apparent_temperature), code: cur.weather_code, isDay: !!cur.is_day,
    wind: Math.round(cur.wind_speed_10m || 0), text: info.text, icon: cur.is_day === 0 && info.icon === 'sun' ? 'moon' : info.icon,
    max: Math.round(j.daily?.temperature_2m_max?.[0]), min: Math.round(j.daily?.temperature_2m_min?.[0]), rain: j.daily?.precipitation_probability_max?.[0] ?? null,
  };
  memo = { key, at: Date.now(), data };
  try { sessionStorage.setItem('checkit:wx', JSON.stringify(memo)); } catch {}
  return data;
}

// A short, honest suggestion based on mood + weather.
// A nudge for a bad or low mood, worded a little differently each time.
export function lowMoodAdvice(w, place) {
  if (!w) return '';
  const where = place ? ` in ${place}` : '';
  const sky = w.text.toLowerCase();
  const wet = ['rain', 'storm', 'snow'].includes(w.icon) || (w.rain ?? 0) >= 60;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  if (w.icon === 'storm') return pick([`Rough day? There’s a storm${where}, so try ten slow minutes of stretching inside.`, `Not your day? It’s stormy${where}. Open a window, breathe, and stretch for a bit.`]);
  if (wet) return pick([
    `Feeling low? It’s ${w.temp}° and ${sky}${where}, a short walk with a jacket still helps.`,
    `Heavy day? ${w.temp}° and ${sky}${where}. Grab a hood and get ten minutes of fresh air.`,
    `Not great today? It’s ${sky}${where}, but even a quick loop around the block can clear your head.`,
  ]);
  if (w.temp <= 0) return pick([
    `Feeling low? It’s ${w.temp}°${where}, even 10 minutes of cold air can reset your head.`,
    `Rough one? ${w.temp}° and ${sky}${where}. Wrap up warm and take a brisk 10-minute walk.`,
    `Hard day? It’s cold${where} at ${w.temp}°, a few minutes outside can wake you up a little.`,
  ]);
  return pick([
    `Feeling low? It’s ${w.temp}° and ${sky}${where}, a 15-minute walk outside might help.`,
    `Rough day? ${w.temp}° and ${sky}${where}. A short walk could take the edge off.`,
    `Not feeling great? It’s ${sky}${where} at ${w.temp}°, step outside for 15 minutes and see how it feels.`,
    `Heavy day? ${w.temp}° and ${sky}${where}. Some fresh air and a slow walk might lift it a bit.`,
    `Down today? It’s ${w.temp}°${where}, a walk around the block is a small, good start.`,
  ]);
}

export function walkAdvice(w, mood, place) {
  if (!w) return '';
  const where = place ? ` in ${place}` : '';
  const wet = ['rain', 'storm', 'snow'].includes(w.icon) || (w.rain ?? 0) >= 60;
  const low = mood && mood <= 2;
  if (w.icon === 'storm') return `There’s a storm${where} right now, maybe a slow stretch inside instead.`;
  if (wet) return low ? `Feeling low? It’s ${w.temp}° and ${w.text.toLowerCase()}${where}, a short walk with a jacket still helps.` : `${w.temp}° and ${w.text.toLowerCase()}${where}. Take a jacket if you head out.`;
  if (w.temp <= 0) return low ? `Feeling low? It’s ${w.temp}°${where}, even 10 minutes of cold air can reset your head.` : `${w.temp}°${where}. Cold, but clear for a quick walk.`;
  if (w.temp >= 28) return `${w.temp}°${where}, go early or late, and bring water.`;
  return low ? `Feeling low? It’s ${w.temp}° and ${w.text.toLowerCase()}${where}, a 15-minute walk outside might help.` : `${w.temp}° and ${w.text.toLowerCase()}${where}, nice for a walk.`;
}

// ---------- finding a place ----------
export async function searchCity(q) {
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`);
  if (!res.ok) throw new Error('search unavailable');
  const j = await res.json();
  return (j.results || []).map((r) => ({ name: r.name, region: r.admin1 || '', country: r.country || '', lat: r.latitude, lon: r.longitude, source: 'search' }));
}

async function reverse(lat, lon) {
  const q = lat != null ? `?latitude=${lat}&longitude=${lon}&localityLanguage=en` : '?localityLanguage=en';
  const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client${q}`);
  if (!res.ok) throw new Error('lookup failed');
  const j = await res.json();
  return { name: j.city || j.locality || j.principalSubdivision || 'Your area', region: j.principalSubdivision || '', country: j.countryName || '', lat: lat ?? j.latitude, lon: lon ?? j.longitude };
}

export async function detectLocation() {
  const pos = await new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition((p) => resolve(p), () => resolve(null), { timeout: 9000, maximumAge: 3600000 });
  });
  if (pos) {
    const lat = +pos.coords.latitude.toFixed(3); const lon = +pos.coords.longitude.toFixed(3);
    try { return { ...(await reverse(lat, lon)), lat, lon, source: 'device' }; } catch { return { name: 'Your location', region: '', country: '', lat, lon, source: 'device' }; }
  }
  const ip = await reverse(null, null); // approximate, from the IP address
  return { ...ip, source: 'ip' };
}

export const placeLabel = (loc) => (loc ? [loc.name, loc.country].filter(Boolean).join(', ') : '');

// ---------- the "where are you?" sheet ----------
export function locationSheet({ onboarding = false } = {}) {
  return new Promise((resolve) => {
    const cur = getLocation();
    let done = false;
    const s = sheet(`
      <div class="sheet-header">
        <button type="button" class="btn text" data-close>${onboarding ? 'Skip' : 'Cancel'}</button>
        <h3>Your location</h3>
        <span></span>
      </div>
      <div class="sheet-body loc-sheet">
        <span class="notice-ic">${icon('location', 26)}</span>
        <h3 class="sheet-title center">Where do you live?</h3>
        <p class="muted center">Check It uses this only to show today’s weather on your Journal, like “it’s 9° and cloudy, a short walk might help”. It’s saved in this browser, never on a server.</p>
        <button class="btn primary full" id="loc-detect">${icon('location', 16)} Use my location</button>
        <p class="muted small center loc-hint">Your browser will ask for permission. If you say no, we’ll guess the city from your IP address instead.</p>
        <div class="loc-or"><span>or search for a city</span></div>
        <div class="search inline full"><span>${icon('search', 18)}</span><input id="loc-q" placeholder="e.g. Prague" autocomplete="off" value=""></div>
        <div class="loc-res" id="loc-res"></div>
        ${cur ? `<button class="btn text small danger-t" id="loc-clear">Remove saved location (${esc(placeLabel(cur))})</button>` : ''}
      </div>`, { onClose: () => resolve(done ? getLocation() : null) });
    const res = $('#loc-res', s.el);
    const pick = (loc) => { setLocation(loc); done = true; s.close(); toast(`Weather will use ${placeLabel(loc)}.`, { title: 'Location saved', icon: 'location' }); };
    $('#loc-detect', s.el).onclick = async (e) => {
      const b = e.currentTarget; b.disabled = true; b.innerHTML = 'Finding you…';
      try {
        const loc = await detectLocation();
        pick(loc);
        if (loc.source === 'ip') toast('Based on your IP address, so it may be approximate. You can change it in Settings.', { tone: 'info', icon: 'info' });
      } catch {
        b.disabled = false; b.innerHTML = `${icon('location', 16)} Use my location`;
        res.innerHTML = '<p class="muted small">Couldn’t detect your location. Try searching for your city.</p>';
      }
    };
    let t;
    $('#loc-q', s.el).oninput = (e) => {
      clearTimeout(t);
      const q = e.target.value.trim();
      if (q.length < 2) { res.innerHTML = ''; return; }
      t = setTimeout(async () => {
        res.innerHTML = '<p class="muted small">Searching…</p>';
        try {
          const list = await searchCity(q);
          res.innerHTML = list.length ? list.map((l, i) => `<button class="loc-item" data-i="${i}">${icon('location', 16)}<span><b>${esc(l.name)}</b><small>${esc([l.region, l.country].filter(Boolean).join(', '))}</small></span></button>`).join('') : '<p class="muted small">No places found.</p>';
          $$('[data-i]', res).forEach((b) => (b.onclick = () => pick(list[+b.dataset.i])));
        } catch { res.innerHTML = '<p class="muted small">City search is unavailable right now.</p>'; }
      }, 280);
    };
    const clr = $('#loc-clear', s.el);
    if (clr) clr.onclick = () => { update((d) => { if (d.profile) delete d.profile.location; }); memo = null; s.close(); toast('Location removed.', { tone: 'info', icon: 'location' }); };
  });
}
