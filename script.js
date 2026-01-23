/****************************************************
 * GOOGLE SHEETS
 ****************************************************/
const SHEET_ID = '1ZYDo3phbc-IhaD-blVlaH7gbYkoyjhhX-I7Dtm06Cuo';
const params = new URLSearchParams(window.location.search);
const catalogoSeleccionado = params.get('catalogo') || 'ClienteA';
const SHEET_URL = `https://opensheet.elk.sh/${SHEET_ID}/${catalogoSeleccionado}`;

/****************************************************
 * VARIABLES
 ****************************************************/
let productos = [];
let carrito = JSON.parse(localStorage.getItem('amat_carrito_v1')) || [];

let categoriaActiva = 'Todos';
let textoBusqueda = '';

/****************************************************
 * DOM READY
 ****************************************************/
document.addEventListener('DOMContentLoaded', () => {
  const catalogoEl = document.getElementById('catalogo');
  const filtersEl = document.querySelector('.filters');
  const searchEl = document.getElementById('search');

  const cartBtn = document.getElementById('cart-btn');
  const cartPanel = document.getElementById('cart-panel');
  const overlay = document.getElementById('overlay');
  const cartBody = document.getElementById('cart-body');
  const cartTotalEl = document.getElementById('cart-total');
  const cartBadge = document.getElementById('cart-badge');

  /****************************************************
   * CARGAR PRODUCTOS
   ****************************************************/
  async function cargarProductos() {
    try {
      const res = await fetch(SHEET_URL);
      if (!res.ok) throw new Error('Error Sheet');

      const data = await res.json();

      productos = data.map(row => ({
        id: row.id || crypto.randomUUID(),
        nombre: row.nombre ? String(row.nombre) : '',
        categoria: row.categoria ? String(row.categoria) : 'Sin categoría',
        precio: Number(row.precio) || 0,
        precioMayoreo: Number(row.precio_mayoreo) || 0,
        minMayoreo: Number(row.minimo_mayoreo) || 0,
        colores: row.colores
          ? String(row.colores).split(',').map(c => c.trim())
          : ['Único'],
        imagen: row.imagen || ''
      }));

      generarCategorias();
      renderProductos();
      renderCart();
    } catch (e) {
      console.error(e);
      alert('No se pudieron cargar los productos');
    }
  }

  /****************************************************
   * CATEGORÍAS AUTOMÁTICAS
   ****************************************************/
  function generarCategorias() {
    if (!filtersEl) return;

    filtersEl.innerHTML = '';

    const categorias = [
      'Todos',
      ...new Set(productos.map(p => p.categoria))
    ];

    categorias.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'filter-btn';
      if (cat === 'Todos') btn.classList.add('active');
      btn.textContent = cat;

      btn.onclick = () => {
        document
          .querySelectorAll('.filter-btn')
          .forEach(b => b.classList.remove('active'));

        btn.classList.add('active');
        categoriaActiva = cat;
        renderProductos();
      };

      filtersEl.appendChild(btn);
    });
  }

  /****************************************************
   * RENDER PRODUCTOS (BLINDADO)
   ****************************************************/
  function renderProductos() {
    catalogoEl.innerHTML = '';

    const filtrados = productos.filter(p => {
      const okCategoria =
        categoriaActiva === 'Todos' ||
        p.categoria === categoriaActiva;

      const nombre = (p.nombre || '').toLowerCase();
      const busqueda = (textoBusqueda || '').toLowerCase();
      const okBusqueda = nombre.includes(busqueda);

      return okCategoria && okBusqueda;
    });

    if (filtrados.length === 0) {
      catalogoEl.innerHTML = '<p>No hay productos</p>';
      return;
    }

    filtrados.forEach(p => {
      const card = document.createElement('div');
      card.className = 'card';

      let colorHTML = '';
      if (Array.isArray(p.colores) && p.colores.length > 1) {
        colorHTML = `
          <select class="color-select">
            ${p.colores.map(c => `<option>${c}</option>`).join('')}
          </select>
        `;
      }

      card.innerHTML = `
        <img src="${p.imagen}">
        <h3>${p.nombre}</h3>
        <div>$${p.precio.toFixed(2)} MXN</div>
        <div class="mayoreo">
          Mayoreo: $${p.precioMayoreo.toFixed(2)} desde ${p.minMayoreo}
        </div>
        ${colorHTML}
        <button class="add-btn">Agregar</button>
      `;

      card.querySelector('.add-btn').onclick = () => {
        const select = card.querySelector('.color-select');
        const color = select ? select.value : 'Único';

        const existente = carrito.find(
          x => x.id === p.id && x.color === color
        );

        if (existente) existente.cantidad++;
        else carrito.push({ ...p, color, cantidad: 1 });

        saveCart();
        renderCart();
      };

      catalogoEl.appendChild(card);
    });
  }

  /****************************************************
   * CARRITO
   ****************************************************/
  function saveCart() {
    localStorage.setItem('amat_carrito_v1', JSON.stringify(carrito));
  }

  function renderCart() {
    cartBody.innerHTML = '';
    let total = 0;

    carrito.forEach((item, i) => {
      const precioUnit =
        item.cantidad >= item.minMayoreo
          ? item.precioMayoreo
          : item.precio;

      total += precioUnit * item.cantidad;

      const div = document.createElement('div');
      div.innerHTML = `
        <strong>${item.nombre} (${item.color})</strong>
        <input type="number" min="1" value="${item.cantidad}">
        <button>✕</button>
      `;

      div.querySelector('input').onchange = e => {
        item.cantidad = Number(e.target.value) || 1;
        saveCart();
        renderCart();
      };

      div.querySelector('button').onclick = () => {
        carrito.splice(i, 1);
        saveCart();
        renderCart();
      };

      cartBody.appendChild(div);
    });

    cartTotalEl.textContent = total.toFixed(2);
    cartBadge.textContent = carrito.reduce(
      (s, i) => s + i.cantidad,
      0
    );
  }

  /****************************************************
   * BUSCADOR (SEGURO)
   ****************************************************/
  if (searchEl) {
    searchEl.addEventListener('input', e => {
      textoBusqueda = e.target.value || '';
      renderProductos();
    });
  }

  /****************************************************
   * CARRITO UI
   ****************************************************/
  if (cartBtn && overlay) {
    cartBtn.onclick = () => {
      cartPanel.classList.add('open');
      overlay.classList.add('show');
    };

    overlay.onclick = () => {
      cartPanel.classList.remove('open');
      overlay.classList.remove('show');
    };
  }

  cargarProductos();
});

