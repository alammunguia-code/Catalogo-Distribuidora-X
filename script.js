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
let carrito = JSON.parse(localStorage.getItem('amat_carrito_v1') || '[]');

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
      if (!res.ok) throw new Error('Error al cargar Sheet');

      const data = await res.json();

      productos = data.map(row => ({
        id: Number(row.id),
        nombre: row.nombre,
        precio: Number(row.precio),
        precioMayoreo: Number(row.precio_mayoreo),
        minMayoreo: Number(row.minimo_mayoreo),

        // 🔐 Protegido contra errores
        colores: row.colores
          ? row.colores.split(',').map(c => c.trim())
          : ['Único'],

        imagen: row.imagen
      }));

      renderProductos();
    } catch (err) {
      console.error('Error cargando productos:', err);
      alert('No se pudieron cargar los productos');
    }
  }

  /****************************************************
   * RENDER CATÁLOGO
   ****************************************************/
  function renderProductos() {
    catalogoEl.innerHTML = '';

    productos.forEach((p, i) => {
      const card = document.createElement('article');
      card.className = 'card';

      const colorSelect =
        p.colores.length > 1
          ? `
          <select class="color-select" data-index="${i}">
            ${p.colores
              .map(color => `<option value="${color}">${color}</option>`)
              .join('')}
          </select>
        `
          : `<div style="font-size:13px;color:#6b7280;margin-bottom:6px">
              Color: ${p.colores[0]}
            </div>`;

      card.innerHTML = `
        <img src="${p.imagen}" alt="${p.nombre}">
        <h3>${p.nombre}</h3>
        <div class="price">$${p.precio} MXN</div>

        <div style="font-size:13px;color:#16a34a;margin-bottom:8px">
          Mayoreo: $${p.precioMayoreo} desde ${p.minMayoreo} pzas
        </div>

        ${colorSelect}

        <button class="btn" data-index="${i}">Agregar al carrito</button>
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
    const cantidad = carrito.reduce((s, i) => s + i.cantidad, 0);
    cartBadge.style.display = cantidad > 0 ? 'flex' : 'none';
    cartBadge.textContent = cantidad;
  }

  function renderCart() {
    cartBody.innerHTML = '';

    if (carrito.length === 0) {
      cartBody.innerHTML =
        '<div style="padding:18px;color:#6b7280">Tu carrito está vacío</div>';
     cartTotalEl.textContent = total.toFixed(2);
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
            $${precioUnit} MXN c/u
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

    cartTotalEl.textContent = total;
    updateBadge();
  }

  /****************************************************
   * EVENTOS CATÁLOGO
   ****************************************************/
  catalogoEl.addEventListener('click', e => {
    const btn = e.target.closest('button[data-index]');
    if (!btn) return;

    const idx = Number(btn.dataset.index);
    const p = productos[idx];

    const select = document.querySelector(
      `.color-select[data-index="${idx}"]`
    );
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

    carrito[Number(input.dataset.index)].cantidad =
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
          `${i.nombre} (${i.color}) x${i.cantidad} = $${
            (i.cantidad >= i.minMayoreo
              ? i.precioMayoreo
              : i.precio) * i.cantidad
          }`
      )
      .join('\n');

    const total = cartTotalEl.textContent;

    const fd = new FormData();
    fd.append(ENTRY.nombre, nombre);
    fd.append(ENTRY.telefono, telefono);
    fd.append(ENTRY.direccion, direccion);
    fd.append(ENTRY.email, email);
    fd.append(ENTRY.pedido, pedidoTexto);
    fd.append(ENTRY.total, total);

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
   * INICIALIZAR
   ****************************************************/
  cargarProductos();
  renderCart();
});

