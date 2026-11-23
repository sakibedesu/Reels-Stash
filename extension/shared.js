/* Shared helpers: storage, URL parsing, tiny DOM builder. */
const RS = (() => {
  const DEFAULT_ID = 'default';

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // Turns any reel/post URL into { code, url } with a clean canonical link.
  function parseInstagramUrl(href) {
    let u;
    try { u = new URL(href); } catch { return null; }
    if (!/(^|\.)instagram\.com$/.test(u.hostname)) return null;
    const m = u.pathname.match(/^\/(?:[^/]+\/)?(reels?|p|tv)\/([A-Za-z0-9_-]+)/);
    if (!m || m[2] === 'audio') return null;
    const kind = m[1] === 'p' ? 'p' : m[1] === 'tv' ? 'tv' : 'reel';
    return { code: m[2], url: `https://www.instagram.com/${kind}/${m[2]}/` };
  }

  async function load() {
    const d = await chrome.storage.local.get(['collections', 'items', 'lastCollectionId']);
    const collections = Array.isArray(d.collections) && d.collections.length
      ? d.collections
      : [{ id: DEFAULT_ID, name: 'Saved' }];
    return {
      collections,
      items: Array.isArray(d.items) ? d.items : [],
      lastCollectionId: d.lastCollectionId || collections[0].id,
    };
  }

  const save = (partial) => chrome.storage.local.set(partial);

  async function addCollection(name) {
    name = (name || '').trim().slice(0, 40);
    if (!name) return null;
    const data = await load();
    const existing = data.collections.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;
    const c = { id: uid(), name };
    data.collections.push(c);
    await save({ collections: data.collections });
    return c;
  }

  async function renameCollection(id, name) {
    name = (name || '').trim().slice(0, 40);
    if (!name) return;
    const data = await load();
    const c = data.collections.find(c => c.id === id);
    if (c) { c.name = name; await save({ collections: data.collections }); }
  }

  // Deletes a collection and the links inside it. The last collection can't be deleted.
  async function deleteCollection(id) {
    const data = await load();
    if (data.collections.length <= 1) return false;
    await save({
      collections: data.collections.filter(c => c.id !== id),
      items: data.items.filter(i => i.collectionId !== id),
      lastCollectionId: data.lastCollectionId === id ? data.collections.find(c => c.id !== id).id : data.lastCollectionId,
    });
    return true;
  }

  // Adds the reel to a collection, or removes it if it's already there. Returns true when saved.
  async function toggleItem(parsed, collectionId) {
    const data = await load();
    const idx = data.items.findIndex(i => i.code === parsed.code && i.collectionId === collectionId);
    let saved;
    if (idx >= 0) {
      data.items.splice(idx, 1);
      saved = false;
    } else {
      data.items.unshift({ id: uid(), code: parsed.code, url: parsed.url, collectionId, savedAt: Date.now(), note: '' });
      saved = true;
    }
    await save({ items: data.items, lastCollectionId: collectionId, collections: data.collections });
    return saved;
  }

  async function removeItem(id) {
    const data = await load();
    await save({ items: data.items.filter(i => i.id !== id) });
  }

  async function updateItem(id, patch) {
    const data = await load();
    const item = data.items.find(i => i.id === id);
    if (!item) return;
    if (patch.collectionId && patch.collectionId !== item.collectionId) {
      // Moving into a collection that already has this reel just merges them.
      if (data.items.some(i => i.code === item.code && i.collectionId === patch.collectionId)) {
        data.items = data.items.filter(i => i.id !== id);
        await save({ items: data.items });
        return;
      }
    }
    Object.assign(item, patch);
    await save({ items: data.items });
  }

  function download(filename, text, mime = 'text/plain') {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: mime }));
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  const fmtDate = (t) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  // h('div', {class:'x', onclick: fn}, child, child...)
  function h(tag, props = {}, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (k === 'class') el.className = v;
      else if (k === 'value') continue;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, '');
      else if (v !== false && v != null) el.setAttribute(k, v);
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(kid));
    }
    if (props && props.value !== undefined) el.value = props.value;
    return el;
  }

  return { uid, parseInstagramUrl, load, save, addCollection, renameCollection, deleteCollection, toggleItem, removeItem, updateItem, download, fmtDate, h };
})();
