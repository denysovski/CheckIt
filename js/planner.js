// Planner: weekly plans ("sets"). Drag tasks from the right into days, give each a time,
// a repeat rule and a reminder. The active plan makes those tasks due on those days.
import { icon, taskIcon } from './icons.js';
import { esc, $, $$, uid, toast, sheet, confirmSheet } from './ui.js';
import { userData, update } from './store.js';
import { register, rerender } from './router.js';
import { DAY_NAMES, DAY_SHORT, activeTasks, weekStart, todayKey, frequencyLabel, weekday } from './schedule.js';

const REPEAT = [['weekly', 'Every week'], ['biweekly', 'Every other week'], ['once', 'This week only']];
let current = null; // id of the plan being viewed
let libQuery = '';

function plans() { return userData().plans || []; }
function ensurePlan() {
  if (plans().length) return;
  update((d) => { d.plans = [{ id: uid(), name: 'My week', active: true, goal: 0, items: [] }]; });
}
const viewed = () => plans().find((p) => p.id === current) || plans().find((p) => p.active) || plans()[0];

function mutatePlan(fn) {
  const id = viewed().id;
  update((d) => { const p = d.plans.find((x) => x.id === id); if (p) fn(p, d); });
}

export function addToPlan(taskId, day, extra = {}) {
  const ws = weekStart(todayKey());
  let added = null;
  mutatePlan((p) => {
    if (p.items.some((it) => it.taskId === taskId && it.day === day)) return;
    added = { id: uid(), taskId, day, time: '', repeat: 'weekly', notify: false, week: ws, ...extra };
    p.items.push(added);
  });
  return added;
}

function chipHTML(it, t) {
  const rep = it.repeat === 'weekly' ? '' : it.repeat === 'biweekly' ? '2 wk' : 'Once';
  return `
    <div class="pl-chip" data-item="${it.id}" tabindex="0" role="button" aria-label="${esc(t.title)}, ${it.time || 'any time'}. Edit">
      <span class="pl-chip-top"><span class="pl-ic">${taskIcon(t.icon, 14)}</span><small>${it.time ? esc(it.time) : 'Any time'}${it.notify ? icon('bell', 11) : ''}</small></span>
      <b>${esc(t.title)}</b>${rep ? `<em>${rep}</em>` : ''}
    </div>`;
}

