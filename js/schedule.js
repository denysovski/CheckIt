// Scheduling, history and statistics.

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTHS_GEN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// ---------- dates (local time, YYYY-MM-DD keys) ----------
export const pad = (n) => String(n).padStart(2, '0');
export const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const todayKey = () => keyOf(new Date());
export const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); };
export const weekday = (k) => (parseKey(k).getDay() + 6) % 7; // 0 = Monday
export const weekStart = (k) => addDays(k, -weekday(k));
export const daysBetween = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 86400000);
export function prettyDate(k) {
  const d = parseKey(k);
  return `${DAY_NAMES[weekday(k)]}, ${MONTHS_GEN[d.getMonth()]} ${d.getDate()}`;
}

// ---------- task helpers ----------
export const perDay = (t) => Math.max(1, t.timesPerDay || 1);
export const countOn = (data, t, k) => (data.log[k] && data.log[k][t.id]) || 0;
export const doneOn = (data, t, k) => countOn(data, t, k) >= perDay(t);
export const isFixed = (t) => Array.isArray(t.days) && t.days.length > 0;
export const isDaily = (t) => !isFixed(t) && t.perWeek >= 7;

export function activeOn(t, k) {
  if (t.createdAt && k < t.createdAt) return false;
  if (t.archivedAt && k >= t.archivedAt) return false;
  if (t.finishedAt && k > t.finishedAt) return false;
  return true;
}

export function frequencyLabel(t) {
  const n = perDay(t) > 1 ? ` · ${perDay(t)}× a day` : '';
  if (isFixed(t)) {
    if (t.days.length === 7) return 'Every day' + n;
    return [...t.days].sort().map((d) => DAY_SHORT[d]).join(', ') + n;
  }
  if (t.perWeek >= 7) return 'Every day' + n;
  return `${t.perWeek}× a week` + n;
}

function doneDaysInWeek(data, t, wkStart, untilExclusive) {
  let c = 0;
  for (let i = 0; i < 7; i++) {
    const k = addDays(wkStart, i);
    if (untilExclusive && k >= untilExclusive) break;
    if (doneOn(data, t, k)) c++;
  }
  return c;
}

// Number of days in the week the task was active (handles tasks created mid-week).
function activeDaysInWeek(t, wkStart) {
  let c = 0;
  for (let i = 0; i < 7; i++) if (activeOn(t, addDays(wkStart, i))) c++;
  return c;
}

function weeklyNeed(t, wkStart) {
  return Math.min(t.perWeek, activeDaysInWeek(t, wkStart));
}

/**
 * Status of a task on a given day.
 * kind: 'required' | 'flexible' | 'met' | 'off' | 'inactive'
 */
export function statusOn(data, t, k) {
  if (!activeOn(t, k)) return { kind: 'inactive' };
  const done = doneOn(data, t, k);
  if (isFixed(t)) return { kind: t.days.includes(weekday(k)) ? 'required' : 'off', done };
  if (isDaily(t)) return { kind: 'required', done };
  const ws = weekStart(k);
  const need = weeklyNeed(t, ws);
  const before = doneDaysInWeek(data, t, ws, k);
  const remaining = need - before;
  let daysLeft = 0;
  for (let i = weekday(k); i < 7; i++) if (activeOn(t, addDays(ws, i))) daysLeft++;
  if (remaining <= 0) return { kind: done ? 'flexible' : 'met', done, remaining: 0, need };
  if (remaining >= daysLeft) return { kind: 'required', done, remaining, need };
  return { kind: 'flexible', done, remaining, need };
}

export function activeTasks(data) {
  return data.tasks.filter((t) => !t.archivedAt && !t.finishedAt);
}

export function todayBuckets(data, k = todayKey()) {
  const out = { required: [], flexible: [], done: [] };
  for (const t of data.tasks) {
    const s = statusOn(data, t, k);
    if (s.kind === 'inactive' || s.kind === 'off' || s.kind === 'met') continue;
    if (s.done) out.done.push({ t, s });
    else if (s.kind === 'required') out.required.push({ t, s });
    else out.flexible.push({ t, s });
  }
  return out;
}

export function pendingToday(data) {
  return todayBuckets(data).required;
}

// ---------- day summary for calendar ----------
export function daySummary(data, k) {
  const items = [];
  for (const t of data.tasks) {
    const s = statusOn(data, t, k);
    if (s.kind === 'inactive' || s.kind === 'off' || s.kind === 'met') continue;
    if (s.kind === 'flexible' && !s.done) continue; // optional and not done → doesn't count
    items.push({ t, done: !!s.done, kind: s.kind });
  }
  const done = items.filter((i) => i.done).length;
  return { items, total: items.length, done, ratio: items.length ? done / items.length : null };
}

