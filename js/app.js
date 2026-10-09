// ============================================================================
//  Tilisarao Libre - logica del marketplace (Supabase)
//  Las funciones que se usan con onclick= en index.html se exportan a window.
// ============================================================================

import { sb, isConfigured } from './supabase-client.js';

let cartItems = [];
let productos = [];
let currentUser = null;
let currentSession = null;

const BUCKET = 'productos';

// --------------------------------------------------------------- utilidades
function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function money(value) {
  const n = Number(value || 0);
  return n.toLocaleString('es-AR', { maximumFractionDigits: 2 });
}

function errMsg(error) {
  return (error && (error.message || error.error_description)) || 'Error desconocido';
}

// ------------------------------------------------------------------ whatsapp
function waNumber(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('0')) d = '549' + d.slice(1);
  else if (!d.startsWith('54')) d = '549' + d;
  return d;
}

function openWhatsApp(number, text) {
  window.open('https://wa.me/' + number + '?text=' + encodeURIComponent(text), '_blank');
}

function contactSeller(product) {
  const num = waNumber(product.phone);
  if (!num) {
    alert('Este vendedor no cargó su WhatsApp en la publicación.');
    return;
  }
  const texto =
    '¡Hola! Vi tu publicación en *Tilisarao Libre* y quiero comprar:\n\n' +
    '• ' + product.title + '\n' +
    '• $' + money(product.price) + '\n\n' +
    '¿Sigue disponible? ¡Gracias!';
  openWhatsApp(num, texto);
}

// ------------------------------------------------------------ carga productos
async function loadProducts() {
  const container = document.getElementById('products-container');

  if (!isConfigured) {
    container.innerHTML =
      '<div class="no-results"><h3>Configurá Supabase</h3>' +
      '<p>Edita <b>js/supabase-client.js</b> con tu Project URL y tu anon key, ' +
      'y corré <b>sql/schema.sql</b> en el SQL Editor.</p></div>';
    return;
  }

  const { data, error } = await sb
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading products:', error);
    container.innerHTML =
      '<div class="no-results"><h3>No se pudieron cargar los productos</h3>' +
      '<p>' + esc(errMsg(error)) + '</p></div>';
    return;
  }

  productos = Array.isArray(data) ? data : [];
  displayProducts(productos);
}

function displayProducts(products) {
  const container = document.getElementById('products-container');
  container.innerHTML = '';

  if (!Array.isArray(products) || products.length === 0) {
    container.innerHTML =
      '<div class="no-results"><h3>No hay productos para mostrar</h3>' +
      '<p>Publicá el primero con el botón <b>Vender</b>.</p></div>';
    return;
  }

  products.forEach((product) => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.onclick = () => showProductDetail(product);

    const imageHtml = product.image_url
      ? `<img src="${esc(product.image_url)}" alt="${esc(product.title)}" class="product-image">`
      : '<div class="product-image" style="background:#f0f0f0;display:flex;align-items:center;justify-content:center;color:#666;">Sin imagen</div>';

    card.innerHTML = `
      ${imageHtml}
      <div class="product-title">${esc(product.title)}</div>
      <div class="product-price">$${money(product.price)}</div>
      <div style="font-size:12px;color:#666;margin:5px 0;">
        <i class="fas fa-user"></i> ${esc(product.nick || 'usuario')}
      </div>
      <div class="product-actions">
        <button class="add-to-cart" data-id="${esc(product.id)}">
          <i class="fas fa-cart-plus"></i> Agregar al carrito
        </button>
      </div>
    `;

    card.querySelector('.add-to-cart').addEventListener('click', (event) => {
      event.stopPropagation();
      addToCart(product.id, event);
    });

    container.appendChild(card);
  });
}

// --------------------------------------------------------------------- carrito
function addToCart(productId, event) {
  if (event) event.stopPropagation();
  const product = productos.find((p) => p.id === productId);
  if (!product) return;

  const existente = cartItems.find((item) => item.id === productId);
  if (existente) existente.cantidad += 1;
  else cartItems.push({ ...product, cantidad: 1 });

  updateCartCount();
  saveCart();
  alert('Producto agregado al carrito');
}

function updateCartCount() {
  const badge = document.querySelector('.cart-count');
  if (!badge) return;
  const total = cartItems.reduce((sum, item) => sum + item.cantidad, 0);
  badge.textContent = total;
  badge.style.display = total > 0 ? 'flex' : 'none';
}

