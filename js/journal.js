// Journal: one entry per day (at least 20 words), a mood, prompts, history and reflections.
import { icon } from './icons.js';
import { esc, $, $$, toast, countUp } from './ui.js';
import { userData, update } from './store.js';
import { register, go, rerender } from './router.js';
import { todayKey, addDays, parseKey, keyOf, daySummary, DAY_NAMES, weekday } from './schedule.js';
import { getLocation, getWeather, walkAdvice, locationSheet, placeLabel } from './weather.js';
import { nudgeStackHTML, bindNudges } from './nudges.js';

export const MIN_WORDS = 20;
export const MOODS = [
  [1, 'Rough', '#E5534B'], [2, 'Low', '#E9925A'], [3, 'Okay', '#C9B458'], [4, 'Good', '#5BB98C'], [5, 'Great', '#0E98BE'],
];
const PROMPTS = [
  'Today I…', 'The best part of today was', 'Something that was hard:', 'I feel… because', 'Tomorrow I want to', 'I’m grateful for',
];
const STOP = new Set('the a an and or but to of in on at for with is was were be been it this that i me my we you he she they them our so just not no yes do did have had has very really then than there here what when about from as by up out today day'.split(' '));

export const wordCount = (t) => ((t || '').trim().match(/[\p{L}\p{N}’'-]+/gu) || []).length;
export const entryOf = (d, k) => (d.journal || {})[k] || null;
export const isComplete = (e) => !!e && wordCount(e.text) >= MIN_WORDS;
const longDate = (k) => parseKey(k).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
const shortDate = (k) => parseKey(k).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const moodOf = (m) => MOODS.find((x) => x[0] === m);
const words = (n) => `${n} ${n === 1 ? 'word' : 'words'}`;

// ------------------------------------------------------------ analysis
export function analyzeJournal(d, days = 30) {
  const today = todayKey();
  const keys = Array.from({ length: days }, (_, i) => addDays(today, -i)).reverse();
  const entries = keys.map((k) => ({ k, e: entryOf(d, k) }));
  const written = entries.filter((x) => x.e && wordCount(x.e.text) > 0);
  const full = entries.filter((x) => isComplete(x.e));
  let streak = 0;
  for (let i = keys.length - 1; i >= 0; i--) {
    const ok = isComplete(entries[i].e);
    if (ok) streak++; else if (keys[i] !== today) break;
  }
  const avgWords = written.length ? Math.round(written.reduce((a, x) => a + wordCount(x.e.text), 0) / written.length) : 0;
  const moods = entries.filter((x) => x.e && x.e.mood);
  const avg = (arr) => (arr.length ? arr.reduce((a, x) => a + x.e.mood, 0) / arr.length : null);
  const last7 = moods.filter((x) => x.k > addDays(today, -7));
  const prev7 = moods.filter((x) => x.k <= addDays(today, -7) && x.k > addDays(today, -14));
  // mood vs tasks
  const rate = (arr) => { const r = arr.map((x) => daySummary(d, x.k)).filter((s) => s.total); return r.length ? r.reduce((a, s) => a + s.done / s.total, 0) / r.length : null; };
  const goodDays = moods.filter((x) => x.e.mood >= 4); const lowDays = moods.filter((x) => x.e.mood <= 2);
  // words
  const freq = {};
  written.forEach((x) => (x.e.text.toLowerCase().match(/[\p{L}’'-]{3,}/gu) || []).forEach((w) => { if (!STOP.has(w)) freq[w] = (freq[w] || 0) + 1; }));
  const topWords = Object.entries(freq).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 8);
  // weekday mood
  const wd = Array.from({ length: 7 }, () => []);
  moods.forEach((x) => wd[weekday(x.k)].push(x.e.mood));
  const wdAvg = wd.map((a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null));

  // reflections, questions, not verdicts
  const refl = [];
  const short = entries.filter((x) => x.k !== today && x.e && wordCount(x.e.text) > 0 && wordCount(x.e.text) < MIN_WORDS).slice(-2);
  short.forEach((x) => refl.push({ key: `journal:short:${x.k}`, tone: 'journal', icon: 'pen', title: `On ${shortDate(x.k)} you wrote only ${words(wordCount(x.e.text))}.`, body: 'Was it a quiet day, or a hard one to put into words? Add a line about what happened.', action: { href: `#/journal/${x.k}`, label: 'Open day' } }));
  const missed7 = keys.slice(-8, -1).filter((k) => !entryOf(d, k) || !wordCount(entryOf(d, k).text));
  if (missed7.length >= 3) refl.push({ key: `journal:missed:${keys.at(-1)}`, tone: 'warn', icon: 'pen', title: `No journal on ${missed7.length} of the last 7 days.`, body: 'Even three sentences count. Try writing right after your evening routine.' });
  const lowRow = moods.slice(-3);
  if (lowRow.length === 3 && lowRow.every((x) => x.e.mood <= 2) && lowRow.at(-1).k >= addDays(today, -3)) refl.push({ key: `journal:low:${lowRow.at(-1).k}`, tone: 'bad', icon: 'heart', title: 'Three low days in a row.', body: 'What’s been weighing on you? Talking to someone you trust can help, so can a walk outside.' });
  const a7 = avg(last7); const p7 = avg(prev7);
  if (a7 != null && p7 != null && a7 - p7 >= 0.6) refl.push({ key: `journal:up:${today}`, tone: 'good', icon: 'arrowUp', title: 'Your mood is up this week.', body: 'What changed? Write it down so you can repeat it.' });
  const rg = rate(goodDays); const rl = rate(lowDays);
  if (rg != null && rl != null && goodDays.length >= 2 && lowDays.length >= 2 && rg - rl >= 0.15) refl.push({ key: 'journal:tasks', tone: 'info', icon: 'chart', title: `On good days you finish ${Math.round(rg * 100)}% of tasks, on low days ${Math.round(rl * 100)}%.`, body: 'Plan lighter on low days; one done task is better than none.' });

  return {
    written: written.length, full: full.length, streak, avgWords, avgMood: avg(moods), last7: a7, prev7: p7,
    moodSeries: keys.slice(-14).map((k) => ({ k, mood: entryOf(d, k)?.mood || null, words: wordCount(entryOf(d, k)?.text) })),
    topWords, wdAvg, reflections: refl,
  };
}

// ------------------------------------------------------------ view
function viewJournal(view, param) {
  const d = userData();
  d.journal = d.journal || {};
  const today = todayKey();
  const k = param && /^\d{4}-\d{2}-\d{2}$/.test(param) && param <= today ? param : today;
  const e = entryOf(d, k) || { text: '', mood: null };
  const wc = wordCount(e.text);
  const a = analyzeJournal(d);
  const hidden = d.settings.hiddenNudges || {};
  const refl = d.settings.nudgesOff ? [] : a.reflections.filter((n) => !(hidden[n.key] && Date.now() - hidden[n.key] < 7 * 86400000));
  const past = Object.keys(d.journal).filter((x) => x !== k && wordCount(d.journal[x].text)).sort().reverse().slice(0, 60);
  const loc = getLocation(d);
  const prompts = PROMPTS.map((p) => `<button type="button" class="chip" data-prompt="${esc(p)}">${esc(p)}</button>`).join('');

  view.innerHTML = `
    <section class="page journal">
      <div class="hero-head">
        <div>
          <p class="eyebrow date">${esc(longDate(k))}</p>
          <h1 class="large-title">How was your day?</h1>
        </div>
        <div class="seg-nav">
          <button class="icon-btn" id="j-prev" aria-label="Previous day">${icon('chevL', 20)}</button>
          <button class="icon-btn" id="j-next" aria-label="Next day" ${k >= today ? 'disabled' : ''}>${icon('chevR', 20)}</button>
        </div>
      </div>

      <div class="j-layout">
        <div class="j-main">
          <div class="card j-editor">
            <div class="j-mood" role="radiogroup" aria-label="Mood">
              <span class="j-label">Mood</span>
              <div class="mood-row">${MOODS.map(([v, l, c]) => `<button type="button" role="radio" aria-checked="${e.mood === v}" class="mood ${e.mood === v ? 'on' : ''}" data-mood="${v}" style="--mc:${c}"><i></i><span>${l}</span></button>`).join('')}</div>
            </div>
            <div class="j-prompts">${prompts}</div>
            <textarea id="j-text" class="j-text" placeholder="What did you do, how do you feel, what’s on your mind? At least ${MIN_WORDS} words.">${esc(e.text)}</textarea>
            <div class="j-foot">
              <div class="j-meter ${wc >= MIN_WORDS ? 'ok' : ''}"><div class="j-bar"><i style="width:${Math.min(100, (wc / MIN_WORDS) * 100)}%"></i></div><span id="j-wc">${wc >= MIN_WORDS ? `${wc} words · entry complete` : `${wc} / ${MIN_WORDS} words`}</span></div>
              <span class="muted small" id="j-save">${e.updatedAt ? 'Saved' : ''}</span>
            </div>
          </div>
          ${refl.length ? `<div class="section-head"><h2>Reflections</h2><span class="muted small">Questions, not judgements</span></div>${nudgeStackHTML(refl, { limit: 4 })}` : ''}
          <div class="section-head"><h2>Past entries</h2><span class="muted small">${a.written} in the last 30 days</span></div>
          ${past.length ? `
          <div class="book" id="book" tabindex="0" aria-label="Past entries. Use the arrow keys to turn pages">
            <div class="book-spread" id="book-spread"></div>
            <div class="book-nav">
              <button class="icon-btn" id="book-prev" aria-label="Newer page">${icon('chevL', 18)}</button>
              <span class="book-pos" id="book-pos"></span>
              <button class="icon-btn" id="book-next" aria-label="Older page">${icon('chevR', 18)}</button>
            </div>
          </div>` : `<div class="empty"><span class="empty-ic">${icon('pen', 26)}</span><p>Your past entries will show up here.</p></div>`}
        </div>

        <aside class="j-side">
          <div class="card j-weather" id="j-weather">
            ${loc ? `<div class="jw-loading"><span class="muted small">${icon('location', 14)} ${esc(placeLabel(loc))}</span><p class="muted">Checking the weather…</p></div>`
              : `<div class="jw-empty"><span class="notice-ic small">${icon('sun', 22)}</span><b>Add your city for weather tips</b><p class="muted small">We’ll suggest a walk when the weather and your mood fit.</p><button class="btn ghost small" id="j-setloc">${icon('location', 14)} Set location</button></div>`}
          </div>
          <div class="card j-stats">
            <div class="card-head"><h3>Your journal</h3><span class="muted small">30 days</span></div>
            <div class="js-kpis">
              <div><b class="num" data-count="${a.streak}">${a.streak}</b><span>day streak</span></div>
              <div><b class="num" data-count="${a.full}">${a.full}</b><span>full entries</span></div>
              <div><b class="num" data-count="${a.avgWords}">${a.avgWords}</b><span>avg. words</span></div>
            </div>
            <div class="mood-chart" aria-label="Mood over the last 14 days">
              ${a.moodSeries.map((x) => { const m = moodOf(x.mood); return `<div class="mc-col" title="${shortDate(x.k)}${m ? ` · ${m[1]}` : ' · no mood'}"><div class="mc-track"><i style="height:${x.mood ? x.mood * 20 : 0}%;${m ? `background:${m[2]}` : ''}"></i></div><span>${DAY_NAMES[weekday(x.k)].slice(0, 1)}</span></div>`; }).join('')}
            </div>
            ${a.avgMood != null ? `<p class="muted small">Average mood: <b>${moodOf(Math.round(a.avgMood))[1]}</b>${a.last7 != null && a.prev7 != null ? ` · ${a.last7 > a.prev7 + 0.2 ? 'up' : a.last7 < a.prev7 - 0.2 ? 'down' : 'steady'} vs last week` : ''}</p>` : '<p class="muted small">Pick a mood each day to see the trend.</p>'}
            ${a.topWords.length ? `<div class="j-words"><span class="j-label">You write about</span><div>${a.topWords.map(([w, n]) => `<span class="chip small">${esc(w)} <em>${n}</em></span>`).join('')}</div></div>` : ''}
          </div>
        </aside>
      </div>
    </section>`;

  // --- editing
  const ta = $('#j-text', view);
  const grow = () => { ta.style.height = 'auto'; ta.style.height = `${Math.max(220, ta.scrollHeight)}px`; };
  grow();
  let t;
  const wasComplete = isComplete(e);
  const save = () => {
    update((x) => {
      x.journal = x.journal || {};
      const cur = x.journal[k] || { createdAt: Date.now() };
      x.journal[k] = { ...cur, text: ta.value, mood: cur.mood ?? null, updatedAt: Date.now() };
      if (!ta.value.trim() && !cur.mood) delete x.journal[k];
    });
    $('#j-save', view).textContent = 'Saved';
  };
  const meter = () => {
    const n = wordCount(ta.value);
    const m = $('.j-meter', view);
    m.classList.toggle('ok', n >= MIN_WORDS);
    $('.j-bar i', view).style.width = `${Math.min(100, (n / MIN_WORDS) * 100)}%`;
    $('#j-wc', view).textContent = n >= MIN_WORDS ? `${n} words · entry complete` : `${n} / ${MIN_WORDS} words`;
    return n;
  };
  ta.oninput = () => {
    grow(); const n = meter();
    $('#j-save', view).textContent = 'Saving…';
    clearTimeout(t); t = setTimeout(() => {
      save();
      if (!wasComplete && n >= MIN_WORDS && !view.dataset.toasted) { view.dataset.toasted = '1'; toast(`${n} words, that’s today’s entry done.`, { title: 'Journal complete', icon: 'pen' }); }
    }, 400);
  };
  $$('[data-prompt]', view).forEach((b) => (b.onclick = () => {
    const p = b.dataset.prompt;
    const sep = ta.value && !ta.value.endsWith('\n') ? '\n' : '';
    ta.value = `${ta.value}${sep}${p} `;
    ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
    ta.dispatchEvent(new Event('input'));
  }));
  $$('[data-mood]', view).forEach((b) => (b.onclick = () => {
    const v = +b.dataset.mood;
    update((x) => { x.journal = x.journal || {}; const cur = x.journal[k] || { text: '', createdAt: Date.now() }; x.journal[k] = { ...cur, text: ta.value, mood: cur.mood === v ? null : v, updatedAt: Date.now() }; });
    const now = entryOf(userData(), k).mood;
    $$('[data-mood]', view).forEach((x) => { const on = +x.dataset.mood === now; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); });
    $('#j-save', view).textContent = 'Saved';
    paintWeather(view, now);
  }));
  // Day to day: the page fades out, the next one fades in.
  const fadeTo = (key) => { const pg = $('.page.journal', view); pg.classList.add('j-out'); pg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: 'ease-in', fill: 'forwards' }); setTimeout(() => go('journal', key), 220); };
  $('#j-prev', view).onclick = () => fadeTo(addDays(k, -1));
  $('#j-next', view).onclick = () => { const n = addDays(k, 1); fadeTo(n >= today ? null : n); };
  const sl = $('#j-setloc', view);
  if (sl) sl.onclick = async () => { await locationSheet(); rerender(); };
  bindNudges(view, () => rerender());
  if (past.length) mountBook(view, past.map((x) => ({ k: x, e: d.journal[x] })));
  paintWeather(view, e.mood);
  if (!param && !e.text) setTimeout(() => ta.focus({ preventScroll: true }), 150);
}

// Past entries as a book: two pages side by side (one on phones), turned with a page-flip.
function pageHTML(p, no) {
  if (!p) return '<article class="bpage blank"><span class="bp-no"></span></article>';
  const m = moodOf(p.e.mood); const n = wordCount(p.e.text);
  return `
    <article class="bpage">
      <header><b>${esc(longDate(p.k))}</b>${m ? `<span class="mood-pill" style="--mc:${m[2]}"><i></i>${m[1]}</span>` : ''}</header>
      <div class="bp-text">${esc(p.e.text).replace(/\n/g, '<br>')}</div>
      <footer><a href="#/journal/${p.k}">${icon('pen', 13)} Edit</a><span class="${n < MIN_WORDS ? 'short' : ''}">${words(n)}</span><span class="bp-no">${no}</span></footer>
    </article>`;
}

function mountBook(view, pages) {
  const book = $('#book', view);
  const spread = $('#book-spread', view);
  const per = () => (window.matchMedia('(max-width: 760px)').matches ? 1 : 2);
  let i = 0; let busy = false;
  const draw = () => {
    const n = per();
    spread.innerHTML = Array.from({ length: n }, (_, j) => pageHTML(pages[i + j], i + j + 1)).join('');
    spread.dataset.per = n;
    $('#book-pos', view).textContent = `${i + 1}${n > 1 && pages[i + 1] ? `–${i + 2}` : ''} of ${pages.length}`;
    $('#book-prev', view).disabled = i === 0;
    $('#book-next', view).disabled = i + n >= pages.length;
  };
  const turn = (dir) => {
    const n = per();
    const next = i + dir * n;
    if (busy || next < 0 || next >= pages.length) return;
    busy = true;
    const reduce = document.documentElement.classList.contains('no-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { i = next; draw(); busy = false; return; }
    // lift the outgoing page, swap the content mid-turn, then lay the new page down
    spread.classList.add(dir > 0 ? 'turn-next' : 'turn-prev', 'out');
    setTimeout(() => {
      i = next; draw();
      spread.classList.remove('out'); spread.classList.add('in');
      setTimeout(() => { spread.classList.remove('in', 'turn-next', 'turn-prev'); busy = false; }, 340);
    }, 260);
  };
  $('#book-prev', view).onclick = () => turn(-1);
  $('#book-next', view).onclick = () => turn(1);
  book.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') turn(1); if (e.key === 'ArrowLeft') turn(-1); });
  let sx = null;
  book.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
  book.addEventListener('touchend', (e) => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) turn(dx < 0 ? 1 : -1); sx = null; });
  let lastPer = per();
  const onResize = () => { if (!document.body.contains(book)) { window.removeEventListener('resize', onResize); return; } if (per() !== lastPer) { lastPer = per(); i -= i % lastPer; draw(); } };
  window.addEventListener('resize', onResize);
  draw();
}

async function paintWeather(view, mood) {
  const box = $('#j-weather', view);
  const loc = getLocation();
  if (!box || !loc) return;
  try {
    const w = await getWeather(loc);
    if (!w || !document.body.contains(box)) return;
    box.innerHTML = `
      <div class="jw">
        <div class="jw-top"><span class="muted small">${icon('location', 14)} ${esc(placeLabel(loc))}</span><button class="btn text small" id="jw-change">Change</button></div>
        <div class="jw-now"><span class="jw-ic">${icon(w.icon, 34)}</span><b class="num">${w.temp}°</b><div><b>${esc(w.text)}</b><small>Feels like ${w.feels}° · ${w.min}° / ${w.max}°${w.rain != null ? ` · ${w.rain}% rain` : ''}</small></div></div>
        <p class="jw-advice">${esc(walkAdvice(w, mood, loc.name))}</p>
      </div>`;
    $('#jw-change', box).onclick = async () => { await locationSheet(); rerender(); };
  } catch {
    box.innerHTML = `<p class="muted small">${icon('location', 14)} ${esc(placeLabel(loc))}, weather is unavailable right now.</p>`;
  }
}

// Small home-panel summary
export function journalPanelHTML(d) {
  const k = todayKey();
  const e = entryOf(d, k);
  const n = wordCount(e?.text);
  const m = moodOf(e?.mood);
  return `
    <section class="panel p-plain j-panel">
      <header class="panel-head"><h2>${icon('pen', 18)} Journal</h2><a href="#/journal" class="view-all">${icon('pen', 13)} Open</a></header>
      <div class="jp-weather-card" id="jp-weather"></div>
      <a class="prow j-prow" href="#/journal">
        <span class="prow-ic">${icon(isComplete(e) ? 'check' : 'pen', 17)}</span>
        <span class="prow-main"><b>${isComplete(e) ? 'Today’s entry is written' : n ? 'Keep going, almost there' : 'How was your day?'}</b><small>${n} / ${MIN_WORDS} words${m ? ` · feeling ${m[1].toLowerCase()}` : ''}</small></span>
        ${m ? `<span class="mood-dot" style="--mc:${m[2]}"></span>` : ''}
      </a>
    </section>`;
}

export async function paintPanelWeather(root) {
  const el = $('#jp-weather', root);
  const loc = getLocation();
  if (!el) return;
  if (!loc) { el.innerHTML = `<a class="jpw empty" href="#/settings"><span class="jpw-ic">${icon('location', 22)}</span><span><b>Add your city</b><small>Get weather and walk tips here</small></span></a>`; return; }
  el.innerHTML = `<div class="jpw loading"><span class="jpw-ic">${icon('cloud', 22)}</span><span><b>--°</b><small>${esc(placeLabel(loc))}</small></span></div>`;
  try {
    const w = await getWeather(loc);
    const mood = entryOf(userData(), todayKey())?.mood;
    if (!w || !document.body.contains(el)) return;
    el.innerHTML = `
      <div class="jpw wx-${w.icon}">
        <span class="jpw-ic">${icon(w.icon, 30)}</span>
        <div class="jpw-main"><b class="num">${w.temp}°</b><span><b>${esc(w.text)}</b><small>${esc(loc.name)} · ${w.min}° / ${w.max}°${w.rain != null ? ` · ${w.rain}% rain` : ''}</small></span></div>
        <p>${esc(walkAdvice(w, mood, ''))}</p>
      </div>`;
  } catch { el.innerHTML = ''; }
}

export function journalMarkdown(d = userData()) {
  const keys = Object.keys(d.journal || {}).sort();
  return keys.map((k) => { const e = d.journal[k]; const m = moodOf(e.mood); return `## ${longDate(k)}${m ? ` (${m[1]})` : ''}\n\n${e.text || ''}`; }).join('\n\n');
}

register('journal', (v, p) => viewJournal(v, p));
export { keyOf };
