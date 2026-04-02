const app     = document.getElementById('app');
const overlay = document.getElementById('search-overlay');
const input   = document.getElementById('search-input');
const results = document.getElementById('search-results');

let root, current, allServices = [], history = [];
let matchedItems = [], selectedIdx = -1;

/* ── Collect every leaf service from the tree ──────────────────────────────── */
function collectServices(items) {
  items.forEach(item => {
    if (item.children) collectServices(item.children);
    else allServices.push(item);
  });
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
  return allServices.filter(s => {
    const corpus = [s.name, ...(s.keywords || [])].join(' ');
    return fuzzy(query, corpus);
  });
}

/* ── Search overlay ────────────────────────────────────────────────────────── */
function openSearch() {
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
    current = item.children;
    render(current);
  } else {
    window.open(item.url, '_blank');
    history = [];
    current = root;
    render(current);
  }
}

/* ── Global keydown ────────────────────────────────────────────────────────── */
window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === '/') { e.preventDefault(); openSearch(); return; }
  if (e.key === 'Escape') {
    current = history.length ? history.pop() : root;
    render(current);
    return;
  }
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
