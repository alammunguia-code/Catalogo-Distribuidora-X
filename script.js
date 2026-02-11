/****************************************************
 * CONFIGURACIÓN GOOGLE SHEETS
 ****************************************************/
const SHEET_ID = '1ZYDo3phbc-IhaD-blVlaH7gbYkoyjhhX-I7Dtm06Cuo';
const params = new URLSearchParams(window.location.search);
const catalogoSeleccionado = params.get('catalogo') || 'ClienteA';
const SHEET_URL = `https://opensheet.elk.sh/${SHEET_ID}/${catalogoSeleccionado}`;

/****************************************************
 * CONFIGURACIÓN GOOGLE FORMS
 ****************************************************/
const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSe4qzkJIvgWWS0OhKrrOu2BJbuaHRNR5skoWoFQW3Sv-3430Q/formResponse';
const ENTRY = {
  nombre: 'entry.313556667',
  telefono: 'entry.675797328',
  direccion: 'entry.1917704239',
  email: 'entry.865391267',
  pedido: 'entry.889150100',
  total: 'entry.1238815983',
  precioUnitario: 'entry.1479326422'
  
};

/****************************************************
 * VARIABLES GLOBALES
 ****************************************************/
let productos = [];
let carrito = JSON.parse(localStorage.getItem('amat_carrito_v1') || '[]');

/****************************************************
 * HELPERS
 ****************************************************/
