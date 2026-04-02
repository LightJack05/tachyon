const app     = document.getElementById('app');
const overlay = document.getElementById('search-overlay');
const input   = document.getElementById('search-input');
const results = document.getElementById('search-results');

let root, current, allServices = [];

/* ── Collect every leaf service from the tree ──────────────────────────────── */
function collectServices(items) {
  items.forEach(item => {
    if (item.children) collectServices(item.children);
    else allServices.push(item);
  });
}

/* ── Fuzzy match: every char of needle must appear in order in haystack ─────── */
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

function searchServices(query) {
  return allServices.filter(s => {
    const corpus = [s.name, ...(s.keywords || [])].join(' ');
    return fuzzy(query, corpus);
  });
}

/* ── Search overlay ────────────────────────────────────────────────────────── */
function openSearch() {
  overlay.classList.remove('hidden');
  input.value = '';
  results.replaceChildren();
  input.focus();
}

function closeSearch() {
  overlay.classList.add('hidden');
  input.value = '';
  results.replaceChildren();
}

function renderResults(items) {
  const frag = document.createDocumentFragment();
  items.forEach(item => {
    const li = document.createElement('li');
    li.textContent = `${item.icon}  ${item.name}`;
    li.addEventListener('click', () => { closeSearch(); window.open(item.url, '_blank'); });
    frag.appendChild(li);
  });
  results.replaceChildren(frag);
}

input.addEventListener('input', () => renderResults(searchServices(input.value)));

input.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeSearch();
  if (e.key === 'Enter') {
    const first = allServices.find(s => {
      const corpus = [s.name, ...(s.keywords || [])].join(' ');
      return fuzzy(input.value, corpus);
    });
    if (first) { closeSearch(); window.open(first.url, '_blank'); }
  }
});

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
    current = item.children;
    render(current);
  } else {
    window.open(item.url, '_blank');
    current = root;
    render(current);
  }
}

/* ── Global keydown ────────────────────────────────────────────────────────── */
window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === '/') { e.preventDefault(); openSearch(); return; }
  if (e.key === 'Escape') { current = root; render(current); return; }
  const item = current.find(i => i.shortcut === e.key);
  if (item) activate(item);
});

/* ── Bootstrap ─────────────────────────────────────────────────────────────── */
fetch('config.yaml')
  .then(r => r.text())
  .then(text => {
    root = jsyaml.load(text);
    collectServices(root);
    current = root;
    render(current);
  });
