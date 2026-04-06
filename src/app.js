const TAGLINES = [
  'Where to?',
  'sudo navigate',
  'Which rabbit hole today?',
  'Pick your poison.',
  'RTFM — or just click something.',
  'What are we breaking today?',
  'git checkout somewhere',
  '404: destination not found. Pick one.',
  'All roads lead to a 500.',
  'Select your blast radius.',
  'It works on my machine™',
  'curl | bash your way through the day',
  'In prod we trust.',
  'Uptime not guaranteed.',
  'rm -rf /doubts',
  'Have you tried turning it off and on again?',
  'Deploy early, apologize later.',
  'All systems go (probably).',
  'chmod +x your morning',
  'No stack trace required.',
  'Enterprise-grade clicking experience.',
  'Your /dev/null moment of the day.',
];
const app        = document.getElementById('app');
const taglineEl  = document.getElementById('tagline');
const overlay    = document.getElementById('search-overlay');
const input      = document.getElementById('search-input');
const results    = document.getElementById('search-results');
const breadcrumb = document.getElementById('breadcrumb');

let root, current, history = [], crumbNames = [];
let matchedItems = [], selectedIdx = -1, searchScope = [];

/* ── Collect every leaf service from a subtree ─────────────────────────────── */
function collectFrom(items) {
  const out = [];
  items.forEach(item => {
    if (item.children) out.push(...collectFrom(item.children));
    else out.push(item);
  });
  return out;
}

/* ── Fuzzy match on joined corpus ───────────────────────────────────────────── */
function fuzzy(needle, haystack) {
  needle = needle.toLowerCase();
  haystack = haystack.toLowerCase();
  let hi = 0;
  for (let ni = 0; ni < needle.length; ni++) {
    hi = haystack.indexOf(needle[ni], hi);
    if (hi === -1) return false;
    hi++;
  }
  return true;
}

/* ── Highlight matched chars in a single string ─────────────────────────────── */
function highlight(needle, text) {
  if (!needle) return text;
  needle = needle.toLowerCase();
  let ni = 0, out = '';
  for (let hi = 0; hi < text.length; hi++) {
    if (ni < needle.length && text[hi].toLowerCase() === needle[ni]) {
      out += `<mark>${text[hi]}</mark>`;
      ni++;
    } else {
      out += text[hi];
    }
  }
  return out;
}

function searchServices(query) {
  return searchScope.filter(s => {
    const corpus = [s.name, ...(s.keywords || [])].join(' ');
    return fuzzy(query, corpus);
  });
}

/* ── Search overlay ────────────────────────────────────────────────────────── */
function openSearch(scope) {
  searchScope = scope;
  overlay.classList.remove('hidden');
  input.value = '';
  matchedItems = [];
  selectedIdx = -1;
  results.replaceChildren();
  input.focus();
}

function closeSearch() {
  overlay.classList.add('hidden');
  input.value = '';
  matchedItems = [];
  selectedIdx = -1;
  results.replaceChildren();
}

function setSelected(idx) {
  const items = results.querySelectorAll('li');
  if (items[selectedIdx]) items[selectedIdx].classList.remove('selected');
  selectedIdx = idx;
  if (items[selectedIdx]) {
    items[selectedIdx].classList.add('selected');
    items[selectedIdx].scrollIntoView({ block: 'nearest' });
  }
}

function openSelected() {
  const target = selectedIdx >= 0 ? matchedItems[selectedIdx] : matchedItems[0];
  if (target) { closeSearch(); window.open(target.url, '_blank'); }
}

function renderResults(items, query) {
  matchedItems = items;
  selectedIdx = -1;
  const frag = document.createDocumentFragment();
  items.forEach((item, i) => {
    const li = document.createElement('li');

    const main = document.createElement('div');
    main.className = 'result-main';
    main.innerHTML = `<span class="result-icon">${item.icon}</span><span class="result-name">${highlight(query, item.name)}</span>`;

    const kws = document.createElement('div');
    kws.className = 'result-keywords';
    (item.keywords || []).forEach(kw => {
      const span = document.createElement('span');
      span.className = 'kw';
      span.innerHTML = highlight(query, kw);
      kws.appendChild(span);
    });

    li.appendChild(main);
    li.appendChild(kws);
    li.addEventListener('click', () => { closeSearch(); window.open(item.url, '_blank'); });
    frag.appendChild(li);
  });
  results.replaceChildren(frag);
}

input.addEventListener('input', () => renderResults(searchServices(input.value), input.value));

input.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeSearch(); return; }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    setSelected(Math.min(selectedIdx + 1, matchedItems.length - 1));
    return;
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    setSelected(Math.max(selectedIdx - 1, 0));
    return;
  }
  if (e.key === 'Enter') openSelected();
});

