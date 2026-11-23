/* Floating Save button that lives on Instagram reel pages. */
(() => {
  if (window.__reelStashLoaded) return;
  window.__reelStashLoaded = true;
  const { h } = RS;

  const host = document.createElement('div');
  host.id = 'reel-stash-host';
  host.style.cssText = 'all:initial;position:fixed;right:24px;bottom:96px;z-index:2147483647;display:none;';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <style>
      :host { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
      * { box-sizing: border-box; }
      .wrap { position: relative; display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
      button { font: inherit; color: inherit; cursor: pointer; border: 0; background: none; }
      button:focus-visible, input:focus-visible { outline: 2px solid #8b7dff; outline-offset: 2px; }
      .fab { display: flex; align-items: stretch; background: #14171f; color: #fff; border-radius: 999px;
             border: 1px solid rgba(255,255,255,.18); box-shadow: 0 6px 24px rgba(0,0,0,.35); overflow: hidden; }
      .fab button { display: flex; align-items: center; gap: 8px; padding: 11px 14px; font-size: 14px; font-weight: 600; }
      .fab button:hover { background: rgba(255,255,255,.1); }
      .fab .more { padding: 11px 12px; border-left: 1px solid rgba(255,255,255,.18); }
      .fab.saved .save { color: #b7afff; }
      svg { width: 18px; height: 18px; flex: none; }
      .panel { width: 270px; background: #1c2029; color: #eef0f6; border: 1px solid rgba(255,255,255,.14);
               border-radius: 14px; box-shadow: 0 12px 36px rgba(0,0,0,.45); padding: 10px; }
      .panel[hidden], .toast[hidden] { display: none; }
      .ph { font-size: 13px; font-weight: 600; padding: 4px 6px 8px; color: #aab1c3; }
      .list { display: flex; flex-direction: column; gap: 2px; max-height: 240px; overflow-y: auto; }
      .row { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%;
             text-align: left; padding: 9px 10px; border-radius: 8px; font-size: 14px; }
      .row:hover { background: rgba(255,255,255,.08); }
      .row.on { background: rgba(139,125,255,.2); }
      .row .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .row .meta { font-size: 12px; color: #aab1c3; display: flex; align-items: center; gap: 6px; flex: none; }
      .row.on .meta { color: #cfc9ff; }
      .new { display: flex; gap: 6px; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,.12); }
      .new input { flex: 1; min-width: 0; background: #12141b; color: #fff; border: 1px solid rgba(255,255,255,.16);
                   border-radius: 8px; padding: 8px 10px; font: inherit; font-size: 13px; }
      .new button { background: #8b7dff; color: #14171f; font-weight: 600; font-size: 13px; padding: 8px 12px; border-radius: 8px; }
      .manage { width: 100%; margin-top: 8px; padding: 8px; font-size: 13px; color: #aab1c3; border-radius: 8px; }
      .manage:hover { background: rgba(255,255,255,.08); color: #fff; }
      .toast { background: #eef0f6; color: #14171f; font-size: 13px; font-weight: 600; padding: 9px 14px;
               border-radius: 999px; box-shadow: 0 6px 24px rgba(0,0,0,.3); }
    </style>
    <div class="wrap">
      <div class="panel" hidden role="dialog" aria-label="Save reel to a collection">
        <div class="ph">Save to collection</div>
        <div class="list"></div>
        <form class="new">
          <input type="text" maxlength="40" placeholder="New collection" aria-label="New collection name">
          <button type="submit">Create</button>
        </form>
        <button class="manage" type="button">Open all saved reels</button>
      </div>
      <div class="toast" hidden role="status"></div>
      <div class="fab">
        <button class="save" type="button" title="Save this reel to your last used collection">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/></svg>
          <span class="label">Save</span>
        </button>
        <button class="more" type="button" title="Choose collection" aria-label="Choose collection" aria-expanded="false">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>
        </button>
      </div>
    </div>`;
  document.documentElement.appendChild(host);

  const $ = (s) => root.querySelector(s);
  const panel = $('.panel'), list = $('.list'), fab = $('.fab'), label = $('.label');
  const saveBtn = $('.save'), moreBtn = $('.more'), toastEl = $('.toast'), form = $('.new'), input = $('.new input');

  let current = null;
  let lastHref = '';
  let toastTimer;

  const alive = () => !!(chrome.runtime && chrome.runtime.id);

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastEl.hidden = true), 2200);
  }

  function setPanel(open) {
    panel.hidden = !open;
    moreBtn.setAttribute('aria-expanded', String(open));
    if (open) refresh();
  }

  async function refresh() {
    if (!alive()) return;
    current = RS.parseInstagramUrl(location.href);
    host.style.display = current ? '' : 'none';
    if (!current) { setPanel(false); return; }

    const data = await RS.load();
    const savedIn = data.items.filter(i => i.code === current.code);
    label.textContent = savedIn.length ? `Saved (${savedIn.length})` : 'Save';
    fab.classList.toggle('saved', savedIn.length > 0);

    if (!panel.hidden) {
      list.replaceChildren(...data.collections.map(c => {
        const on = savedIn.some(i => i.collectionId === c.id);
        const count = data.items.filter(i => i.collectionId === c.id).length;
        return h('button', { class: 'row' + (on ? ' on' : ''), type: 'button', onclick: () => toggle(c) },
          h('span', { class: 'name' }, c.name),
          h('span', { class: 'meta' }, String(count), on ? '✓' : ''));
      }));
    }
  }

  async function toggle(collection) {
    if (!current) return;
    const saved = await RS.toggleItem(current, collection.id);
    toast(saved ? `Saved to ${collection.name}` : `Removed from ${collection.name}`);
    refresh();
  }

  async function quickSave() {
    if (!current) return;
    const data = await RS.load();
    const col = data.collections.find(c => c.id === data.lastCollectionId) || data.collections[0];
    const already = data.items.some(i => i.code === current.code && i.collectionId === col.id);
    if (already) { toast(`Already in ${col.name}`); return; }
    await toggle(col);
  }

  saveBtn.addEventListener('click', quickSave);
  moreBtn.addEventListener('click', () => setPanel(panel.hidden));
  $('.manage').addEventListener('click', () => {
    try { chrome.runtime.sendMessage({ type: 'open-manager' }); } catch {}
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = input.value.trim();
    if (!name || !current) return;
    const col = await RS.addCollection(name);
    input.value = '';
    const data = await RS.load();
    if (!data.items.some(i => i.code === current.code && i.collectionId === col.id)) await toggle(col);
    else refresh();
  });

  // Keep Instagram's own keyboard shortcuts (space, arrows, m...) from firing while typing here.
  ['keydown', 'keyup', 'keypress'].forEach(t => input.addEventListener(t, e => e.stopPropagation()));

  document.addEventListener('click', (e) => {
    if (!panel.hidden && !e.composedPath().includes(host)) setPanel(false);
  }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) setPanel(false); });

  chrome.storage.onChanged.addListener(() => { if (alive()) refresh(); });

  // Instagram is a single-page app: the URL changes without a reload, so watch for it.
  const timer = setInterval(() => {
    if (!alive()) { clearInterval(timer); host.remove(); return; }
    if (location.href !== lastHref) { lastHref = location.href; refresh(); }
  }, 400);
})();
