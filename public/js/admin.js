/* ============================================================
   POSTRES ABI — Admin Panel JavaScript
   ============================================================ */

const TOKEN_KEY = 'abi_admin_token';
let adminToken = localStorage.getItem(TOKEN_KEY) || '';

// ---- Utility: Toast notification ----
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => { toast.className = `toast ${type}`; }, 3000);
}

// ---- Utility: Format date ----
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ---- Auth ----
const loginScreen = document.getElementById('login-screen');
const adminLayout = document.getElementById('admin-layout');

async function tryAutoLogin() {
  if (!adminToken) return showLogin();
  // Verify token is valid (quick check)
  try {
    const res = await fetch('/api/orders?status=pending', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.ok) {
      showAdmin();
    } else {
      adminToken = '';
      localStorage.removeItem(TOKEN_KEY);
      showLogin();
    }
  } catch {
    showLogin();
  }
}

function showLogin() {
  loginScreen.style.display = 'flex';
  adminLayout.classList.remove('visible');
}

function showAdmin() {
  loginScreen.style.display = 'none';
  adminLayout.classList.add('visible');
  loadAllData();
}

// Login form
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = document.getElementById('admin-password').value;
  const errorEl = document.getElementById('login-error');
  const btn = document.getElementById('btn-login');
  const btnText = btn.querySelector('.btn-submit-text');
  const btnLoading = btn.querySelector('.btn-submit-loading');

  btn.disabled = true;
  btnText.style.display = 'none';
  btnLoading.style.display = 'inline';
  errorEl.style.display = 'none';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();

    if (data.success) {
      adminToken = data.token;
      localStorage.setItem(TOKEN_KEY, adminToken);
      showAdmin();
    } else {
      errorEl.style.display = 'block';
    }
  } catch {
    errorEl.textContent = 'Error de conexión. Verifica el servidor.';
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
  }
});

// Logout
document.getElementById('btn-logout').addEventListener('click', () => {
  adminToken = '';
  localStorage.removeItem(TOKEN_KEY);
  showLogin();
  document.getElementById('admin-password').value = '';
});

// ---- Tabs ----
const tabs = document.querySelectorAll('.admin-tab');
const panels = document.querySelectorAll('.admin-panel');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
    panels.forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    const panelId = `panel-${tab.dataset.tab}`;
    document.getElementById(panelId).classList.add('active');

    // Refresh on tab switch
    if (tab.dataset.tab === 'recuento') loadSummary();
    else if (tab.dataset.tab === 'productos') loadProducts();
  });
});

// ---- API calls ----
async function apiFetch(url, options = {}) {
  const headers = {
    'Authorization': `Bearer ${adminToken}`,
    ...(options.headers || {}),
  };
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    showLogin();
    throw new Error('Sesión expirada');
  }
  return res;
}

// ---- Load all data ----
function loadAllData() {
  loadPendingOrders();
  loadConfirmedOrders();
  loadDeliveredOrders();
  // Set today as default date for summary
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('summary-date').value = today;
  loadSummary(today);
}

// ---- Pending Orders ----
async function loadPendingOrders() {
  const list = document.getElementById('list-pendientes');
  list.innerHTML = '<div class="spinner"></div>';
  try {
    const res = await apiFetch('/api/orders?status=pending');
    const orders = await res.json();
    document.getElementById('badge-pendientes').textContent = orders.length;
    renderOrders(list, orders, 'pending');
  } catch (err) {
    list.innerHTML = `<p style="color:#ff8080;text-align:center">${err.message}</p>`;
  }
}

// ---- Confirmed Orders ----
async function loadConfirmedOrders() {
  const list = document.getElementById('list-confirmados');
  list.innerHTML = '<div class="spinner"></div>';
  try {
    const res = await apiFetch('/api/orders?status=confirmed');
    const orders = await res.json();
    document.getElementById('badge-confirmados').textContent = orders.length;
    renderOrders(list, orders, 'confirmed');
  } catch (err) {
    list.innerHTML = `<p style="color:#ff8080;text-align:center">${err.message}</p>`;
  }
}

// ---- Delivered Orders ----
async function loadDeliveredOrders() {
  const list = document.getElementById('list-entregados');
  list.innerHTML = '<div class="spinner"></div>';
  try {
    const res = await apiFetch('/api/orders?status=delivered');
    const orders = await res.json();
    renderOrders(list, orders, 'delivered');
  } catch (err) {
    list.innerHTML = `<p style="color:#ff8080;text-align:center">${err.message}</p>`;
  }
}

