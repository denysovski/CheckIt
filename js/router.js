// Tiny hash router shared by all dashboard views.
// Routes look like #/home, #/note/<id>, #/channel/<id>.
const routes = new Map();

export function register(name, fn) { routes.set(name, fn); }
export function has(name) { return routes.has(name); }

export function parse(hash = location.hash) {
  const [name = 'home', ...rest] = hash.replace(/^#\/?/, '').split('?')[0].split('/');
  return { name: name || 'home', param: rest.length ? decodeURIComponent(rest.join('/')) : null };
}

export function current() {
  const r = parse();
  return routes.has(r.name) ? r : { name: 'home', param: null };
}

export function go(name, param) {
  location.hash = `#/${name}${param ? '/' + encodeURIComponent(param) : ''}`;
}

let afterRender = () => {};
export function onRender(fn) { afterRender = fn; }

// Render the current route into the view element.
export function render(view, { enter = true } = {}) {
  const r = current();
  if (!view) return;
  view.classList.remove('enter');
  if (enter) { void view.offsetWidth; view.classList.add('enter'); }
  view.dataset.route = r.name;
  routes.get(r.name)(view, r.param);
  afterRender(r, enter);
}

// Re-render after an action — no entrance animations.
export function rerender() {
  render(document.getElementById('view'), { enter: false });
}