function viewPlanner(view) {
  ensurePlan();
  const d = userData();
  const p = viewed();
  current = p.id;
  const tasks = activeTasks(d);
  const byId = new Map(d.tasks.map((t) => [t.id, t]));
  const items = p.items.filter((it) => byId.has(it.taskId));
  const todayWd = weekday(todayKey());
  const q = libQuery.trim().toLowerCase();
  const lib = tasks.filter((t) => !q || t.title.toLowerCase().includes(q));
  const goal = p.goal || 0;
  const pct = goal ? Math.min(100, Math.round((items.length / goal) * 100)) : 0;

  view.innerHTML = `
    <section class="page planner">
      <div class="hero-head">
        <div><h1 class="large-title">Planner.</h1><p class="lead">Drag tasks into days. Set a time and a reminder.</p></div>
      </div>

      <div class="pl-bar">
        <div class="pl-sets" role="tablist" aria-label="Plans">
          ${plans().map((x) => `<button role="tab" class="pl-set ${x.id === p.id ? 'on' : ''}" data-set="${x.id}" aria-selected="${x.id === p.id}">${esc(x.name)}${x.active ? '<i class="pl-live" title="Active"></i>' : ''}</button>`).join('')}
          <button class="pl-set add" id="pl-new">${icon('plus', 14)} New plan</button>
        </div>
        <div class="pl-actions">
          ${p.active ? '<span class="pl-state">Active</span>' : `<button class="btn pill small" id="pl-activate">Use this plan</button>`}
          <button class="icon-btn" id="pl-more" aria-label="Plan options">${icon('more', 18)}</button>
        </div>
      </div>

      <div class="pl-goal">
        <div class="pl-goal-txt"><b>${items.length}</b><span>${goal ? `of ${goal} planned this week` : 'tasks planned this week'}</span></div>
        <div class="pl-goal-bar"><i style="width:${goal ? pct : 0}%"></i></div>
        <label class="pl-goal-in">Weekly goal <input type="number" id="pl-goal" min="0" max="99" value="${goal || ''}" placeholder="0" inputmode="numeric"></label>
      </div>

      <div class="pl-wrap">
        <div class="pl-week" id="pl-week">
          ${DAY_NAMES.map((name, i) => {
            const its = items.filter((it) => it.day === i).sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
            return `
            <div class="pl-day ${i === todayWd ? 'today' : ''}" data-day="${i}">
              <header><b>${DAY_SHORT[i]}</b><span>${its.length || ''}</span></header>
              <div class="pl-drop">${its.map((it) => chipHTML(it, byId.get(it.taskId))).join('')}
                <button class="pl-add" data-add="${i}" aria-label="Add a task to ${name}">${icon('plus', 14)}</button>
              </div>
            </div>`;
          }).join('')}
        </div>

        <aside class="pl-lib">
          <header><h2>Your tasks</h2><span>Drag into a day</span></header>
          <label class="pl-search">${icon('search', 15)}<input id="pl-q" placeholder="Search tasks" value="${esc(libQuery)}" aria-label="Search tasks"></label>
          <div class="pl-lib-list">
            ${lib.map((t) => `
              <button class="pl-task" data-task="${t.id}" aria-label="Plan ${esc(t.title)}">
                <span class="pl-ic">${taskIcon(t.icon, 18)}</span>
                <span class="pl-task-main"><b>${esc(t.title)}</b><small>${esc(frequencyLabel(t))} · ${items.filter((it) => it.taskId === t.id).length} planned</small></span>
                <span class="pl-grip">${icon('more', 16)}</span>
              </button>`).join('') || `<p class="pl-empty">${tasks.length ? 'No match.' : 'No tasks yet. Add some in Tasks.'}</p>`}
          </div>
        </aside>
      </div>
    </section>`;

  // plan tabs and actions
  $$('[data-set]', view).forEach((b) => (b.onclick = () => { current = b.dataset.set; rerender(); }));
  $('#pl-new', view).onclick = () => nameSheet('New plan', '', (name) => {
    const id = uid();
    update((x) => { x.plans.push({ id, name, active: false, goal: 0, items: [] }); });
    current = id; rerender();
  });
  const act = $('#pl-activate', view);
  if (act) act.onclick = () => { update((x) => x.plans.forEach((y) => (y.active = y.id === p.id))); toast(`“${p.name}” is now active`, { title: 'Plan switched', icon: 'calendar' }); rerender(); };
  $('#pl-more', view).onclick = () => planMenu(p);
  const g = $('#pl-goal', view);
  g.onchange = () => { const v = Math.max(0, Math.min(99, parseInt(g.value, 10) || 0)); mutatePlan((x) => { x.goal = v; }); rerender(); };

  const qi = $('#pl-q', view);
  qi.oninput = () => {
    libQuery = qi.value;
    const s = libQuery.trim().toLowerCase();
    $$('.pl-task', view).forEach((b) => { b.hidden = s && !byId.get(b.dataset.task).title.toLowerCase().includes(s); });
  };

  // clicks (keyboard + touch friendly fallback for drag and drop)
  $$('.pl-chip', view).forEach((c) => {
    c.onclick = () => { if (!c.dataset.dragged) itemSheet(c.dataset.item); delete c.dataset.dragged; };
    c.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); itemSheet(c.dataset.item); } };
  });
  $$('[data-add]', view).forEach((b) => (b.onclick = () => pickTaskSheet(+b.dataset.add)));
  $$('.pl-task', view).forEach((b) => (b.onclick = () => { if (!b.dataset.dragged) daysSheet(b.dataset.task); delete b.dataset.dragged; }));

  bindDrag(view);
}

