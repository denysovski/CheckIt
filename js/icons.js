// Minimal line glyphs (24×24, 1.75 stroke) in the spirit of SF Symbols,
// plus brand logos loaded from SVGL (https://svgl.app).

const P = {
  // UI
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  chevL: '<path d="M15 5l-7 7 7 7"/>',
  chevR: '<path d="M9 5l7 7-7 7"/>',
  today: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15" rx="3.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  chart: '<path d="M5 20V11M12 20V5M19 20v-6"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r=".8"/><circle cx="4.5" cy="12" r=".8"/><circle cx="4.5" cy="18" r=".8"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  logout: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M10 16l-4-4 4-4M6 12h10"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
  sparkle: '<path d="M12 3l2 5.5L19.5 10.5 14 12.5 12 18l-2-5.5L4.5 10.5 10 8.5z"/>',
  archive: '<rect x="3.5" y="4.5" width="17" height="4.5" rx="1.5"/><path d="M5 9v9.5a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5V9M10 13h4"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
  more: '<circle cx="5.5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18.5" cy="12" r="1.2"/>',
  arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  arrowDown: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M4 4l16 16"/><path d="M9.9 5.8A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.7 3.4M6.6 7.1C4 8.9 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1.1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  hash: '<path d="M9 4L7 20M17 4l-2 16M4.5 9h16M3.5 15h16"/>',
  home: '<path d="M4 10.5L12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19z"/>',
  doc: '<path d="M7 3.5h7l4.5 4.5v11A1.5 1.5 0 0 1 17 20.5H7A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5z"/><path d="M13.5 3.5V8.5H18.5M9 13h6M9 16.5h4"/>',
  compose: '<path d="M12 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5V12"/><path d="M17.5 3.5l3 3L12 15l-4 1 1-4z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  send: '<path d="M4 12l16-7.5-6 16-2.5-6.5z"/><path d="M11.5 14l3-3"/>',
  thumbtack: '<path d="M9 4h6l-1 5 3.5 3.5H6.5L10 9z"/><path d="M12 12.5V20"/>',
  tag: '<path d="M3.5 12V4.5a1 1 0 0 1 1-1H12l8.5 8.5-8 8z"/><circle cx="8" cy="8" r="1.5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/>',
  sidebar: '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><path d="M9.5 4.5v15"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
  // Task glyphs
  tooth: '<path d="M7.5 3.5c-2.5 0-4 2-4 4.5 0 2.2 1 3.5 1.5 5.5.6 2.6.8 7 2.8 7 1.7 0 1.6-4.5 4.2-4.5s2.5 4.5 4.2 4.5c2 0 2.2-4.4 2.8-7 .5-2 1.5-3.3 1.5-5.5 0-2.5-1.5-4.5-4-4.5-1.8 0-2.6 1-4.5 1s-2.7-1-4.5-1z"/>',
  brush: '<path d="M4 20l9.5-9.5"/><rect x="12" y="3.5" width="5" height="9" rx="1.5" transform="rotate(45 14.5 8)"/><path d="M15 5l1-1M17 7l1-1M19 9l1-1"/>',
  interdental: '<rect x="2.5" y="15.75" width="10" height="3.5" rx="1.75" transform="rotate(-45 7.5 17.5)"/><path d="M11 13l8-8"/><path d="M13.6 8.6l2.4 2.4M15.4 6.8l2.4 2.4M17.2 5l1.8 1.8M12.2 10.6l1.6 1.6"/>',
  moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
  braces: '<path d="M3.5 10c3 1.5 5.5 2 8.5 2s5.5-.5 8.5-2"/><path d="M3.5 10c1 4.5 4 7 8.5 7s7.5-2.5 8.5-7"/><path d="M8 11.6v2M12 12v2.3M16 11.6v2"/>',
  pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="3"/><path d="M16 10.5l5-3v9l-5-3"/>',
  download: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14"/>',
  upload: '<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M5 19.5h14"/>',
  book: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z"/>',
  dumbbell: '<path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
  drop: '<path d="M12 3.5s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  pill: '<rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="M9.5 9.5l5 5"/>',
  leaf: '<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19l7-7"/>',
  heart: '<path d="M12 20s-7.5-4.5-7.5-10A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7.5 3c0 5.5-7.5 10-7.5 10z"/>',
  code: '<path d="M8.5 7L3.5 12l5 5M15.5 7l5 5-5 5"/>',
  music: '<path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  camera: '<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7H8l1.5-2.5h5L16 7h2.5A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="13" r="3.3"/>',
  bed: '<path d="M3 18V6M3 14h18v4M21 14v-2.5A2.5 2.5 0 0 0 18.5 9H11v5"/><circle cx="7" cy="11" r="1.8"/>',
  run: '<circle cx="15" cy="4.5" r="1.8"/><path d="M7 20l3.5-5 3 2.5 1-5.5M10 9.5l3.5-1.5 3 3.5 3 .5M6 12l2-3h3"/>',
  cart: '<path d="M3 4h2.5l2.2 11h10l2-7.5H6.5"/><circle cx="9" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 7l8 6 8-6"/>',
  star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
  flame: '<path d="M12 21a6 6 0 0 0 6-6c0-4.5-4-6.5-4.5-11-2.5 2-4 4.5-4 7-1-.5-1.5-1.5-1.8-2.5C6.5 10 6 12.5 6 15a6 6 0 0 0 6 6z"/>',
  gamepad: '<path d="M7 7.5h10a4.5 4.5 0 0 1 4.4 5.4l-.9 4.2a2.5 2.5 0 0 1-4.3 1.1L14.5 16h-5l-1.7 2.2a2.5 2.5 0 0 1-4.3-1.1l-.9-4.2A4.5 4.5 0 0 1 7 7.5z"/><path d="M8 10.5v3M6.5 12h3M15.5 11.5h.01M17.5 13h.01"/>',
  broom: '<path d="M19 3l-7.5 7.5"/><path d="M11.5 10.5c-3 0-5 2-6.5 4.5l4 4c2.5-1.5 4.5-3.5 4.5-6.5z"/><path d="M8 16.5L5.5 19"/>',
  brain: '<path d="M9 4.5A2.5 2.5 0 0 0 6.5 7 2.5 2.5 0 0 0 4.5 11a2.5 2.5 0 0 0 1 4.5A2.5 2.5 0 0 0 9 19.5h3v-15zM15 4.5A2.5 2.5 0 0 1 17.5 7a2.5 2.5 0 0 1 2 4 2.5 2.5 0 0 1-1 4.5 2.5 2.5 0 0 1-3.5 4H12"/>',
};

