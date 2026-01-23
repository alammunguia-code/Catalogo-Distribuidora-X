/****************************************************
 * CONFIG GOOGLE SHEETS
 ****************************************************/
const SHEET_ID = '1ZYDo3phbc-IhaD-blVlaH7gbYkoyjhhX-I7Dtm06Cuo';
const params = new URLSearchParams(window.location.search);
const catalogoSeleccionado = params.get('catalogo') || 'ClienteA';
const SHEET_URL = `https://opensheet.elk.sh/${SHEET_ID}/${catalogoSeleccionado}`;

/****************************************************
 * VARIABLES GLOBALES
 ****************************************************/
let productos = [];
let carrito = JSON.parse(localStorage.getItem('amat_carrito_v1') || '[]');

let categoriaActiva = 'Todos';
let textoBusqueda = '';

/****************************************************
 * DOM READY
 ****************************************************/
document.addEventListener('DOMContentLoaded', () => {
  const catalogoEl = document.getElementById('catalogo');
  const filtrosEl = document.querySelector('.filters');
  const searchInput = document.getElementById('search-input');

  const cartBtn = document.getElementById('cart-btn');
  const cartBadge = document.getElementById('cart-badge');
  const cartPanel = document.getElementById('cart-panel');
  const overlay = document.getElementById('overlay');
  const cartBody = document.getElementById('cart-body');
  const cartTotalEl = document.getElementById('cart-total');
  const closeCart = document.getElementById('close-cart');

/****************************************************
 * CARGAR PRODUCTOS
 ****************************************************/
  async function cargarProductos() {
    try {
      const res = await fetch(SHEET_URL);
      const data = await res.json();

      productos = data.map(row => ({
        id: Number(row.id),
        nombre: row.nombre,
        categoria: row.categoria || 'Otros',
        precio: Number(row.precio),
        precioMayoreo: Number(row.precio_mayoreo),
        minMayoreo: Number(row.minimo_mayoreo),
        colores: row.colores
          ? row.colores.split(',').map(c => c.trim())
          : ['Único'],
        imagen: row.imagen
      }));

      crearCategoriasAutomaticas();
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
  function crearCategoriasAutomaticas() {
    const categorias = [
      'Todos',
      ...new Set(productos.map(p => p.categoria))
    ];

    filtrosEl.innerHTML = '';

    categorias.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'filter-btn';
      btn.textContent = cat;
      if (cat === 'Todos') btn.classList.add('active');

      btn.addEventListener('click', () => {
        categoriaActiva = cat;
        document
          .querySelectorAll('.filter-btn')
          .forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderProductos();
      });

      filtrosEl.appendChild(btn);
    });
  }

/****************************************************
 * FILTRO + RENDER PRODUCTOS
 ****************************************************/
  function renderProductos() {
    catalogoEl.innerHTML = '';

    const filtrados = productos.filter(p => {
      const coincideCategoria =
        categoriaActiva === 'Todos' ||
        p.categoria === categoriaActiva;

      const coincideTexto =
        p.nombre.toLowerCase().includes(textoBusqueda);

      return coincideCategoria && coincideTexto;
    });

    if (filtrados.length === 0) {
      catalogoEl.innerHTML =
        '<p style="padding:20px">No hay productos</p>';
      return;
    }

    filtrados.forEach(p => {
      const card = document.createElement('article');
      card.className = 'card';

      const colorHTML =
        p.colores.length > 1
          ? `<select class="color-select">
              ${p.colores
                .map(c => `<option>${c}</option>`)
                .join('')}
            </select>`
          : '';

      card.innerHTML = `
        <img src="${p.imagen}">
        <h3>${p.nombre}</h3>
        <div class="price">$${p.precio.toFixed(2)} MXN</div>
        <div class="mayoreo">
          Mayoreo: $${p.precioMayoreo} desde ${p.minMayoreo} pzas
        </div>
        ${colorHTML}
        <button class="btn">Agregar</button>
      `;

      card.querySelector('.btn').addEventListener('click', () => {
        const select = card.querySelector('.color-select');
        const color = select ? select.value : 'Único';

        const existente = carrito.find(
          i => i.id === p.id && i.color === color
        );

        if (existente) existente.cantidad++;
        else carrito.push({ ...p, color, cantidad: 1 });

        guardarCarrito();
        renderCart();
      });

      catalogoEl.appendChild(card);
    });
  }

/****************************************************
 * BUSCADOR
 ****************************************************/
  searchInput.addEventListener('input', e => {
    textoBusqueda = e.target.value.toLowerCase();
    renderProductos();
  });

/****************************************************
 * CARRITO
 ****************************************************/
  function guardarCarrito() {
    localStorage.setItem('amat_carrito_v1', JSON.stringify(carrito));
  }

  function renderCart() {
    cartBody.innerHTML = '';
    let total = 0;

    carrito.forEach((i, idx) => {
      const precio =
        i.cantidad >= i.minMayoreo
          ? i.precioMayoreo
          : i.precio;

      total += precio * i.cantidad;

      cartBody.innerHTML += `
        <div class="cart-item">
          <b>${i.nombre} (${i.color})</b>
          <input type="number" min="1" value="${i.cantidad}"
            data-i="${idx}">
          <button data-r="${idx}">✕</button>
        </div>
      `;
    });

    cartTotalEl.textContent = total.toFixed(2);
    cartBadge.textContent = carrito.length;
    cartBadge.style.display = carrito.length ? 'block' : 'none';
  }

  cartBody.addEventListener('click', e => {
    if (e.target.dataset.r) {
      carrito.splice(e.target.dataset.r, 1);
      guardarCarrito();
      renderCart();
    }
  });

/****************************************************
 * INICIAR
 ****************************************************/
  cargarProductos();
});