// ------------------------------------------------------------ drag and drop (pointer based: mouse, pen and touch)
function bindDrag(view) {
  const starters = [...$$('.pl-task', view), ...$$('.pl-chip', view)];
  starters.forEach((src) => src.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const sx = e.clientX; const sy = e.clientY;
    let ghost = null; let over = null;
    const isTouch = e.pointerType === 'touch';
    let armed = !isTouch; // on touch, a short hold starts the drag so the page can still scroll
    const hold = isTouch ? setTimeout(() => { armed = true; src.classList.add('pl-armed'); navigator.vibrate && navigator.vibrate(10); }, 260) : 0;
    const move = (ev) => {
      const dx = ev.clientX - sx; const dy = ev.clientY - sy;
      if (!ghost) {
        if (!armed) { if (Math.hypot(dx, dy) > 8) cleanup(); return; }
        if (Math.hypot(dx, dy) < 6) return;
        const r = src.getBoundingClientRect();
        ghost = src.cloneNode(true);
        ghost.className = `${src.className} pl-ghost`;
        Object.assign(ghost.style, { width: `${r.width}px`, left: `${r.left}px`, top: `${r.top}px` });
        document.body.appendChild(ghost);
        src.classList.add('pl-src');
        document.documentElement.classList.add('pl-dragging');
        ghost._ox = sx - r.left; ghost._oy = sy - r.top;
      }
      ev.preventDefault();
      ghost.style.translate = `${ev.clientX - sx}px ${ev.clientY - sy}px`;
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const day = el && el.closest('.pl-day');
      if (day !== over) { over && over.classList.remove('over'); over = day; over && over.classList.add('over'); }
      // auto-scroll the week strip on small screens
      const wk = $('#pl-week', view);
      if (wk) { const wr = wk.getBoundingClientRect(); if (ev.clientX > wr.right - 40) wk.scrollLeft += 12; else if (ev.clientX < wr.left + 40) wk.scrollLeft -= 12; }
    };
    const up = () => {
      const dropped = ghost && over;
      if (ghost) { src.dataset.dragged = '1'; setTimeout(() => delete src.dataset.dragged, 50); }
      if (dropped) {
        const day = +over.dataset.day;
        if (src.dataset.task) {
          const it = addToPlan(src.dataset.task, day);
          if (!it) toast('Already planned that day', { tone: 'info', icon: 'info' });
        } else {
          const id = src.dataset.item;
          mutatePlan((p) => { const it = p.items.find((x) => x.id === id); if (it && !p.items.some((x) => x !== it && x.taskId === it.taskId && x.day === day)) it.day = day; });
        }
      }
      cleanup();
      if (dropped) rerender();
    };
    function cleanup() {
      clearTimeout(hold);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cleanup);
      src.classList.remove('pl-src', 'pl-armed');
      over && over.classList.remove('over');
      ghost && ghost.remove();
      document.documentElement.classList.remove('pl-dragging');
    }
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cleanup);
  }));
}

// ------------------------------------------------------------ sheets
function nameSheet(title, value, onSave) {
  const s = sheet(`
    <form class="sheet-body pl-form">
      <h3 class="sheet-title">${title}</h3>
      <label class="field"><span>Name</span><input id="pl-name" maxlength="40" value="${esc(value)}" placeholder="School week" required></label>
      <div class="row gap pl-actions-row"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Save</button></div>
    </form>`);
  const f = $('form', s.el);
  f.onsubmit = (e) => { e.preventDefault(); const v = $('#pl-name', f).value.trim(); if (!v) return; s.close(); onSave(v); };
}

