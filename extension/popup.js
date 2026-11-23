const { h } = RS;
const $ = (id) => document.getElementById(id);
let data, selected = 'all', tabReel = null;

async function init() {
  data = await RS.load();
  selected = data.lastCollectionId;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tabReel = tab && tab.url ? RS.parseInstagramUrl(tab.url) : null;
  } catch {}
  render();
}

function render() {
  const sel = $('collection');
  sel.replaceChildren(
    h('option', { value: 'all' }, `All collections`),
    ...data.collections.map(c => h('option', { value: c.id }, c.name))
  );
  if (selected !== 'all' && !data.collections.some(c => c.id === selected)) selected = 'all';
  sel.value = selected;

  $('saveTab').hidden = !tabReel || selected === 'all';

  const items = data.items.filter(i => selected === 'all' || i.collectionId === selected);
  $('count').textContent = `${items.length} saved`;

  const box = $('items');
  if (!items.length) {
    box.replaceChildren(h('div', { class: 'empty' }, 'Nothing here yet. Open a reel on Instagram and press Save.'));
    return;
  }
  const names = Object.fromEntries(data.collections.map(c => [c.id, c.name]));
  box.replaceChildren(...items.map(i => h('div', { class: 'item' },
    h('div', { class: 'row' },
      h('a', { href: i.url, target: '_blank', rel: 'noreferrer' }, `${i.url.replace('https://www.', '')}`),
      h('div', { class: 'actions' },
        h('button', { class: 'btn small', onclick: async (e) => {
          await navigator.clipboard.writeText(i.url);
          e.target.textContent = 'Copied';
          setTimeout(() => (e.target.textContent = 'Copy'), 1200);
        } }, 'Copy'),
        h('button', { class: 'btn small danger', 'aria-label': 'Delete', onclick: async () => { await RS.removeItem(i.id); await reload(); } }, 'Delete'))),
    h('div', { class: 'date' }, selected === 'all' ? `${names[i.collectionId] || ''} · ${RS.fmtDate(i.savedAt)}` : RS.fmtDate(i.savedAt)))));
}

async function reload() { data = await RS.load(); render(); }

$('collection').addEventListener('change', (e) => { selected = e.target.value; render(); });
$('saveTab').addEventListener('click', async () => {
  const exists = data.items.some(i => i.code === tabReel.code && i.collectionId === selected);
  if (!exists) await RS.toggleItem(tabReel, selected);
  await reload();
});
$('open').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('manager.html') });
  window.close();
});

init();