function normalizarCategoria(str) {
  return (str || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/****************************************************
 * DOM READY
 ****************************************************/
document.addEventListener('DOMContentLoaded', () => {

  /****************************************************
   * ELEMENTOS DEL DOM
   ****************************************************/

  const catalogoEl = document.getElementById('catalogo');
  const cartBtn = document.getElementById('cart-btn');
  const cartBadge = document.getElementById('cart-badge');
  const cartPanel = document.getElementById('cart-panel');
  const overlay = document.getElementById('overlay');
  const cartBody = document.getElementById('cart-body');
  const cartTotalEl = document.getElementById('cart-total');
  const closeCart = document.getElementById('close-cart');
  const submitBtn = document.getElementById('submit-order'); 
  const nombreEl = document.getElementById('nombre');
  const telefonoEl = document.getElementById('telefono');
  const direccionEl = document.getElementById('direccion');
  const emailEl = document.getElementById('email');

  const searchInput = document.getElementById('search');
  let activeCategory = 'todos';
  let lastSearch = '';

  /****************************************************
   * CARGAR PRODUCTOS
   ****************************************************/
  async function cargarProductos() {
    try {
      const res = await fetch(SHEET_URL);
      if (!res.ok) throw new Error('Error al cargar Sheet');

      const data = await res.json();
      productos = data.map(row => ({
        id: String(row.id || Math.random().toString(36).slice(2, 9)),
        nombre: row.nombre || '',
        descripcion: row.descripcion || '',
        precio: Number(row.precio) || 0,
        precioMayoreo: Number(row.precio_mayoreo) || 0,
        minMayoreo: Number(row.minimo_mayoreo) || 0,
        categoria: row.categoria || 'Otros',
        categoriaNorm: normalizarCategoria(row.categoria || 'Otros'),
        colores: row.colores
          ? row.colores.split(',').map(c => c.trim()).filter(Boolean)
          : [],
        imagenes: row.imagen
          ? row.imagen.split(',').map(i => i.trim()).filter(Boolean)
          : []
      }));

      renderCategoryButtons();
      applyFilters();

    } catch (err) {
      console.error(err);
      alert('No se pudieron cargar los productos');
    }
  }

  /****************************************************
   * CATEGORÍAS AUTOMÁTICAS
   ****************************************************/
  function renderCategoryButtons() {
    const container = document.getElementById('category-buttons');
    if (!container) return;

    const categorias = [
      { label: 'Todos', value: 'todos' },
      ...[...new Map(
        productos.map(p => [
          p.categoriaNorm,
          { label: p.categoria, value: p.categoriaNorm }
        ])
      ).values()]
    ];

    container.innerHTML = '';

    categorias.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'filter-btn';
      if (cat.value === activeCategory) btn.classList.add('active');
      btn.dataset.filter = cat.value;
      btn.textContent = cat.label;

      btn.addEventListener('click', () => {
        container.querySelectorAll('.filter-btn')
          .forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCategory = cat.value;
        applyFilters();
      });

      container.appendChild(btn);
    });
  }

  /****************************************************
   * RENDER PRODUCTOS
   ****************************************************/
  function renderProductos(lista = productos) {
    if (!catalogoEl) return;
    catalogoEl.innerHTML = '';

    if (!lista.length) {
      catalogoEl.innerHTML = '<div style="padding:18px;color:#6b7280">No hay productos</div>';
      return;
    }

    lista.forEach(p => {
      const card = document.createElement('article');
      card.className = 'card';

      const colorHTML = p.colores.length > 1
        ? `<select class="color-select" data-id="${escapeHtml(p.id)}">
            ${p.colores.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
          </select>`
        : '';

      const imagenHTML = p.imagenes.length > 1
        ? `<div class="carousel" data-id="${escapeHtml(p.id)}">
            <button class="carousel-btn prev">‹</button>
            <div class="carousel-track">
              ${p.imagenes.map((img, i) => `<img src="${escapeHtml(img)}" class="carousel-img ${i === 0 ? 'active' : ''}">`).join('')}
            </div>
            <button class="carousel-btn next">›</button>
          </div>`
        : `<img src="${escapeHtml(p.imagenes[0] || '')}">`;

      card.innerHTML = `
        <div class="card-image">${imagenHTML}</div>
        <div class="card-info">
          <h3>${escapeHtml(p.nombre)}</h3>
          <div class="price">$${p.precio.toFixed(2)} MXN</div>
          <div class="mayoreo">
            Mayoreo: $${p.precioMayoreo.toFixed(2)} desde ${p.minMayoreo} pzas
          </div>
        </div>
        <div class="card-actions">
          ${colorHTML}
          <button class="btn" data-id="${escapeHtml(p.id)}">Agregar al carrito</button>
        </div>
      `;

      catalogoEl.appendChild(card);
    });
  }

  /****************************************************
   * CARRUSEL
   ****************************************************/
  document.addEventListener('click', e => {
    const prevBtn = e.target.closest('.carousel-btn.prev');
    const nextBtn = e.target.closest('.carousel-btn.next');
    if (!prevBtn && !nextBtn) return;

    const carousel = e.target.closest('.carousel');
    const imgs = carousel.querySelectorAll('.carousel-img');
    let current = [...imgs].findIndex(i => i.classList.contains('active'));

    imgs[current].classList.remove('active');
    imgs[current].style.transform = ''; 

    current = prevBtn
      ? (current - 1 + imgs.length) % imgs.length
      : (current + 1) % imgs.length;

    imgs[current].classList.add('active');
});

  /****************************************************
   * FILTROS
   ****************************************************/
  function applyFilters() {
    const q = lastSearch.trim().toLowerCase();
    const filtrados = productos.filter(p => {
      const textMatch = !q || p.nombre.toLowerCase().includes(q) || p.descripcion.toLowerCase().includes(q);
      const catMatch = activeCategory === 'todos' || p.categoriaNorm === activeCategory;
      return textMatch && catMatch;
    });
    renderProductos(filtrados);
  }

  if (searchInput) {
    searchInput.addEventListener('input', e => {
      lastSearch = e.target.value;
      applyFilters();
    });
  }

  /****************************************************
   * CARRITO
   ****************************************************/
  function saveCart() {
    localStorage.setItem('amat_carrito_v1', JSON.stringify(carrito));
  }

  function updateBadge() {
    const cantidad = carrito.reduce((s, i) => s + i.cantidad, 0);
    cartBadge.style.display = cantidad ? 'flex' : 'none';
    cartBadge.textContent = cantidad;
  }

  function renderCart() {
    cartBody.innerHTML = '';
    if (!carrito.length) {
      cartBody.innerHTML = '<div style="padding:18px;color:#6b7280">Tu carrito está vacío</div>';
      cartTotalEl.textContent = '0';
      updateBadge();
      return;
    }

    let total = 0;

    carrito.forEach((item, i) => {
      const precioUnit = item.cantidad >= item.minMayoreo ? item.precioMayoreo : item.precio;
      total += precioUnit * item.cantidad;

      const node = document.createElement('div');
      node.className = 'cart-item';
      node.innerHTML = `
        <img src="${escapeHtml(item.imagenes?.[0] || '')}">
        <div class="meta">
          <b>${escapeHtml(item.nombre)}${item.color ? ` (${item.color})` : ''}</b>
          <div>$${precioUnit.toFixed(2)} MXN</div>
        </div>
        <div>
          <input class="qty" type="number" min="1" value="${item.cantidad}" data-index="${i}">
          <button class="small-btn" data-remove="${i}">Eliminar</button>
        </div>
      `;
      cartBody.appendChild(node);
    });

    cartTotalEl.textContent = total.toFixed(2);
    updateBadge();
  }

  // Evento agregar al carrito
  catalogoEl.addEventListener('click', e => {
    const btn = e.target.closest('button[data-id]');
    if (!btn) return;

    const p = productos.find(x => x.id === btn.dataset.id);
    if (!p) return;

    const select = document.querySelector(`.color-select[data-id="${p.id}"]`);
    const color = select ? select.value : '';
    const existing = carrito.find(x => x.id === p.id && x.color === color);

    existing ? existing.cantidad++ : carrito.push({ ...p, color, cantidad: 1 });

    saveCart();
    renderCart();
  });

  // Cambiar cantidad en carrito
  cartBody.addEventListener('change', e => {
    const input = e.target.closest('.qty');
    if (!input) return;
    carrito[input.dataset.index].cantidad = +input.value || 1;
    saveCart();
    renderCart();
  });

  // Eliminar del carrito
  cartBody.addEventListener('click', e => {
    const rm = e.target.closest('[data-remove]');
    if (!rm) return;
    carrito.splice(rm.dataset.remove, 1);
    saveCart();
    renderCart();
  });

  function openCart() {
    cartPanel.classList.add('open');
    overlay.classList.add('show');
  }

  function closeCartPanel() {
    cartPanel.classList.remove('open');
    overlay.classList.remove('show');
  }

  cartBtn.addEventListener('click', () =>
    cartPanel.classList.contains('open') ? closeCartPanel() : openCart()
  );
  closeCart.addEventListener('click', closeCartPanel);
  overlay.addEventListener('click', closeCartPanel);

  /****************************************************
   * ENVIAR PEDIDO
   ****************************************************/
  submitBtn.addEventListener('click', () => {
    if (!carrito.length) return alert('El carrito está vacío');

    const nombre = nombreEl.value.trim();
    const telefono = telefonoEl.value.trim();
    const direccion = direccionEl.value.trim();
    const email = emailEl.value.trim();

    if (!nombre || !telefono || !direccion || !email)
      return alert('Completa tus datos');

    const pedidoTexto = carrito
      .map(i => `${i.nombre}${i.color ? ` (${i.color})` : ''} x${i.cantidad}`)
      .join('\n');
    const precioUnitarioTexto = carrito
      .map(i => {
        const p = i.cantidad >= i.minMayoreo ? i.precioMayoreo : i.precio;
        return `$${p.toFixed(2)}`;
      })
      .join('\n');

    const fd = new FormData();
    fd.append(ENTRY.nombre, nombre);
    fd.append(ENTRY.telefono, telefono);
    fd.append(ENTRY.direccion, direccion);
    fd.append(ENTRY.email, email);
    fd.append(ENTRY.pedido, pedidoTexto);
    fd.append(ENTRY.total, cartTotalEl.textContent);
    fd.append(ENTRY.precioUnitario, precioUnitarioTexto);

    fetch(FORM_URL, { method: 'POST', body: fd, mode: 'no-cors' })
      .then(() => {
        alert('Pedido enviado con éxito');
        carrito = [];
        saveCart();
        renderCart();
        closeCartPanel();
      })
      .catch(() => alert('Error al enviar pedido'));
  });

  /****************************************************
   * ZOOM DINAMICO
   ****************************************************/
  document.addEventListener('mousemove', e => {
      if (e.target.closest('.carousel-btn')) {
          const activeImg = e.target.closest('.card-image')?.querySelector('.carousel-img.active');
          if (activeImg) activeImg.style.transform = 'scale(1)';
          return;
      }

      const cardImage = e.target.closest('.card-image.zoom-active');
      if (!cardImage) return;

      const img = cardImage.querySelector('.carousel-img.active') || cardImage.querySelector('img');
      if (!img) return;

      const rect = cardImage.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      img.style.transformOrigin = `${x}% ${y}%`;
      img.style.transform = 'scale(2.5)';
  });

  document.addEventListener('mouseover', e => {
      const cardImage = e.target.closest('.card-image');
      if (cardImage) cardImage.classList.add('zoom-active');
  });

  document.addEventListener('mouseout', e => {
      const cardImage = e.target.closest('.card-image');
      if (cardImage) {
          cardImage.classList.remove('zoom-active');
          const img = cardImage.querySelector('.carousel-img.active') || cardImage.querySelector('img');
          if (img) {
              img.style.transform = 'scale(1)';
              img.style.transformOrigin = 'center center';
          }
      }
  });

  /****************************************************
   * INICIALIZAR
   ****************************************************/
  renderCart();
  cargarProductos();

}); 











