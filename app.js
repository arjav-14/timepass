// =========================================================
//  LaundryPress — app.js  (Google Sheets Edition)
// =========================================================

// ───────────────────────────────────────────────────────
//  🔧 CONFIGURATION — paste your Apps Script Web App URL here
// ───────────────────────────────────────────────────────
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx3qVqhT2ig5sAr3KYc4SE9v25FQTJUdjAeHVtXAXF-QFe__nCV0F4YVa32nFG2Xw0i/exec';
// Example: 'https://script.google.com/macros/s/AKfycb.../exec'

// ───────────────────────────────────────────────────────
//  ITEM CATALOGUE
// ───────────────────────────────────────────────────────
const CATALOGUE = [
  { id: 'shirt',        emoji: '👔', name: 'Shirt'         },
  { id: 'tshirt',       emoji: '👕', name: 'T-Shirt'       },
  { id: 'pants',        emoji: '👖', name: 'Pants'         },
  { id: 'jeans',        emoji: '🩳', name: 'Jeans'         },
  { id: 'suit',         emoji: '🤵', name: 'Suit'          },
  { id: 'dress',        emoji: '👗', name: 'Dress'         },
  { id: 'saree',        emoji: '🥻', name: 'Saree'         },
  { id: 'kurta',        emoji: '🧥', name: 'Kurta'         },
  { id: 'jacket',       emoji: '🧣', name: 'Jacket'        },
  { id: 'socks',        emoji: '🧦', name: 'Socks'         },
  { id: 'underwear',    emoji: '🩲', name: 'Underwear'     },
  { id: 'towel',        emoji: '🛁', name: 'Towel'         },
  { id: 'bedsheet',     emoji: '🛏️', name: 'Bed Sheet'     },
  { id: 'handkerchief', emoji: '🤧', name: 'Handkerchief' },
  { id: 'other',        emoji: '📦', name: 'Other'         },
];

// ───────────────────────────────────────────────────────
//  STATE
// ───────────────────────────────────────────────────────
let batches        = [];
let quantities     = {};
let activeFilter   = 'all';
let editingBatchId = null;
let isSyncing      = false;

// ───────────────────────────────────────────────────────
//  INIT
// ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setDefaultDates();
  renderItemGrid();
  checkConfig();
  loadBatches();
});

function checkConfig() {
  if (APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL_HERE') {
    showBanner(
      '⚠️ Setup Required: Paste your Google Apps Script URL in <b>app.js</b> at the top. ' +
      'See the <b>Setup Guide</b> for instructions.',
      'warn'
    );
  }
}

// ───────────────────────────────────────────────────────
//  BANNER
// ───────────────────────────────────────────────────────
function showBanner(html, type = 'warn') {
  let banner = document.getElementById('configBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'configBanner';
    document.querySelector('.main-container').prepend(banner);
  }
  banner.className = `config-banner ${type}`;
  banner.innerHTML = html;
}

function hideBanner() {
  const b = document.getElementById('configBanner');
  if (b) b.remove();
}

// ───────────────────────────────────────────────────────
//  GOOGLE SHEETS API
// ───────────────────────────────────────────────────────
async function apiGet() {
  const url = APPS_SCRIPT_URL + '?t=' + Date.now(); // cache-bust
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

async function apiPost(payload) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'text/plain' }, // Apps Script requires text/plain
    body:    JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// ───────────────────────────────────────────────────────
//  LOAD ALL BATCHES
// ───────────────────────────────────────────────────────
async function loadBatches() {
  if (APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL_HERE') {
    // Fallback to localStorage in demo mode
    batches = JSON.parse(localStorage.getItem('lp_batches') || '[]');
    renderBatches();
    return;
  }

  setSyncStatus('syncing');
  try {
    batches = await apiGet();
    localStorage.setItem('lp_batches', JSON.stringify(batches)); // local cache
    setSyncStatus('ok');
    hideBanner();
  } catch (err) {
    console.error('Load error:', err);
    // Fall back to cached data
    batches = JSON.parse(localStorage.getItem('lp_batches') || '[]');
    setSyncStatus('error');
    showBanner(`❌ Could not load from Google Sheets: <b>${err.message}</b>. Showing cached data.`, 'error');
  }
  renderBatches();
}

// ───────────────────────────────────────────────────────
//  SAVE (localOnly used in demo mode)
// ───────────────────────────────────────────────────────
function saveLocal() {
  localStorage.setItem('lp_batches', JSON.stringify(batches));
}