// ---- Render orders ----
function renderOrders(container, orders, type) {
  if (!orders.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${type === 'pending' ? '🎉' : type === 'confirmed' ? '📋' : '✨'}</div>
        <p>${type === 'pending' ? 'No hay pedidos pendientes por ahora' : type === 'confirmed' ? 'No hay pedidos confirmados' : 'Aún no hay pedidos entregados'}</p>
      </div>`;
    return;
  }

  container.innerHTML = '';
  orders.forEach(order => {
    const items = Array.isArray(order.items) ? order.items : JSON.parse(order.items || '[]');

    const itemsHtml = items.map(i =>
      `<div class="order-item-line"><span class="item-dot"></span>${i.productName} × ${i.quantity}</div>`
    ).join('');

    const statusLabel = { pending: 'Pendiente', confirmed: 'Confirmado', delivered: 'Entregado' }[order.status];
    const statusClass = { pending: 'status-pending', confirmed: 'status-confirmed', delivered: 'status-delivered' }[order.status];
    const cardStripe = { pending: 'status-pending-card', confirmed: 'status-confirmed-card', delivered: 'status-delivered-card' }[order.status];

    // Meta rows
    let metaHtml = '';
    if (order.deliveryPoint) {
      metaHtml += `<div class="order-meta-row"><span class="order-meta-icon">📍</span><span class="order-meta-label">Entrega:</span><span class="order-meta-value">${order.deliveryPoint}</span></div>`;
    }
    if (order.note) {
      metaHtml += `<div class="order-meta-row"><span class="order-meta-icon">📝</span><span class="order-meta-label">Nota:</span><span class="order-meta-value">${order.note}</span></div>`;
    }
    if (order.confirmedAt) {
      metaHtml += `<div class="order-meta-row"><span class="order-meta-icon">✅</span><span class="order-meta-label">Confirmado:</span><span class="order-meta-value">${formatDate(order.confirmedAt)}</span></div>`;
    }
    if (order.deliveredAt) {
      metaHtml += `<div class="order-meta-row"><span class="order-meta-icon">📦</span><span class="order-meta-label">Entregado:</span><span class="order-meta-value">${formatDate(order.deliveredAt)}</span></div>`;
    }

    // Price banner (only when confirmed/delivered)
    const priceBanner = order.price != null ? `
      <div class="order-price-banner">
        <span class="order-price-label">💰 Total a pagar</span>
        <span class="order-price-amount">$${Number(order.price).toFixed(0)}</span>
      </div>` : '';

    // Action buttons
    let actionsHtml = '';
    if (type === 'pending') {
      actionsHtml = `
        <div class="order-card-actions">
          <div class="confirm-form">
            <div class="confirm-price-wrap">
              <span class="confirm-price-prefix">$</span>
              <input type="number" placeholder="Precio del pedido" min="0" step="0.5" id="price-input-${order.id}" aria-label="Precio a cobrar" />
            </div>
            <button class="btn-confirm" onclick="confirmOrder(${order.id})">✅ Confirmar</button>
          </div>
          <button class="btn-delete" onclick="deleteOrder(${order.id})">🗑️ Eliminar pedido</button>
        </div>`;
    } else if (type === 'confirmed') {
      actionsHtml = `
        <div class="order-card-actions">
          <button class="btn-deliver" onclick="deliverOrder(${order.id})">📦 Marcar como entregado</button>
        </div>`;
    }

    const card = document.createElement('div');
    card.className = `order-card ${cardStripe}`;
    card.id = `order-card-${order.id}`;
    card.innerHTML = `
      <div class="order-card-top">
        <div class="order-header">
          <div>
            <div class="order-customer">${order.customerName}</div>
            <div class="order-datetime">📅 ${formatDate(order.orderedAt)}</div>
          </div>
          <span class="order-status ${statusClass}">${statusLabel}</span>
        </div>

        <div class="order-items">
          <div class="order-items-label">Pedido</div>
          ${itemsHtml}
        </div>

        ${metaHtml ? `<div class="order-meta">${metaHtml}</div>` : ''}
      </div>

      ${priceBanner}
      ${actionsHtml}
    `;
    container.appendChild(card);
  });
}


// ---- Confirm order ----
async function confirmOrder(orderId) {
  const priceInput = document.getElementById(`price-input-${orderId}`);
  const price = parseFloat(priceInput.value);
  if (isNaN(price) || price < 0) {
    priceInput.style.borderColor = '#e05252';
    priceInput.focus();
    return;
  }
  priceInput.style.borderColor = '';

  try {
    const res = await apiFetch(`/api/orders/${orderId}/confirm`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price }),
    });
    if (res.ok) {
      showToast('✅ Pedido confirmado');
      loadPendingOrders();
      loadConfirmedOrders();
    } else {
      showToast('Error al confirmar pedido', 'error');
    }
  } catch (err) {
    showToast('Error de conexión', 'error');
  }
}

// ---- Deliver order ----
async function deliverOrder(orderId) {
  try {
    const res = await apiFetch(`/api/orders/${orderId}/deliver`, { method: 'PATCH' });
    if (res.ok) {
      showToast('📦 Pedido marcado como entregado');
      loadConfirmedOrders();
      loadDeliveredOrders();
      loadBadges();
    } else {
      showToast('Error al actualizar pedido', 'error');
    }
  } catch {
    showToast('Error de conexión', 'error');
  }
}

// ---- Delete order ----
async function deleteOrder(orderId) {
  if (!confirm('¿Segura que quieres eliminar este pedido?')) return;
  try {
    const res = await apiFetch(`/api/orders/${orderId}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('🗑️ Pedido eliminado');
      loadPendingOrders();
    } else {
      showToast('Error al eliminar', 'error');
    }
  } catch {
    showToast('Error de conexión', 'error');
  }
}

