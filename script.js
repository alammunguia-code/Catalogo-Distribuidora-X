/****************************************************
 * CONFIGURACIÓN GOOGLE SHEETS
 ****************************************************/
const SHEET_ID = '1ZYDo3phbc-IhaD-blVlaH7gbYkoyjhhX-I7Dtm06Cuo';

// Alias para ocultar nombres reales de hojas
const aliasCatalogos = {
  a: 'ClienteA',
  b: 'ClienteB'
};

const params = new URLSearchParams(window.location.search);
const alias = params.get('catalogo') || 'a';
const catalogoSeleccionado = aliasCatalogos[alias] || 'ClienteA';

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
let productosOriginales = [];
let carrito = JSON.parse(localStorage.getItem('amat_carrito_v1') || '[]');
let filtroActual = 'Todos';

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

  /****************************************************
   * CARGAR PRODUCTOS DESDE GOOGLE SHEETS
   ****************************************************/
  async function cargarProductos() {
    try {
      const res = await fetch(SHEET_URL);
      const data = await res.json();

      productosOriginales = data.map((row, index) => ({
        id: Number(row.id) || index + 1,
        nombre: row.nombre,
        precio: Number(String(row.precio).replace(/[^0-9.]/g, '')),
        precioMayoreo: Number(
          String(row.precio_mayoreo).replace(/[^0-9.]/g, '')
        ),
        minMayoreo: Number(row.minimo_mayoreo) || 0,
        categoria: row.categoria || 'Otros',
        imagen:
          row.imagen ||
          'https://via.placeholder.com/400x300?text=Producto'
      }));

      productos = productosOriginales;
      renderProductos();
    } catch (err) {
      console.error('Error cargando productos:', err);
      alert('No se pudieron cargar los productos');
    }
  }

  /****************************************************
   * RENDER CATÁLOGO (CON FILTROS)
   ****************************************************/
  function renderProductos() {
    catalogoEl.innerHTML = '';

    const lista =
      filtroActual === 'Todos'
        ? productosOriginales
        : productosOriginales.filter(
            p => p.categoria === filtroActual
          );

    lista.forEach(p => {
      const card = document.createElement('article');
      card.className = 'card';

      card.innerHTML = `
        <img src="${p.imagen}" alt="${p.nombre}">
        <h3>${p.nombre}</h3>
        <div class="price">$${p.precio} MXN</div>
        <div style="font-size:13px;color:#16a34a;margin-bottom:8px">
          Mayoreo: $${p.precioMayoreo} desde ${p.minMayoreo} pzas
        </div>
        <button class="btn" data-id="${p.id}">
          Agregar al carrito
        </button>
      `;

      catalogoEl.appendChild(card);
    });
  }

  /****************************************************
   * CARRITO
   ****************************************************/
  function saveCart() {
    localStorage.setItem('amat_carrito_v1', JSON.stringify(carrito));
  }

  function updateBadge() {
    const cantidad = carrito.reduce(
      (s, i) => s + i.cantidad,
      0
    );
    cartBadge.style.display = cantidad > 0 ? 'flex' : 'none';
    cartBadge.textContent = cantidad;
  }

  function renderCart() {
    cartBody.innerHTML = '';

    if (carrito.length === 0) {
      cartBody.innerHTML =
        '<div style="padding:18px;color:#6b7280">Tu carrito está vacío</div>';
      cartTotalEl.textContent = '0';
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
