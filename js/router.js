// Простой hash-роутер: работает на GitHub Pages без настройки сервера.
// Маршрут: #/path/param?query

const routes = [];
let cleanup = null;
let current = { path: null, hash: null };

export function route(pattern, handler, name) {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/\/:(\w+)/g, (_, k) => (keys.push(k), '/([^/]+)')) + '/?$');
  routes.push({ re, keys, handler, name });
}

export function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, qs = ''] = raw.split('?');
  return { path: path || '/', query: Object.fromEntries(new URLSearchParams(qs)) };
}

export function navigate(hash, { replace = false } = {}) {
  const target = hash.startsWith('#') ? hash : '#' + hash;
  if (replace) history.replaceState(null, '', target);
  else history.pushState(null, '', target);
  render();
}

export function render(force = false) {
  if (!force && location.hash === current.hash && current.path !== null) return;
  const { path, query } = parseHash();
  const app = document.getElementById('app');
  for (const r of routes) {
    const m = r.re.exec(path);
    if (!m) continue;
    const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
    const samePage = current.path === path;
    if (cleanup) cleanup();
    cleanup = null;
    current = { path, name: r.name, hash: location.hash };
    app.innerHTML = '';
    const view = document.createElement('div');
    view.className = samePage ? 'view-same' : 'view';
    app.appendChild(view);
    const ret = r.handler(view, params, query);
    if (typeof ret === 'function') cleanup = ret;
    if (!samePage) window.scrollTo(0, 0);
    document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('on', a.dataset.nav === r.name));
    return;
  }
  navigate('#/', { replace: true });
}

export function startRouter() {
  window.addEventListener('hashchange', () => render());
  window.addEventListener('popstate', () => render());
  render(true);
}

export const currentRoute = () => current;