// ---------- misses ----------
// Returns list of {taskId, date} misses within [from, to] (inclusive, to < today).
export function missesInRange(data, from, to) {
  const today = todayKey();
  const out = [];
  for (const t of data.tasks) {
    if (isFixed(t) || isDaily(t)) {
      for (let k = from; k <= to && k < today; k = addDays(k, 1)) {
        const s = statusOn(data, t, k);
        if (s.kind === 'required' && !s.done) out.push({ taskId: t.id, date: k });
      }
    } else {
      // Weekly quota: evaluate week by week.
      for (let ws = weekStart(from); ws <= to; ws = addDays(ws, 7)) {
        const we = addDays(ws, 6);
        const need = weeklyNeed(t, ws);
        if (!need) continue;
        let missed = 0;
        if (we < today) {
          missed = Math.max(0, need - doneDaysInWeek(data, t, ws));
          for (let i = 0; i < missed; i++) out.push({ taskId: t.id, date: we < to ? we : to });
        } else if (ws <= today) {
          // current week: count only what can no longer be made up
          let left = 0;
          for (let k = today; k <= we; k = addDays(k, 1)) if (activeOn(t, k)) left++;
          missed = Math.max(0, need - doneDaysInWeek(data, t, ws, today) - left);
          for (let i = 0; i < missed; i++) out.push({ taskId: t.id, date: addDays(today, -1) });
        }
      }
    }
  }
  return out.filter((m) => m.date >= from && m.date <= to);
}

// ---------- stats ----------
export function taskStats(data, days = 30) {
  const today = todayKey();
  const from = addDays(today, -(days - 1));
  const misses = missesInRange(data, from, addDays(today, -1));
  return data.tasks.filter((t) => !t.archivedAt).map((t) => {
    let done = 0;
    for (let k = from; k <= today; k = addDays(k, 1)) if (doneOn(data, t, k)) done++;
    const missed = misses.filter((m) => m.taskId === t.id).length;
    const rate = done + missed ? done / (done + missed) : null;
    return { t, done, missed, rate };
  });
}

export function streak(data) {
  let k = todayKey();
  const today = daySummary(data, k);
  // Today counts only if already complete.
  let s = today.total && today.done === today.total ? 1 : 0;
  k = addDays(k, -1);
  for (let i = 0; i < 400; i++) {
    const d = daySummary(data, k);
    if (d.total === 0) { if (!data.tasks.some((t) => activeOn(t, k))) break; k = addDays(k, -1); continue; }
    if (d.done < d.total) break;
    s++;
    k = addDays(k, -1);
  }
  return s;
}

export function dailySeries(data, days = 14) {
  const today = todayKey();
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const k = addDays(today, -i);
    const d = daySummary(data, k);
    out.push({ k, ...d });
  }
  return out;
}

export function weekdayMisses(data, days = 56) {
  const today = todayKey();
  const counts = [0, 0, 0, 0, 0, 0, 0];
  const totals = [0, 0, 0, 0, 0, 0, 0];
  for (let i = 1; i <= days; i++) {
    const k = addDays(today, -i);
    const d = daySummary(data, k);
    totals[weekday(k)] += d.total;
    counts[weekday(k)] += d.total - d.done;
  }
  return { counts, totals };
}

// Human insights — short, varied nudges. Wording rotates by task + day so it doesn't repeat.
const pick = (arr, seed) => arr[Math.abs(seed) % arr.length];
const hash = (str) => [...str].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0);

export function insights(data) {
  const out = [];
  const day = new Date().getDate();
  const stats14 = taskStats(data, 14).filter((s) => s.done + s.missed > 0);
  const worst = [...stats14].sort((a, b) => b.missed - a.missed || (a.rate ?? 1) - (b.rate ?? 1));
  for (const s of worst.slice(0, 3)) {
    if (s.missed < 2) continue;
    const n = s.missed; const t = s.t.title; const seed = hash(t) + day;
    const title = pick([
      `Hey, “${t}” slipped ${n}× lately.`,
      `“${t}” — skipped ${n}× in 2 weeks.`,
      `You keep skipping “${t}”.`,
      `${n} misses on “${t}”.`,
    ], seed);
    const body = pick([
      'Tie it to something you already do.',
      'Give it a fixed time tomorrow.',
      'Make it smaller — just start.',
      'Do it first thing in the morning.',
      'Put it where you can see it.',
      'Two days in a row resets the habit.',
    ], seed + n);
    out.push({ tone: n >= 6 ? 'bad' : 'warn', taskId: s.t.id, title, body });
  }
  const { counts, totals } = weekdayMisses(data);
  const rates = counts.map((c, i) => (totals[i] ? c / totals[i] : 0));
  const wi = rates.indexOf(Math.max(...rates));
  if (totals[wi] >= 3 && rates[wi] >= 0.35) {
    out.push({ tone: 'info', title: pick([`${DAY_NAMES[wi]}s are your weak spot.`, `${DAY_NAMES[wi]}s get away from you.`], day), body: `${Math.round(rates[wi] * 100)}% left undone. Plan them lighter.` });
  }
  const best = stats14.filter((s) => s.rate === 1 && s.done >= 5)[0];
  if (best) {
    const seed = hash(best.t.title) + day;
    out.push({ tone: 'good', title: pick([`Nailing “${best.t.title}”.`, `“${best.t.title}” is on fire.`, `Perfect run on “${best.t.title}”.`], seed), body: pick([`${best.done}× done, zero skipped.`, `${best.done} for ${best.done}. Keep going.`, 'Not a single miss.'], seed) });
  }
  const st = streak(data);
  if (st >= 3) out.push({ tone: 'good', title: pick([`${st}-day streak.`, `${st} perfect days in a row.`], day), body: pick(['Don’t break the chain.', 'Momentum is real.'], st) });
  return out;
}
