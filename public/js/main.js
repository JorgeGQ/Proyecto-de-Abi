/* ============================================================
   POSTRES ABI — Landing Page JavaScript
   ============================================================ */

// ---- Navbar scroll effect ----
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 30);
}, { passive: true });

// ---- Products state ----
let products = [];
let selectedItems = {}; // { productId: quantity }

// ---- Load products from API ----
async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    products = await res.json();
    renderProducts();
    renderItemsSelector();
  } catch (err) {
    console.error('Error cargando productos:', err);
  }
}

function renderProducts() {
  const grid = document.getElementById('productos-grid');
  grid.innerHTML = '';

  if (!products.length) {
    grid.innerHTML = '<p style="color:var(--gray-text);text-align:center;grid-column:1/-1;padding:20px">Pronto habrá postres disponibles 💕</p>';
    return;
  }

  products.forEach(p => {
    const card = document.createElement('div');
    card.className = `product-card${p.available ? '' : ' unavailable'}`;
    card.innerHTML = `
      <img class="product-img" src="${p.imageUrl || '/images/logo.jpeg'}" alt="${p.name}" loading="lazy" onerror="this.src='/images/logo.jpeg'" />
      ${!p.available ? '<span class="product-unavailable-badge">No disponible</span>' : ''}
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.description || ''}</div>
        <div class="product-price">$${Number(p.price).toFixed(0)}</div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function renderItemsSelector() {
  const container = document.getElementById('items-selector');
  container.innerHTML = '';

  const available = products.filter(p => p.available);
  if (!available.length) {
    container.innerHTML = '<p style="color:var(--gray-text);font-size:0.9rem">No hay postres disponibles en este momento.</p>';
    return;
  }

  available.forEach(p => {
    selectedItems[p.id] = selectedItems[p.id] || 0;

    const row = document.createElement('div');
    row.className = 'item-row';
    row.dataset.id = p.id;
    row.innerHTML = `
      <div class="item-check" id="check-${p.id}"></div>
      <img class="item-img" src="${p.imageUrl || '/images/logo.jpeg'}" alt="${p.name}" loading="lazy" onerror="this.src='/images/logo.jpeg'" />
      <div class="item-details">
        <div class="item-name">${p.name}</div>
        <div class="item-price">$${Number(p.price).toFixed(0)} c/u</div>
      </div>
      <div class="item-qty" id="qty-controls-${p.id}" style="display:none">
        <button class="qty-btn" id="minus-${p.id}" aria-label="Menos" disabled>−</button>
        <span class="qty-val" id="qty-val-${p.id}">1</span>
        <button class="qty-btn" id="plus-${p.id}" aria-label="Más">+</button>
      </div>
    `;

    // Click row to toggle selection
    row.addEventListener('click', (e) => {
      if (e.target.closest('.qty-btn')) return;
      toggleItem(p.id);
    });

    // Qty buttons
    row.querySelector(`#minus-${p.id}`).addEventListener('click', (e) => {
      e.stopPropagation();
      changeQty(p.id, -1);
    });
    row.querySelector(`#plus-${p.id}`).addEventListener('click', (e) => {
      e.stopPropagation();
      changeQty(p.id, 1);
    });

    container.appendChild(row);
  });
}

function toggleItem(productId) {
  const isSelected = selectedItems[productId] > 0;
  if (isSelected) {
    selectedItems[productId] = 0;
  } else {
    selectedItems[productId] = 1;
  }
  updateItemUI(productId);
}

function changeQty(productId, delta) {
  const newQty = Math.max(1, (selectedItems[productId] || 1) + delta);
  selectedItems[productId] = newQty;
  updateItemUI(productId);
}

function updateItemUI(productId) {
  const qty = selectedItems[productId] || 0;
  const row = document.querySelector(`.item-row[data-id="${productId}"]`);
  const check = document.getElementById(`check-${productId}`);
  const qtyControls = document.getElementById(`qty-controls-${productId}`);
  const qtyVal = document.getElementById(`qty-val-${productId}`);
  const minusBtn = document.getElementById(`minus-${productId}`);

  if (!row) return;

  const selected = qty > 0;
  row.classList.toggle('selected', selected);
  check.classList.toggle('checked', selected);
  qtyControls.style.display = selected ? 'flex' : 'none';
  if (qtyVal) qtyVal.textContent = qty;
  if (minusBtn) minusBtn.disabled = qty <= 1;
}

// ---- Order form submit ----
const form = document.getElementById('pedido-form');
const btnSubmit = document.getElementById('btn-submit-order');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const customerName = document.getElementById('customerName').value.trim();
  const deliveryPoint = document.getElementById('deliveryPoint').value.trim();
  const note = document.getElementById('note').value.trim();

  // Build items array
  const items = [];
  for (const p of products) {
    if (selectedItems[p.id] > 0) {
      items.push({
        productId: p.id,
        productName: p.name,
        quantity: selectedItems[p.id],
        price: p.price,
      });
    }
  }

  // Validate
  let valid = true;

  const nameInput = document.getElementById('customerName');
  nameInput.classList.remove('error');
  if (!customerName) {
    nameInput.classList.add('error');
    nameInput.focus();
    valid = false;
  }

  const deliveryInput = document.getElementById('deliveryPoint');
  deliveryInput.classList.remove('error');
  if (!deliveryPoint) {
    deliveryInput.classList.add('error');
    if (valid) deliveryInput.focus();
    valid = false;
  }

  // Check items error
  let itemsError = document.querySelector('.items-error');
  if (!itemsError) {
    itemsError = document.createElement('p');
    itemsError.className = 'items-error';
    document.getElementById('items-selector').after(itemsError);
  }
  itemsError.style.display = 'none';
  if (items.length === 0) {
    itemsError.textContent = 'Por favor selecciona al menos un postre.';
    itemsError.style.display = 'block';
    valid = false;
  }

  if (!valid) return;

  // Submit
  const btnText = btnSubmit.querySelector('.btn-submit-text');
  const btnLoading = btnSubmit.querySelector('.btn-submit-loading');
  btnSubmit.disabled = true;
  btnText.style.display = 'none';
  btnLoading.style.display = 'inline';

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName, items, deliveryPoint, note }),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      // Show success modal
      document.getElementById('success-modal').style.display = 'flex';
      // Reset form
      form.reset();
      Object.keys(selectedItems).forEach(k => selectedItems[k] = 0);
      products.filter(p => p.available).forEach(p => updateItemUI(p.id));
    } else {
      alert('Hubo un error al enviar tu pedido. Por favor intenta de nuevo.');
    }
  } catch (err) {
    alert('Error de conexión. Por favor verifica tu internet e intenta de nuevo.');
  } finally {
    btnSubmit.disabled = false;
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
  }
});

// Close success modal
document.getElementById('btn-modal-close').addEventListener('click', () => {
  document.getElementById('success-modal').style.display = 'none';
});

// Click outside modal to close
document.getElementById('success-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    e.currentTarget.style.display = 'none';
  }
});

// ---- Init ----
loadProducts();