export const TASK_GLYPHS = ['tooth', 'brush', 'interdental', 'braces', 'moon', 'sun', 'pin', 'video', 'download', 'upload', 'gamepad', 'book', 'dumbbell', 'run', 'drop', 'pill', 'leaf', 'heart', 'brain', 'code', 'music', 'camera', 'bed', 'cart', 'mail', 'broom', 'star', 'flame'];

export function icon(name, size = 22, extra = '') {
  const body = P[name] || P.star;
  const filled = name === 'play' ? ' fill="currentColor"' : ' fill="none"';
  return `<svg class="ic ${extra}" width="${size}" height="${size}" viewBox="0 0 24 24"${filled} stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

// ---------- SVGL ----------
const SVGL_API = 'https://api.svgl.app';
const cache = new Map();

export function svglSrc(route) {
  if (!route) return '';
  if (typeof route === 'string') return route;
  return route.light || route.dark || '';
}

export async function searchSvgl(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  if (cache.has(q)) return cache.get(q);
  const res = await fetch(`${SVGL_API}?search=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error('SVGL nedostupné');
  const json = await res.json();
  const items = (Array.isArray(json) ? json : []).slice(0, 24).map((i) => ({ title: i.title, src: svglSrc(i.route) }));
  cache.set(q, items);
  return items;
}

// Render a task icon object { kind: 'glyph' | 'svgl', value }
// Brand logos that also have a matching glyph if SVGL can't be reached.
const LOGO_FALLBACK = { pinterest: 'pin', youtube: 'video', twitch: 'video', discord: 'mail', spotify: 'music', github: 'code', instagram: 'camera' };

export function taskIcon(ic, size = 22) {
  if (ic && ic.kind === 'svgl' && ic.value) {
    const slug = (ic.value.split('/').pop() || '').replace(/(-light|-dark)?\.svg$/, '');
    const fb = icon(ic.fallback || LOGO_FALLBACK[slug] || 'star', size).replace(/"/g, '&quot;');
    return `<span class="ic-wrap" style="width:${size}px;height:${size}px"><img class="ic-img" src="${ic.value}" width="${size}" height="${size}" alt="" loading="lazy" referrerpolicy="no-referrer" data-fb="${fb}" onerror="this.parentNode.innerHTML=this.dataset.fb"></span>`;
  }
  return icon((ic && ic.value) || 'star', size);
}

// ---------- Brand mark: a checkmark drawn with dots ----------
export const LOGO_DOTS = [[15, 31], [21, 37], [27, 43], [34.33, 35.33], [41.67, 27.67], [49, 20]];

// variant: 'plain' (ink dots, blue last dot) | 'tile' (white dots on ink tile)
export function logoMark(variant = 'plain', cls = '') {
  const tile = variant === 'tile';
  const dots = LOGO_DOTS.map(([x, y], i) => {
    const last = i === LOGO_DOTS.length - 1;
    return `<circle class="ld${last ? ' ld-end' : ''}" style="--i:${i}" cx="${x}" cy="${y}" r="${last ? 4 : 3.1}"/>`;
  }).join('');
  return `<svg class="logo-svg v-${variant} ${cls}" viewBox="0 0 64 64" aria-hidden="true">${tile ? '<rect class="lt-bg" x="2" y="2" width="60" height="60" rx="16"/>' : ''}${dots}</svg>`;
}
