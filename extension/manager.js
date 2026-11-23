const { h } = RS;
const $ = (id) => document.getElementById(id);
let data, selected = 'all', query = '';

async function reload() { data = await RS.load(); render(); }

const colName = (id) => (data.collections.find(c => c.id === id) || {}).name || '';
const visible = () => data.items.filter(i =>
  (selected === 'all' || i.collectionId === selected) &&
  (!query || (i.url + ' ' + (i.note || '')).toLowerCase().includes(query)));

function render() {
  if (selected !== 'all' && !data.collections.some(c => c.id === selected)) selected = 'all';

  // Sidebar
  $('nav').replaceChildren(
    navBtn('all', 'All reels', data.items.length),
    ...data.collections.map(c => navBtn(c.id, c.name, data.items.filter(i => i.collectionId === c.id).length)));

  // Header
  $('title').textContent = selected === 'all' ? 'All reels' : colName(selected);
  $('colActions').replaceChildren(...(selected === 'all' ? [] : [
    h('button', { class: 'btn small', onclick: renameCol }, 'Rename'),
    ' ',
    h('button', { class: 'btn small danger', onclick: deleteCol }, 'Delete collection'),
  ]));

  // List
  const items = visible();
  const list = $('list');
  if (!items.length) {
    list.replaceChildren(h('div', { class: 'empty' },
      query ? 'No matches.' : 'No reels here yet. Open Instagram Reels and press Save.'));
    return;
  }
  list.replaceChildren(...items.map(itemCard));
}

function navBtn(id, name, n) {
  return h('button', { class: id === selected ? 'active' : '', onclick: () => { selected = id; render(); } },
    h('span', {}, name), h('span', { class: 'n' }, String(n)));
}

function itemCard(i) {
  const move = h('select', { class: 'field', 'aria-label': 'Move to collection', value: i.collectionId,
    onchange: async (e) => { await RS.updateItem(i.id, { collectionId: e.target.value }); } },
    data.collections.map(c => h('option', { value: c.id }, c.name)));
  move.style.padding = '3px 6px';

  return h('div', { class: 'item' },
    h('div', { class: 'row' },
      h('div', {},
        h('a', { href: i.url, target: '_blank', rel: 'noreferrer' }, i.url.replace('https://www.', '')),
        h('div', { class: 'meta' }, `Saved ${RS.fmtDate(i.savedAt)}`, ' in ', move)),
      h('div', { class: 'actions' },
        h('button', { class: 'btn small', onclick: (e) => copy(i.url, e.target) }, 'Copy'),
        h('button', { class: 'btn small', onclick: () => window.open(i.url, '_blank', 'noreferrer') }, 'Open'),
        h('button', { class: 'btn small danger', onclick: async () => { await RS.removeItem(i.id); } }, 'Delete'))),
    h('textarea', { class: 'field', placeholder: 'Add a note', rows: 1, 'aria-label': 'Note', value: i.note || '',
      onchange: (e) => RS.updateItem(i.id, { note: e.target.value }) }));
}

async function copy(text, btn) {
  await navigator.clipboard.writeText(text);
  if (btn) { const old = btn.textContent; btn.textContent = 'Copied'; setTimeout(() => (btn.textContent = old), 1200); }
}

async function renameCol() {
  const name = prompt('Rename collection', colName(selected));
  if (name) await RS.renameCollection(selected, name);
}

async function deleteCol() {
  if (data.collections.length <= 1) { alert('You need at least one collection.'); return; }
  const n = data.items.filter(i => i.collectionId === selected).length;
  if (confirm(`Delete "${colName(selected)}" and the ${n} link${n === 1 ? '' : 's'} in it? This can't be undone.`)) {
    await RS.deleteCollection(selected);
    selected = 'all';
  }
}

$('addForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const c = await RS.addCollection($('newName').value);
  $('newName').value = '';
  if (c) selected = c.id;
  await reload();
});

$('search').addEventListener('input', (e) => { query = e.target.value.trim().toLowerCase(); render(); });

$('copyAll').addEventListener('click', (e) => {
  const urls = visible().map(i => i.url);
  if (urls.length) copy(urls.join('\n'), e.target);
});

$('exportTxt').addEventListener('click', () => {
  const groups = data.collections
    .filter(c => selected === 'all' || c.id === selected)
    .map(c => {
      const links = data.items.filter(i => i.collectionId === c.id).map(i => i.note ? `${i.url}  (${i.note.replace(/\s+/g, ' ')})` : i.url);
      return `## ${c.name}\n${links.join('\n')}`;
    });
  RS.download('reel-stash.txt', groups.join('\n\n') + '\n');
});

$('exportJson').addEventListener('click', () => {
  RS.download('reel-stash-backup.json', JSON.stringify({ collections: data.collections, items: data.items }, null, 2), 'application/json');
});

$('importBtn').addEventListener('click', () => $('importFile').click());
$('importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const inc = JSON.parse(await file.text());
    if (!Array.isArray(inc.collections) || !Array.isArray(inc.items)) throw new Error('bad file');
    const cur = await RS.load();
    const idMap = {};
    for (const c of inc.collections) {
      const same = cur.collections.find(x => x.name.toLowerCase() === String(c.name).toLowerCase());
      if (same) { idMap[c.id] = same.id; continue; }
      const nc = { id: cur.collections.some(x => x.id === c.id) ? RS.uid() : c.id, name: String(c.name).slice(0, 40) };
      cur.collections.push(nc);
      idMap[c.id] = nc.id;
    }
    let added = 0;
    for (const i of inc.items) {
      const cid = idMap[i.collectionId];
      if (!cid || !i.code || !i.url) continue;
      if (cur.items.some(x => x.code === i.code && x.collectionId === cid)) continue;
      cur.items.push({ id: RS.uid(), code: String(i.code), url: String(i.url), collectionId: cid, savedAt: Number(i.savedAt) || Date.now(), note: String(i.note || '') });
      added++;
    }
    cur.items.sort((a, b) => b.savedAt - a.savedAt);
    await RS.save({ collections: cur.collections, items: cur.items });
    alert(`Imported ${added} new link${added === 1 ? '' : 's'}.`);
  } catch {
    alert('That file could not be imported. Use a backup made by Reel Stash.');
  }
});

// Stay in sync with saves made on Instagram, but don't clobber a note being typed.
chrome.storage.onChanged.addListener(() => {
  if (document.activeElement && document.activeElement.tagName === 'TEXTAREA') return;
  reload();
});

reload();