// ───────────────────────────────────────────────────────
//  SYNC STATUS INDICATOR
// ───────────────────────────────────────────────────────
function setSyncStatus(status) {
  const el = document.getElementById('syncStatus');
  if (!el) return;
  const map = {
    syncing: { icon: '🔄', label: 'Syncing…',  cls: 'syncing' },
    ok:      { icon: '✅', label: 'Synced',     cls: 'ok'      },
    error:   { icon: '❌', label: 'Sync Error', cls: 'error'   },
    offline: { icon: '💾', label: 'Local Only', cls: 'offline' },
  };
  const s = map[status] || map.offline;
  el.className   = `sync-status ${s.cls}`;
  el.innerHTML   = `<span>${s.icon}</span> ${s.label}`;
  isSyncing      = status === 'syncing';
}

// ───────────────────────────────────────────────────────
//  ITEM GRID
// ───────────────────────────────────────────────────────
function renderItemGrid() {
  const grid = document.getElementById('itemGrid');
  grid.innerHTML = CATALOGUE.map(item => `
    <div class="item-tile ${quantities[item.id] ? 'selected' : ''}"
         id="tile_${item.id}" onclick="toggleItem('${item.id}')">
      <span class="item-emoji">${item.emoji}</span>
      <span class="item-name">${item.name}</span>
      <div class="item-qty-ctrl" onclick="event.stopPropagation()">
        <button class="qty-btn" onclick="changeQty('${item.id}', -1)">−</button>
        <span class="qty-val" id="qty_${item.id}">${quantities[item.id] || 0}</span>
        <button class="qty-btn" onclick="changeQty('${item.id}', 1)">+</button>
      </div>
    </div>
  `).join('');
}

function toggleItem(id) {
  quantities[id] = quantities[id] ? 0 : 1;
  updateTile(id);
}

function changeQty(id, delta) {
  quantities[id] = Math.max(0, (quantities[id] || 0) + delta);
  updateTile(id);
}

function updateTile(id) {
  document.getElementById(`qty_${id}`).textContent = quantities[id] || 0;
  document.getElementById(`tile_${id}`).classList.toggle('selected', !!quantities[id]);
}

// ───────────────────────────────────────────────────────
//  ADD BATCH
// ───────────────────────────────────────────────────────
async function addBatch() {
  const name      = document.getElementById('batchName').value.trim();
  const dateGiven = document.getElementById('dateGiven').value;
  const dateExp   = document.getElementById('expectedReturn').value;
  const notes     = document.getElementById('notes').value.trim();

  if (!name) { showToast('⚠️ Please enter a batch name', 'error'); return; }

  const items = CATALOGUE
    .filter(c => quantities[c.id] > 0)
    .map(c => ({ id: c.id, emoji: c.emoji, name: c.name, given: quantities[c.id], returned: 0 }));

  if (items.length === 0) { showToast('⚠️ Select at least one item', 'error'); return; }

  const batch = {
    id:        Date.now().toString(),
    name, dateGiven, dateExp, notes, items,
    createdAt: new Date().toISOString(),
  };

  // Optimistic UI update
  batches.unshift(batch);
  saveLocal();
  renderBatches();
  resetForm();
  showToast('🔄 Saving to Google Sheets…');

  if (APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL_HERE') {
    showToast('✅ Batch added (local only — configure Sheets URL)', 'success');
    setSyncStatus('offline');
    return;
  }

  setSyncStatus('syncing');
  try {
    await apiPost({ action: 'add', batch });
    setSyncStatus('ok');
    showToast('✅ Batch saved to Google Sheets!', 'success');
  } catch (err) {
    setSyncStatus('error');
    showToast('⚠️ Saved locally — Sheets sync failed', 'error');
    console.error('Add error:', err);
  }
}

function resetForm() {
  document.getElementById('batchName').value = '';
  document.getElementById('notes').value     = '';
  quantities = {};
  renderItemGrid();
  setDefaultDates();
}