function planMenu(p) {
  const s = sheet(`
    <div class="sheet-body pl-form">
      <h3 class="sheet-title">${esc(p.name)}</h3>
      <div class="pl-menu">
        <button class="pl-menu-i" data-a="rename">${icon('edit', 18)} Rename</button>
        <button class="pl-menu-i" data-a="dup">${icon('copy', 18)} Duplicate</button>
        <button class="pl-menu-i" data-a="clear">${icon('close', 18)} Clear all days</button>
        ${plans().length > 1 ? `<button class="pl-menu-i danger" data-a="del">${icon('trash', 18)} Delete plan</button>` : ''}
      </div>
      <div class="row gap pl-actions-row"><button class="btn ghost" data-close>Done</button></div>
    </div>`);
  $$('[data-a]', s.el).forEach((b) => (b.onclick = async () => {
    const a = b.dataset.a; s.close();
    if (a === 'rename') nameSheet('Rename plan', p.name, (v) => { mutatePlan((x) => { x.name = v; }); rerender(); });
    if (a === 'dup') { const id = uid(); update((d) => { d.plans.push({ ...JSON.parse(JSON.stringify(p)), id, name: `${p.name} copy`, active: false, items: p.items.map((it) => ({ ...it, id: uid() })) }); }); current = id; rerender(); }
    if (a === 'clear') { if (await confirmSheet('Clear all days?', 'Every task is removed from this plan. Your tasks stay.', 'Clear')) { mutatePlan((x) => { x.items = []; }); rerender(); } }
    if (a === 'del') {
      if (await confirmSheet(`Delete “${p.name}”?`, 'The plan is removed. Your tasks stay.', 'Delete')) {
        update((d) => { d.plans = d.plans.filter((x) => x.id !== p.id); if (!d.plans.some((x) => x.active)) d.plans[0].active = true; });
        current = null; rerender();
      }
    }
  }));
}