/* ── Breadcrumb ────────────────────────────────────────────────────────────── */
function renderBreadcrumb() {
  const frag = document.createDocumentFragment();

  const root_crumb = document.createElement('span');
  root_crumb.className = 'crumb' + (crumbNames.length === 0 ? ' current' : ' link');
  root_crumb.textContent = '~';
  if (crumbNames.length > 0) {
    root_crumb.addEventListener('click', () => {
      current = root; history = []; crumbNames = [];
      render(current); renderBreadcrumb();
    });
  }
  frag.appendChild(root_crumb);

  crumbNames.forEach(({name, icon}, i) => {
    const sep = document.createElement('span');
    sep.className = 'sep';
    sep.textContent = '/';
    frag.appendChild(sep);

    const crumb = document.createElement('span');
    const isCurrent = i === crumbNames.length - 1;
    crumb.className = 'crumb' + (isCurrent ? ' current' : ' link');
    crumb.textContent = `${icon} ${name}`;
    if (!isCurrent) {
      crumb.addEventListener('click', () => {
        current = history[i + 1];
        history = history.slice(0, i + 1);
        crumbNames = crumbNames.slice(0, i + 1);
        render(current); renderBreadcrumb();
      });
    }
    frag.appendChild(crumb);
  });

  breadcrumb.replaceChildren(frag);
}

/* ── Tile rendering ────────────────────────────────────────────────────────── */
function render(items) {
  const frag = document.createDocumentFragment();
  items.forEach(item => {
    const tile = document.createElement('div');
    tile.className = 'tile' + (item.children ? ' group' : ' service');
    tile.dataset.shortcut = item.shortcut;
    tile.innerHTML = `<span class="icon">${item.icon}</span><span class="name">${item.name}</span><span class="shortcut">${item.shortcut}</span>`;
    tile.addEventListener('click', () => activate(item));
    frag.appendChild(tile);
  });
  app.replaceChildren(frag);
}

function activate(item) {
  if (item.children) {
    history.push(current);
    crumbNames.push({name: item.name, icon: item.icon});
    current = item.children;
    window.history.pushState(null, '');
    render(current);
    renderBreadcrumb();
  } else {
    window.open(item.url, '_blank');
    history = []; crumbNames = [];
    current = root;
    render(current);
    renderBreadcrumb();
  }
}

/* ── Browser back (mouse button, Alt+Left, keyboard, any gesture) ──────────── */
window.addEventListener('popstate', () => {
  if (history.length) { current = history.pop(); crumbNames.pop(); }
  else current = root;
  render(current); renderBreadcrumb();
});

/* ── Global keydown ────────────────────────────────────────────────────────── */
window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === '/') { e.preventDefault(); openSearch(collectFrom(current)); return; }
  if (e.key === '?') { e.preventDefault(); openSearch(collectFrom(root)); return; }
  if (e.key === 'Escape') {
    if (history.length) { current = history.pop(); crumbNames.pop(); }
    else current = root;
    render(current); renderBreadcrumb();
    return;
  }
  const item = current.find(i => i.shortcut === e.key);
  if (item) activate(item);
});

/* ── URL parameter navigation ─────────────────────────────────────────────── */
function navigateToPath(path) {
  const shortcuts = path.split('/').filter(Boolean);
  for (const shortcut of shortcuts) {
    const item = current.find(i => i.shortcut === shortcut);
    if (!item) break;
    if (item.children) {
      history.push(current);
      crumbNames.push({name: item.name, icon: item.icon});
      current = item.children;
    } else {
      window.open(item.url, '_blank');
      history = []; crumbNames = [];
      current = root;
      break;
    }
  }
  render(current);
  renderBreadcrumb();
}

/* ── Bootstrap ─────────────────────────────────────────────────────────────── */
fetch('config.yaml')
  .then(r => r.text())
  .then(text => {
    const config = jsyaml.load(text);

    // Support both legacy flat-array format and new object format.
    if (Array.isArray(config)) {
      root = config;
      const pick = Math.floor(Math.random() * TAGLINES.length);
      taglineEl.textContent = TAGLINES[pick];
    } else {
      root = config.services || [];
      const list = config.taglines;
      if (!list) {
        taglineEl.hidden = true;
      } else {
        const pick = Math.floor(Math.random() * list.length);
        taglineEl.textContent = list[pick];
      }
    }

    current = root;
    render(current);
    renderBreadcrumb();

    const page = new URLSearchParams(window.location.search).get('page');
    if (page) navigateToPath(page);
  });
