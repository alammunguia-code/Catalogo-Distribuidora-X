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
const FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSe4qzkJIvgWWS0OhKrrOu2BJbuaHRNR5skoWoFQW3Sv-3430Q/formResponse';

const ENTRY = {
  nombre: 'entry.313556667',
  telefono: 'entry.675797328',
  direccion: 'entry.1917704239',
  email: 'entry.865391267',
  pedido: 'entry.889150100',
  total: 'entry.1238815983'
};

/****************************************************
 * VARIABLES GLOBALES
 ****************************************************/
let productos = [];
let productosFiltrados = [];
let carrito = JSON.parse(localStorage.getItem('amat_carrito_v1') || '[]');
let categoriaActual = 'Todos';

/****************************************************
 * DOM READY
 ****************************************************/
document.addEventListener('DOMContentLoaded', () => {
  const catalogoEl = document.getElementById('catalogo');
  const cartBtn = document.getElementById('cart-btn');
  const cartBadge = document.getElementById('cart-badge');
  const cartPanel = document.getElementById('cart-panel');
  const overlay = document.getElementById('overlay');
  const cartBody = document.getElementById('cart-body');
  const cartTotalEl = document.getElementById('cart-total');
  const closeCart = document.getElementById('close-cart');
  const submitBtn = document.getElementById('submit-order');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const searchInput = document.getElementById('search-input');

  /****************************************************
   * CARGAR PRODUCTOS
   ****************************************************/
  async function cargarProductos() {
    try {
      const res = await fetch(SHEET_URL);
      if (!res.ok) throw new Error('Error al cargar Sheet');

      const data = await res.json();

      productos = data.map(row => ({
        id: Number(row.id),
        nombre: row.nombre,
        categoria: row.categoria || 'Otros',
        precio: Number(row.precio) || 0,
        precioMayoreo: Number(row.precio_mayoreo) || 0,
        minMayoreo: Number(row.minimo_mayoreo) || 0,
        colores: row.colores
          ? row.colores.split(',').map(c => c.trim())
          : ['Único'],
        imagen: row.imagen
      }));

      productosFiltrados = [...productos];
      renderProductos();
    } catch (err) {
      console.error(err);
      alert('No se pudieron cargar los productos');
    }
  }

  /****************************************************
   * RENDER PRODUCTOS
   ****************************************************/
  function renderProductos() {
    catalogoEl.innerHTML = '';

    if (productosFiltrados.length === 0) {
      catalogoEl.innerHTML =
        '<p style="padding:20px;color:#6b7280">No hay productos</p>';
      return;
    }

    productosFiltrados.forEach((p, i) => {
      const card = document.createElement('article');
      card.className = 'card';

      let colorHTML = '';
      if (p.colores.length > 1) {
        colorHTML = `
          <select class="color-select" data-id="${p.id}">
            ${p.colores.map(c => `<option>${c}</option>`).join('')}
          </select>
        `;
      }

      card.innerHTML = `
        <img src="${p.imagen}" alt="${p.nombre}">
        <h3>${p.nombre}</h3>

        <div class="price">$${p.precio.toFixed(2)} MXN</div>

        <div style="font-size:13px;color:#16a34a;margin-bottom:8px">
          Mayoreo: $${p.precioMayoreo.toFixed(2)} desde ${p.minMayoreo} pzas
        </div>

        ${colorHTML}

        <button class="btn" data-id="${p.id}">
          Agregar al carrito
        </button>
      `;

      catalogoEl.appendChild(card);
    });
  }

  /****************************************************
   * FILTROS Y BUSCADOR
   ****************************************************/
  function aplicarFiltros() {
    const texto = searchInput.value.toLowerCase();

    productosFiltrados = productos.filter(p => {
      const matchCategoria =
        categoriaActual === 'Todos' || p.categoria === categoriaActual;

      const matchTexto = p.nombre.toLowerCase().includes(texto);

      return matchCategoria && matchTexto;
    });

    renderProductos();
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      categoriaActual = btn.dataset.filter;
      aplicarFiltros();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', aplicarFiltros);
  }

  /****************************************************
   * CARRITO
   ****************************************************/
  function saveCart() {
    localStorage.setItem('amat_carrito_v1', JSON.stringify(carrito));
  }

  function updateBadge() {
    const cantidad = carrito.reduce((s, i) => s + i.cantidad, 0);
    cartBadge.style.display = cantidad > 0 ? 'flex' : 'none';
    cartBadge.textContent = cantidad;
  }

  function renderCart() {
    cartBody.innerHTML = '';

    if (carrito.length === 0) {
      cartBody.innerHTML =
        '<div style="padding:18px;color:#6b7280">Tu carrito está vacío</div>';
      cartTotalEl.textContent = '0.00';
      updateBadge();
      return;
    }

    carrito.forEach((item, index) => {
      const precioUnit =
        item.cantidad >= item.minMayoreo
          ? item.precioMayoreo
          : item.precio;

      const node = document.createElement('div');
      node.className = 'cart-item';

      node.innerHTML = `
        <img src="${item.imagen}">
        <div class="meta">
          <b>${item.nombre} (${item.color})</b>
          <div style="font-size:13px;color:#6b7280">
            $${precioUnit.toFixed(2)} MXN c/u
          </div>
        </div>
        <div>
          <input class="qty" type="number" min="1"
            value="${item.cantidad}" data-index="${index}">
          <button class="small-btn" data-remove="${index}">Eliminar</button>
        </div>
      `;

      cartBody.appendChild(node);
    });

    const total = carrito.reduce((s, i) => {
      const precio =
        i.cantidad >= i.minMayoreo ? i.precioMayoreo : i.precio;
      return s + precio * i.cantidad;
    }, 0);

    cartTotalEl.textContent = total.toFixed(2);
    updateBadge();
  }

  /****************************************************
   * EVENTOS CATÁLOGO
   ****************************************************/
  catalogoEl.addEventListener('click', e => {
    const btn = e.target.closest('button[data-id]');
    if (!btn) return;

    const id = Number(btn.dataset.id);
    const p = productos.find(x => x.id === id);

    const select = document.querySelector(`.color-select[data-id="${id}"]`);
    const color = select ? select.value : p.colores[0];

    const existing = carrito.find(
      x => x.id === p.id && x.color === color
    );

    if (existing) existing.cantidad++;
    else carrito.push({ ...p, color, cantidad: 1 });

    saveCart();
    renderCart();
  });

  cartBody.addEventListener('change', e => {
    const input = e.target.closest('input.qty');
    if (!input) return;

    carrito[input.dataset.index].cantidad =
      parseInt(input.value) || 1;

    saveCart();
    renderCart();
  });

  cartBody.addEventListener('click', e => {
    const rm = e.target.closest('button[data-remove]');
    if (!rm) return;

    carrito.splice(Number(rm.dataset.remove), 1);
    saveCart();
    renderCart();
  });

  /****************************************************
   * ABRIR / CERRAR CARRITO
   ****************************************************/
  function openCart() {
    cartPanel.classList.add('open');
    overlay.classList.add('show');
  }

  function closeCartPanel() {
    cartPanel.classList.remove('open');
    overlay.classList.remove('show');
  }

  cartBtn.addEventListener('click', () =>
    cartPanel.classList.contains('open')
      ? closeCartPanel()
      : openCart()
  );
  closeCart.addEventListener('click', closeCartPanel);
  overlay.addEventListener('click', closeCartPanel);

  /****************************************************
   * ENVIAR PEDIDO
   ****************************************************/
  submitBtn.addEventListener('click', () => {
    if (carrito.length === 0)
      return alert('El carrito está vacío');

    const nombre = document.getElementById('nombre').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const direccion = document.getElementById('direccion').value.trim();
    const email = document.getElementById('email').value.trim();

    if (!nombre || !telefono || !direccion || !email)
      return alert('Completa tus datos');

    const pedidoTexto = carrito
      .map(
        i =>
          `${i.nombre} (${i.color}) x${i.cantidad} = $${(
            (i.cantidad >= i.minMayoreo
              ? i.precioMayoreo
              : i.precio) * i.cantidad
          ).toFixed(2)}`
      )
      .join('\n');

    const fd = new FormData();
    fd.append(ENTRY.nombre, nombre);
    fd.append(ENTRY.telefono, telefono);
    fd.append(ENTRY.direccion, direccion);
    fd.append(ENTRY.email, email);
    fd.append(ENTRY.pedido, pedidoTexto);
    fd.append(ENTRY.total, cartTotalEl.textContent);

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
   * INIT
   ****************************************************/
  cargarProductos();
  renderCart();
});