function itemSheet(itemId) {
  const p = viewed();
  const it = p.items.find((x) => x.id === itemId);
  if (!it) return;
  const t = userData().tasks.find((x) => x.id === it.taskId);
  const s = sheet(`
    <form class="sheet-body pl-form">
      <div class="pl-form-head"><span class="tile big">${taskIcon(t.icon, 24)}</span><div><h2>${esc(t.title)}</h2><p>${DAY_NAMES[it.day]}</p></div></div>
      <div class="pl-days" role="group" aria-label="Day">${DAY_SHORT.map((dn, i) => `<button type="button" class="pl-dp ${i === it.day ? 'on' : ''}" data-d="${i}" aria-pressed="${i === it.day}">${dn}</button>`).join('')}</div>
      <label class="field"><span>Time</span><input type="time" id="pl-time" value="${esc(it.time || '')}"></label>
      <fieldset class="pl-seg"><legend>Repeat</legend>${REPEAT.map(([v, l]) => `<label><input type="radio" name="rep" value="${v}" ${it.repeat === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</fieldset>
      <label class="pl-switch"><span><b>Reminder</b><small>A notification at the planned time</small></span><input type="checkbox" id="pl-notify" ${it.notify ? 'checked' : ''} role="switch"><i></i></label>
      <div class="row gap pl-actions-row"><button type="button" class="btn ghost danger" id="pl-remove">${icon('trash', 15)} Remove</button><button class="btn primary">Save</button></div>
    </form>`);
  const f = $('form', s.el);
  let day = it.day;
  $$('.pl-dp', f).forEach((b) => (b.onclick = () => { day = +b.dataset.d; $$('.pl-dp', f).forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); }));
  $('#pl-remove', f).onclick = () => { mutatePlan((x) => { x.items = x.items.filter((y) => y.id !== itemId); }); s.close(); rerender(); };
  f.onsubmit = (e) => {
    e.preventDefault();
    const time = $('#pl-time', f).value; const repeat = $('input[name=rep]:checked', f).value; const notify = $('#pl-notify', f).checked;
    mutatePlan((x) => { const y = x.items.find((z) => z.id === itemId); if (y) Object.assign(y, { day, time, repeat, notify, week: repeat === 'weekly' ? y.week : weekStart(todayKey()) }); });
    s.close(); rerender();
    if (notify && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  };
}

// Add one task to several days at once (also the keyboard / touch alternative to dragging).
function daysSheet(taskId, preset = []) {
  const t = userData().tasks.find((x) => x.id === taskId);
  const have = viewed().items.filter((it) => it.taskId === taskId).map((it) => it.day);
  const sel = new Set([...have, ...preset]);
  const s = sheet(`
    <form class="sheet-body pl-form">
      <div class="pl-form-head"><span class="tile big">${taskIcon(t.icon, 24)}</span><div><h2>${esc(t.title)}</h2><p>Pick the days</p></div></div>
      <div class="pl-days" role="group" aria-label="Days">${DAY_SHORT.map((dn, i) => `<button type="button" class="pl-dp ${sel.has(i) ? 'on' : ''}" data-d="${i}" aria-pressed="${sel.has(i)}">${dn}</button>`).join('')}</div>
      <div class="pl-quick"><button type="button" data-q="0,1,2,3,4">Weekdays</button><button type="button" data-q="5,6">Weekend</button><button type="button" data-q="0,1,2,3,4,5,6">Every day</button></div>
      <label class="field"><span>Time</span><input type="time" id="pl-time"></label>
      <label class="pl-switch"><span><b>Reminder</b><small>A notification at that time</small></span><input type="checkbox" id="pl-notify" role="switch"><i></i></label>
      <div class="row gap pl-actions-row"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Save days</button></div>
    </form>`);
  const f = $('form', s.el);
  const paint = () => $$('.pl-dp', f).forEach((b) => { const on = sel.has(+b.dataset.d); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  $$('.pl-dp', f).forEach((b) => (b.onclick = () => { const d = +b.dataset.d; sel.has(d) ? sel.delete(d) : sel.add(d); paint(); }));
  $$('[data-q]', f).forEach((b) => (b.onclick = () => { sel.clear(); b.dataset.q.split(',').forEach((x) => sel.add(+x)); paint(); }));
  f.onsubmit = (e) => {
    e.preventDefault();
    const time = $('#pl-time', f).value; const notify = $('#pl-notify', f).checked;
    mutatePlan((p) => {
      p.items = p.items.filter((it) => it.taskId !== taskId || sel.has(it.day));
      sel.forEach((day) => {
        const ex = p.items.find((it) => it.taskId === taskId && it.day === day);
        if (ex) { if (time) ex.time = time; if (notify) ex.notify = true; } else p.items.push({ id: uid(), taskId, day, time, repeat: 'weekly', notify, week: weekStart(todayKey()) });
      });
    });
    s.close(); rerender();
  };
}

function pickTaskSheet(day) {
  const tasks = activeTasks(userData());
  const s = sheet(`
    <div class="sheet-body pl-form">
      <h3 class="sheet-title">Add to ${DAY_NAMES[day]}</h3>
      <div class="pl-pick">${tasks.map((t) => `<button class="pl-task" data-pick="${t.id}"><span class="pl-ic">${taskIcon(t.icon, 18)}</span><span class="pl-task-main"><b>${esc(t.title)}</b><small>${esc(frequencyLabel(t))}</small></span>${icon('plus', 16)}</button>`).join('') || '<p class="pl-empty">No tasks yet.</p>'}</div>
      <div class="row gap pl-actions-row"><button class="btn ghost" data-close>Close</button></div>
    </div>`);
  $$('[data-pick]', s.el).forEach((b) => (b.onclick = () => { const it = addToPlan(b.dataset.pick, day); s.close(); rerender(); if (it) setTimeout(() => itemSheet(it.id), 320); }));
}

register('planner', (v) => viewPlanner(v));