function showCart() {
  const modal = document.getElementById('cartModal');
  const itemsEl = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');

  itemsEl.innerHTML = '';
  let total = 0;

  if (cartItems.length === 0) {
    itemsEl.innerHTML = '<p style="color:#666;">Tu carrito está vacío.</p>';
  }

  cartItems.forEach((item, index) => {
    total += Number(item.price) * item.cantidad;
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <div class="cart-item-details">
        <h3>${esc(item.title)}</h3>
        <p>Precio: $${money(item.price)}</p>
        <p>Cantidad: ${item.cantidad}</p>
        <small style="color:#666;"><i class="fas fa-user"></i> ${esc(item.nick || 'usuario')}</small>
      </div>
      <button data-index="${index}"><i class="fas fa-trash"></i></button>
    `;
    row.querySelector('button').addEventListener('click', () => removeFromCart(index));
    itemsEl.appendChild(row);
  });

  totalEl.textContent = money(total);
  modal.style.display = 'block';
}

function closeCartModal() {
  document.getElementById('cartModal').style.display = 'none';
}

function removeFromCart(index) {
  cartItems.splice(index, 1);
  updateCartCount();
  saveCart();
  showCart();
}

function clearCart() {
  cartItems = [];
  updateCartCount();
  saveCart();
  showCart();
}

function procederAlPago() {
  if (cartItems.length === 0) {
    alert('El carrito está vacío');
    return;
  }

  const vendedores = {};
  cartItems.forEach((item) => {
    const nick = item.nick || 'usuario';
    if (!vendedores[nick]) {
      const catalogo = productos.find((p) => p.id === item.id) || {};
      vendedores[nick] = { nick, phone: catalogo.phone || item.phone, items: [], total: 0 };
    }
    vendedores[nick].items.push(item);
    vendedores[nick].total += Number(item.price) * item.cantidad;
  });

  const lista = Object.values(vendedores);

  if (lista.length > 1) {
    alert(
      'Tu carrito tiene productos de ' + lista.length +
      ' vendedores distintos. Abrí cada producto y compralo por WhatsApp a cada uno.'
    );
    return;
  }

  const v = lista[0];
  const num = waNumber(v.phone);
  if (!num) {
    alert('El vendedor no cargó su WhatsApp en la publicación.');
    return;
  }

  const lineas = v.items
    .map((i) => '• ' + i.title + ' x' + i.cantidad + ' - $' + money(Number(i.price) * i.cantidad))
    .join('\n');

  const texto =
    '¡Hola! Quiero hacer este pedido de *Tilisarao Libre*:\n\n' +
    lineas + '\n\n' +
    '*Total: $' + money(v.total) + '*\n\n' +
    '¿Coordinamos el pago y la entrega? ¡Gracias!';

  openWhatsApp(num, texto);
}

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cartItems));
}

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem('cart') || '[]');
    cartItems = Array.isArray(saved) ? saved : [];
  } catch (e) {
    cartItems = [];
  }
  updateCartCount();
}

// ------------------------------------------------------------ detalle producto
function showProductDetail(product) {
  const modal = document.getElementById('productModal');
  const content = document.getElementById('productDetailContent');

  const imageHtml = product.image_url
    ? `<img src="${esc(product.image_url)}" alt="${esc(product.title)}" style="width:100%;max-height:400px;object-fit:contain;border-radius:8px;">`
    : '<div style="width:100%;height:300px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;color:#666;border-radius:8px;">Sin imagen disponible</div>';

  const esDuenio = !!(currentSession && product.user_id && product.user_id === currentSession.user.id);

  content.innerHTML = `
    <div class="product-detail-info">
      <h2 class="product-detail-title">${esc(product.title)}</h2>
      <p class="product-detail-description">${esc(product.description || 'Sin descripción')}</p>
      <div class="product-detail-price">$${money(product.price)}</div>
      <div style="font-size:14px;color:#666;margin:10px 0;">
        <i class="fas fa-user"></i> Vendido por: ${esc(product.nick || 'usuario')}
      </div>
      <button class="buy-button" id="buyNowBtn" style="background:#25D366;">
        <i class="fab fa-whatsapp"></i> Comprar por WhatsApp
      </button>
      <button class="btn btn-secondary" id="detailCartBtn" style="width:100%;margin-top:10px;">
        <i class="fas fa-cart-plus"></i> Agregar al carrito
      </button>
      ${esDuenio ? `
        <button class="btn btn-danger" id="deleteProductBtn" style="width:100%;margin-top:10px;">
          <i class="fas fa-trash"></i> Eliminar mi publicación
        </button>` : ''}
    </div>
    <div>${imageHtml}</div>
  `;

  content.querySelector('#buyNowBtn').addEventListener('click', () => {
    contactSeller(product);
  });

  content.querySelector('#detailCartBtn').addEventListener('click', () => {
    addToCart(product.id);
  });

  if (esDuenio) {
    content.querySelector('#deleteProductBtn').addEventListener('click', () => {
      deleteProduct(product.id);
    });
  }

  modal.style.display = 'block';
}

function closeModal() {
  document.getElementById('productModal').style.display = 'none';
}

// ------------------------------------------------------------ buscar y ordenar
function handleSearch(event) {
  if (event.key === 'Enter') searchProducts();
}

function searchProducts() {
  const term = document.getElementById('searchInput').value.toLowerCase().trim();
  const filtered = productos.filter(
    (p) =>
      (p.title || '').toLowerCase().includes(term) ||
      (p.description || '').toLowerCase().includes(term) ||
      (p.nick || '').toLowerCase().includes(term)
  );
  displayProducts(filtered);
}

function sortProducts(mode) {
  const list = [...productos];
  if (mode === 'asc') list.sort((a, b) => Number(a.price) - Number(b.price));
  else if (mode === 'desc') list.sort((a, b) => Number(b.price) - Number(a.price));
  else list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  displayProducts(list);
}

// ------------------------------------------------------------------ publicar
function openContactModal() {
  if (!currentSession) {
    alert('Para vender productos necesitás iniciar sesión.');
    window.location.href = 'auth.html';
    return;
  }
  document.getElementById('contactModal').style.display = 'block';
}

function closeContactModal() {
  document.getElementById('contactModal').style.display = 'none';
}

async function createProduct() {
  if (!currentSession) {
    alert('Debes iniciar sesión para publicar productos');
    window.location.href = 'auth.html';
    return;
  }

  const title = document.getElementById('productTitle').value.trim();
  const description = document.getElementById('productDescription').value.trim();
  const price = parseFloat(document.getElementById('productPrice').value);
  const phone = document.getElementById('productPhone').value.trim();
  const file = document.getElementById('productImage').files[0];

  if (!title) return alert('El título del producto es obligatorio');
  if (isNaN(price) || price < 0) return alert('El precio debe ser un número mayor o igual a 0');
  if (!phone || String(phone).replace(/\D/g, '').length < 8) {
    return alert('Cargá tu WhatsApp con código de área, ej: 2664123456');
  }
  if (file && !file.type.startsWith('image/')) return alert('Solo se permiten imágenes');
  if (file && file.size > 5 * 1024 * 1024) return alert('La imagen no puede superar 5 MB');

  const button = document.querySelector('#contactModal .btn-primary');
  if (button) button.disabled = true;

  try {
    let image_url = null;

    if (file) {
      const path = `${currentSession.user.id}/${Date.now()}_${file.name
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .slice(-60)}`;

      const { error: upError } = await sb.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (upError) throw upError;

      image_url = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    }

    const { error } = await sb.from('products').insert({
      title,
      description,
      price,
      phone,
      image_url,
      user_id: currentSession.user.id,
      nick: currentUser ? currentUser.nick : 'usuario',
    });
    if (error) throw error;

    document.getElementById('productForm').reset();
    closeContactModal();
    alert('¡Producto publicado exitosamente!');
    await loadProducts();
  } catch (error) {
    console.error('Error creating product:', error);
    alert('Error al publicar: ' + errMsg(error));
  } finally {
    if (button) button.disabled = false;
  }
}

// --------------------------------------------------------------------- borrar
async function deleteProduct(productId) {
  if (!currentSession) {
    alert('Tenés que iniciar sesión para administrar tu publicación');
    window.location.href = 'auth.html';
    return;
  }

  const product = productos.find((p) => p.id === productId);
  const titulo = product ? product.title : 'este producto';

  if (!confirm('¿Eliminar "' + titulo + '"?\n\nLa publicación se borra para todos y no se puede deshacer.')) {
    return;
  }

  const { error } = await sb
    .from('products')
    .delete()
    .eq('id', productId)
    .eq('user_id', currentSession.user.id);

  if (error) {
    console.error('Error deleting product:', error);
    alert('No se pudo eliminar: ' + errMsg(error));
    return;
  }

  cartItems = cartItems.filter((item) => item.id !== productId);
  updateCartCount();
  saveCart();

  closeModal();
  alert('Publicación eliminada');
  await loadProducts();
}

// ------------------------------------------------------------------ sesión
async function fetchProfile(user) {
  const { data } = await sb
    .from('profiles')
    .select('nick')
    .eq('id', user.id)
    .maybeSingle();
  return {
    id: user.id,
    email: user.email,
    nick: (data && data.nick) || (user.user_metadata && user.user_metadata.nick) || user.email,
  };
}

function guestMenu() {
  const menu = document.querySelector('.user-menu');
  if (!menu) return;
  menu.innerHTML = `
    <a href="auth.html" style="color:#3483fa;text-decoration:none;font-size:14px;padding:8px 12px;">
      <i class="fas fa-sign-in-alt"></i> Ingresar
    </a>
    <a href="#" class="vender-button" onclick="openContactModal()">Vender</a>
    <a href="#" onclick="showCart()" class="cart-button">
      <i class="fas fa-shopping-cart"></i>
      <span class="cart-count">0</span>
    </a>
  `;
  updateCartCount();
}

function userMenu(user) {
  const menu = document.querySelector('.user-menu');
  if (!menu) return;
  menu.innerHTML = `
    <span style="color:#333;font-size:14px;margin-right:15px;">
      <i class="fas fa-user"></i> ${esc(user.nick)}
    </span>
    <a href="#" class="vender-button" onclick="openContactModal()">Vender</a>
    <a href="#" onclick="logout()" style="color:#666;text-decoration:none;font-size:14px;padding:8px 12px;">
      <i class="fas fa-sign-out-alt"></i> Salir
    </a>
    <a href="#" onclick="showCart()" class="cart-button">
      <i class="fas fa-shopping-cart"></i>
      <span class="cart-count">0</span>
    </a>
  `;
  updateCartCount();
}

async function checkAuthStatus() {
  if (!isConfigured) {
    guestMenu();
    return;
  }
  const { data } = await sb.auth.getSession();
  currentSession = data.session;

  if (currentSession) {
    currentUser = await fetchProfile(currentSession.user);
    userMenu(currentUser);
  } else {
    currentUser = null;
    guestMenu();
  }
}

async function logout() {
  if (!confirm('¿Estás seguro de que querés cerrar sesión?')) return;
  if (isConfigured) await sb.auth.signOut();
  currentUser = null;
  currentSession = null;
  localStorage.removeItem('cart');
  cartItems = [];
  updateCartCount();
  guestMenu();
}

// ------------------------------------------------------------------- arranque
document.addEventListener('DOMContentLoaded', () => {
  loadCart();
  loadProducts();
  checkAuthStatus();

  if (isConfigured) {
    sb.auth.onAuthStateChange(async (event, session) => {
      currentSession = session;
      if (session) {
        currentUser = await fetchProfile(session.user);
        userMenu(currentUser);
      } else {
        currentUser = null;
        guestMenu();
      }
    });
  }

  const sortButtons = document.querySelectorAll('.filter-button');
  if (sortButtons[0]) sortButtons[0].addEventListener('click', () => sortProducts('asc'));
  if (sortButtons[1]) sortButtons[1].addEventListener('click', () => sortProducts('desc'));
  if (sortButtons[2]) sortButtons[2].addEventListener('click', () => sortProducts('recent'));

  // Atajo del ícono instalado: index.html?vender=1 abre directo el formulario
  if (new URLSearchParams(window.location.search).get('vender') === '1') {
    setTimeout(openContactModal, 400);
  }

  window.onclick = (event) => {
    document.querySelectorAll('.modal').forEach((modal) => {
      if (event.target === modal) modal.style.display = 'none';
    });
    const contactModal = document.getElementById('contactModal');
    if (event.target === contactModal) contactModal.style.display = 'none';
  };
});

// Handlers usados desde el HTML (onclick=)
window.loadProducts = loadProducts;
window.displayProducts = displayProducts;
window.addToCart = addToCart;
window.updateCartCount = updateCartCount;
window.showCart = showCart;
window.closeCartModal = closeCartModal;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.procederAlPago = procederAlPago;
window.showProductDetail = showProductDetail;
window.closeModal = closeModal;
window.contactSeller = contactSeller;
window.waNumber = waNumber;
window.openWhatsApp = openWhatsApp;
window.handleSearch = handleSearch;
window.searchProducts = searchProducts;
window.sortProducts = sortProducts;
window.openContactModal = openContactModal;
window.closeContactModal = closeContactModal;
window.createProduct = createProduct;
window.deleteProduct = deleteProduct;
window.logout = logout;
window.checkAuthStatus = checkAuthStatus;