// Update tab badges
async function loadBadges() {
  try {
    const [pending, confirmed] = await Promise.all([
      apiFetch('/api/orders?status=pending').then(r => r.json()),
      apiFetch('/api/orders?status=confirmed').then(r => r.json()),
    ]);
    document.getElementById('badge-pendientes').textContent = pending.length;
    document.getElementById('badge-confirmados').textContent = confirmed.length;
  } catch {}
}

// ---- Summary ----
async function loadSummary(date) {
  const summaryContent = document.getElementById('summary-content');
  summaryContent.innerHTML = '<div class="spinner"></div>';

  const dateParam = date || document.getElementById('summary-date').value;
  const url = dateParam ? `/api/orders/summary?date=${dateParam}` : '/api/orders/summary';

  try {
    const res = await apiFetch(url);
    const data = await res.json();

    if (!Object.keys(data.summary).length) {
      summaryContent.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🍰</div>
          <p>No hay pedidos pendientes${dateParam ? ' para esta fecha' : ''}</p>
        </div>`;
      return;
    }

    const dateLabel = dateParam
      ? new Date(dateParam + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
      : 'Todos los pendientes';

    const itemsHtml = Object.entries(data.summary).map(([name, qty]) => `
      <div class="summary-item">
        <span class="summary-product-name">${name}</span>
        <span class="summary-qty">${qty}</span>
      </div>
    `).join('');

    summaryContent.innerHTML = `
      <div class="summary-card">
        <div class="summary-card-header">
          <h4>📅 ${dateLabel}</h4>
        </div>
        <div class="summary-items-list">
          ${itemsHtml}
        </div>
      </div>
      <div class="summary-total-pill">📋 Total de pedidos: <strong>${data.total}</strong></div>
    `;
  } catch (err) {
    summaryContent.innerHTML = `<p style="color:#ff8080;text-align:center">${err.message}</p>`;
  }
}

document.getElementById('btn-filter-summary').addEventListener('click', () => {
  loadSummary();
});

// ---- Products Admin ----
let editingProductId = null;

async function loadProducts() {
  const list = document.getElementById('products-admin-list');
  list.innerHTML = '<div class="spinner"></div>';
  try {
    const res = await fetch('/api/products');
    const products = await res.json();

    if (!products.length) {
      list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🍰</div><p>No hay postres todavía. ¡Agrega uno!</p></div>';
      return;
    }

    list.innerHTML = '';
    products.forEach(p => {
      const card = document.createElement('div');
      card.className = 'product-admin-card';
      card.innerHTML = `
        <div class="product-admin-card-top">
          <img class="product-admin-img" src="${p.imageUrl || '/images/logo.jpeg'}" alt="${p.name}" onerror="this.src='/images/logo.jpeg'" />
          <div class="product-admin-info">
            <div class="product-admin-name">${p.name}</div>
            <div class="product-admin-price">$${Number(p.price).toFixed(0)}</div>
            <div class="product-admin-desc">${p.description || '—'}</div>
          </div>
          <span class="product-admin-avail ${p.available ? 'avail-yes' : 'avail-no'}">${p.available ? 'Disponible' : 'No disponible'}</span>
        </div>
        <div class="product-admin-actions">
          <button class="btn-edit-product" onclick="openEditProduct(${p.id}, '${escStr(p.name)}', '${escStr(p.description || '')}', ${p.price}, ${p.available}, '${p.imageUrl || ''}')">✏️ Editar</button>
        </div>
      `;
      list.appendChild(card);
    });
  } catch (err) {
    list.innerHTML = `<p style="color:#ff8080">${err.message}</p>`;
  }
}

function escStr(s) { return String(s).replace(/'/g, "\\'").replace(/\n/g, ' '); }

function openEditProduct(id, name, desc, price, available, imageUrl) {
  editingProductId = id;
  document.getElementById('edit-product-id').value = id || '';
  document.getElementById('edit-product-name').value = name || '';
  document.getElementById('edit-product-desc').value = desc || '';
  document.getElementById('edit-product-price').value = price || '';
  document.getElementById('edit-product-available').value = String(available);
  document.getElementById('edit-product-image').value = '';

  const preview = document.getElementById('edit-product-img-preview');
  if (imageUrl) {
    preview.src = imageUrl;
    preview.style.display = 'block';
  } else {
    preview.style.display = 'none';
  }

  const modalTitle = document.getElementById('edit-modal-title');
  const deleteBtn = document.getElementById('btn-delete-product');

  if (id) {
    modalTitle.textContent = '✏️ Editar postre';
    deleteBtn.style.display = 'block';
  } else {
    modalTitle.textContent = '➕ Nuevo postre';
    deleteBtn.style.display = 'none';
  }

  document.getElementById('edit-product-modal').style.display = 'flex';
}

// Add new product button
document.getElementById('btn-add-product').addEventListener('click', () => {
  openEditProduct(null, '', '', '', true, '');
});

// Close edit modal
document.getElementById('close-edit-modal').addEventListener('click', () => {
  document.getElementById('edit-product-modal').style.display = 'none';
});

document.getElementById('edit-product-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
});

// Image preview
document.getElementById('edit-product-image').addEventListener('change', (e) => {
  const file = e.target.files[0];
  const preview = document.getElementById('edit-product-img-preview');
  if (file) {
    preview.src = URL.createObjectURL(file);
    preview.style.display = 'block';
  }
});

// Save product
document.getElementById('edit-product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const productId = document.getElementById('edit-product-id').value;
  const name = document.getElementById('edit-product-name').value.trim();
  const description = document.getElementById('edit-product-desc').value.trim();
  const price = document.getElementById('edit-product-price').value;
  const available = document.getElementById('edit-product-available').value;
  const imageFile = document.getElementById('edit-product-image').files[0];

  if (!name || !price) {
    showToast('Nombre y precio son requeridos', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('name', name);
  formData.append('description', description);
  formData.append('price', price);
  formData.append('available', available);
  if (imageFile) formData.append('image', imageFile);

  const saveBtn = document.getElementById('btn-save-product');
  saveBtn.disabled = true;
  saveBtn.querySelector('.btn-submit-text').style.display = 'none';
  saveBtn.querySelector('.btn-submit-loading').style.display = 'inline';

  try {
    let res;
    if (productId) {
      res = await apiFetch(`/api/products/${productId}`, { method: 'PATCH', body: formData });
    } else {
      res = await apiFetch('/api/products', { method: 'POST', body: formData });
    }

    if (res.ok) {
      showToast(productId ? '✅ Postre actualizado' : '✅ Postre creado');
      document.getElementById('edit-product-modal').style.display = 'none';
      loadProducts();
    } else {
      const data = await res.json();
      showToast(data.error || 'Error al guardar', 'error');
    }
  } catch {
    showToast('Error de conexión', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.querySelector('.btn-submit-text').style.display = 'inline';
    saveBtn.querySelector('.btn-submit-loading').style.display = 'none';
  }
});

// Delete product
document.getElementById('btn-delete-product').addEventListener('click', async () => {
  const productId = document.getElementById('edit-product-id').value;
  if (!productId) return;
  if (!confirm('¿Segura que quieres eliminar este postre?')) return;

  try {
    const res = await apiFetch(`/api/products/${productId}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('🗑️ Postre eliminado');
      document.getElementById('edit-product-modal').style.display = 'none';
      loadProducts();
    } else {
      showToast('Error al eliminar', 'error');
    }
  } catch {
    showToast('Error de conexión', 'error');
  }
});

// ---- Make functions global for inline onclick ----
window.confirmOrder = confirmOrder;
window.deliverOrder = deliverOrder;
window.deleteOrder = deleteOrder;
window.openEditProduct = openEditProduct;

// ---- Init ----
tryAutoLogin();

// Auto-refresh pending/confirmed every 60 seconds
setInterval(() => {
  if (adminToken && adminLayout.classList.contains('visible')) {
    loadBadges();
  }
}, 60000);