// ───────────────────────────────────────────────────────
//  DELETE BATCH
// ───────────────────────────────────────────────────────
async function deleteBatch(id) {
  if (!confirm('Delete this batch?')) return;

  batches = batches.filter(b => b.id !== id);
  saveLocal();
  renderBatches();
  showToast('🗑️ Batch deleted');

  if (APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL_HERE') return;

  setSyncStatus('syncing');
  try {
    await apiPost({ action: 'delete', id });
    setSyncStatus('ok');
    showToast('🗑️ Deleted from Google Sheets', 'success');
  } catch (err) {
    setSyncStatus('error');
    showToast('⚠️ Deleted locally — Sheets sync failed', 'error');
    console.error('Delete error:', err);
  }
}

// ───────────────────────────────────────────────────────
//  FILTER
// ───────────────────────────────────────────────────────
function setFilter(f, el) {
  activeFilter = f;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderBatches();
}

// ───────────────────────────────────────────────────────
//  BATCH STATUS / PROGRESS
// ───────────────────────────────────────────────────────
function batchStatus(batch) {
  const total    = batch.items.reduce((a, i) => a + i.given,    0);
  const returned = batch.items.reduce((a, i) => a + i.returned, 0);
  if (returned === 0)    return 'pending';
  if (returned >= total) return 'done';
  return 'partial';
}

function batchProgress(batch) {
  const total    = batch.items.reduce((a, i) => a + i.given,    0);
  const returned = batch.items.reduce((a, i) => a + i.returned, 0);
  return { total, returned, pct: total ? Math.round((returned / total) * 100) : 0 };
}

function isOverdue(batch) {
  if (!batch.dateExp) return false;
  return new Date(batch.dateExp) < new Date() && batchStatus(batch) !== 'done';
}

// ───────────────────────────────────────────────────────
//  RENDER BATCHES
// ───────────────────────────────────────────────────────
function renderBatches() {
  const q     = document.getElementById('searchInput').value.toLowerCase();
  const list  = document.getElementById('batchList');
  const empty = document.getElementById('emptyState');

  let filtered = batches.filter(b => {
    const status      = batchStatus(b);
    const matchFilter =
      activeFilter === 'all'     ? true :
      activeFilter === 'pending' ? status === 'pending' :
      activeFilter === 'partial' ? status === 'partial' :
      activeFilter === 'done'    ? status === 'done'    : true;
    const matchSearch = !q || b.name.toLowerCase().includes(q) ||
      b.items.some(i => i.name.toLowerCase().includes(q));
    return matchFilter && matchSearch;
  });

  if (filtered.length === 0) {
    list.innerHTML = '';
    empty.classList.add('visible');
  } else {
    empty.classList.remove('visible');
    list.innerHTML = filtered.map(renderBatchCard).join('');
  }

  updateHeaderStats();
}

function renderBatchCard(batch) {
  const status  = batchStatus(batch);
  const { total, returned, pct } = batchProgress(batch);
  const overdue = isOverdue(batch);

  const statusLabel = { pending: '⏳ Pending', partial: '🔄 Partial', done: '✅ Done' }[status];

  const chips = batch.items.map(item => {
    const cls = item.returned >= item.given ? 'returned' : item.returned > 0 ? '' : 'missing';
    return `<span class="item-chip ${cls}">
      ${item.emoji} <span class="item-chip-qty">${item.returned}/${item.given}</span> ${item.name}
    </span>`;
  }).join('');

  return `
    <div class="batch-card status-${status}" id="batch_${batch.id}">
      <div class="batch-top">
        <div class="batch-info">
          <h3>${escHtml(batch.name)}</h3>
          <div class="batch-meta">
            ${batch.dateGiven ? `<span class="meta-chip">📅 Given: ${formatDate(batch.dateGiven)}</span>` : ''}
            ${batch.dateExp   ? `<span class="meta-chip ${overdue ? 'overdue' : ''}">📬 Due: ${formatDate(batch.dateExp)}${overdue ? ' 🔴' : ''}</span>` : ''}
            <span class="meta-chip">📦 ${total} items</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
          <span class="status-badge ${status}">${statusLabel}</span>
          <div class="batch-actions">
            <button class="btn-icon" title="Mark Return" onclick="openModal('${batch.id}')">✏️</button>
            <button class="btn-icon delete" title="Delete" onclick="deleteBatch('${batch.id}')">🗑️</button>
          </div>
        </div>
      </div>

      <div class="batch-progress">
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width:${pct}%"></div>
        </div>
        <span class="progress-label">${returned} of ${total} items returned (${pct}%)</span>
      </div>

      <div class="batch-items-row">${chips}</div>

      ${batch.notes ? `<div style="padding:0 1.25rem 0.9rem;font-size:0.83rem;color:var(--muted);">📝 ${escHtml(batch.notes)}</div>` : ''}
    </div>
  `;
}

// ───────────────────────────────────────────────────────
//  HEADER STATS
// ───────────────────────────────────────────────────────
function updateHeaderStats() {
  const total    = batches.reduce((a, b) => a + b.items.reduce((s, i) => s + i.given,    0), 0);
  const returned = batches.reduce((a, b) => a + b.items.reduce((s, i) => s + i.returned, 0), 0);
  document.getElementById('totalCount').textContent    = total;
  document.getElementById('returnedCount').textContent = returned;
  document.getElementById('pendingCount').textContent  = total - returned;
}

// ───────────────────────────────────────────────────────
//  MODAL — Mark Return
// ───────────────────────────────────────────────────────
function openModal(batchId) {
  editingBatchId = batchId;
  const batch = batches.find(b => b.id === batchId);
  if (!batch) return;

  document.getElementById('modalTitle').textContent = `✏️ Verify Return — ${batch.name}`;

  document.getElementById('modalBody').innerHTML = `
    <div class="check-all-row">
      <input type="checkbox" id="checkAll" onchange="toggleCheckAll(this)" />
      <label for="checkAll">Mark all items as fully returned</label>
    </div>
    ${batch.items.map((item, idx) => `
      <div class="modal-item-row">
        <div class="modal-item-left">
          <span class="modal-item-emoji">${item.emoji}</span>
          <span>${item.name}</span>
        </div>
        <div class="modal-item-right">
          <span class="modal-item-given">Given: <b>${item.given}</b></span>
          <input type="number" class="return-input" id="ret_${idx}"
            min="0" max="${item.given}" value="${item.returned}"
            oninput="clampInput(this, ${item.given})" />
          <span style="font-size:0.82rem;color:var(--muted)">returned</span>
        </div>
      </div>
    `).join('')}
  `;

  syncCheckAll(batch);
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  editingBatchId = null;
}

function clampInput(el, max) {
  const v = parseInt(el.value, 10);
  if (isNaN(v) || v < 0) el.value = 0;
  else if (v > max)       el.value = max;
}

function toggleCheckAll(cb) {
  const batch = batches.find(b => b.id === editingBatchId);
  if (!batch) return;
  batch.items.forEach((item, idx) => {
    const inp = document.getElementById(`ret_${idx}`);
    if (inp) inp.value = cb.checked ? item.given : 0;
  });
}

function syncCheckAll(batch) {
  const cb = document.getElementById('checkAll');
  if (cb) cb.checked = batch.items.every(i => i.returned >= i.given);
}

async function saveReturn() {
  const batch = batches.find(b => b.id === editingBatchId);
  if (!batch) return;

  batch.items.forEach((item, idx) => {
    const inp = document.getElementById(`ret_${idx}`);
    if (inp) item.returned = Math.min(parseInt(inp.value, 10) || 0, item.given);
  });

  saveLocal();
  renderBatches();
  closeModal();
  showToast('🔄 Updating Google Sheets…');

  if (APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL_HERE') {
    showToast('✅ Return status updated (local only)', 'success');
    return;
  }

  setSyncStatus('syncing');
  try {
    await apiPost({ action: 'update', batch });
    setSyncStatus('ok');
    showToast('✅ Return status synced to Google Sheets!', 'success');
  } catch (err) {
    setSyncStatus('error');
    showToast('⚠️ Updated locally — Sheets sync failed', 'error');
    console.error('Update error:', err);
  }
}

// ───────────────────────────────────────────────────────
//  REFRESH BUTTON
// ───────────────────────────────────────────────────────
function refreshData() {
  showToast('🔄 Refreshing from Google Sheets…');
  loadBatches();
}

// ───────────────────────────────────────────────────────
//  TOAST
// ───────────────────────────────────────────────────────
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = `toast ${type} show`;
  clearTimeout(t._timeout);
  t._timeout = setTimeout(() => t.classList.remove('show'), 2800);
}

// ───────────────────────────────────────────────────────
//  HELPERS
// ───────────────────────────────────────────────────────
function setDefaultDates() {
  const today = new Date().toISOString().split('T')[0];
  const next3  = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
  document.getElementById('dateGiven').value      = today;
  document.getElementById('expectedReturn').value = next3;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
