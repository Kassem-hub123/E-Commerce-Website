const shop = {
  name: "Shop",
  currency: "USD"
};

let formatMoney = value => `$${Number(value).toFixed(2)}`;

async function api(url, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = localStorage.getItem("admin_token");

  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(url, { ...options, headers });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(body.message || "Something went wrong.");
    error.status = response.status;
    throw error;
  }

  return body;
}

function el(tag, attributes = {}, ...children) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(attributes)) {
    if (value === false || value === null || value === undefined) continue;
    node.setAttribute(key, value === true ? "" : value);
  }

  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child);
  }

  return node;
}

function placeholderImage(name) {
  const label = encodeURIComponent(name || "No photo");
  return `https://placehold.co/600x450/f6f6f4/9a9a9a?text=${label}`;
}

function mainPhoto(product) {
  return product.images[0]?.url || placeholderImage(product.name);
}

function stockLabel(stock) {
  if (stock === 0) return el("p", { class: "sold-out" }, "Out of stock");
  if (stock <= 3) return el("p", { class: "low-stock" }, `Only ${stock} left`);
  return null;
}

function setNote(element, text, isError = false) {
  element.textContent = text;
  element.classList.toggle("bad", isError);
}

const CART_KEY = "cart";

function readCart() {
  try {
    const items = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(items) ? items.filter(item => Number(item.id) > 0 && Number(item.qty) > 0) : [];
  } catch {
    return [];
  }
}

function writeCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  showCartCount();
}

function addToCart(id, quantity = 1, stock = Infinity) {
  const items = readCart();
  const line = items.find(item => item.id === id);
  const total = Math.min((line?.qty || 0) + quantity, stock);

  if (line) {
    line.qty = total;
  } else {
    items.push({ id, qty: total });
  }

  writeCart(items);
  return total;
}

function setCartQuantity(id, quantity) {
  const items = readCart().filter(item => item.id !== id);

  if (quantity > 0) items.push({ id, qty: quantity });

  writeCart(items);
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  showCartCount();
}

function showCartCount() {
  const count = readCart().reduce((total, item) => total + item.qty, 0);

  for (const node of document.querySelectorAll("[data-cart-count]")) {
    node.textContent = count;
    node.hidden = count === 0;
  }
}

async function loadShopSettings() {
  try {
    Object.assign(shop, await api("/api/settings"));
  } catch {
  }

  formatMoney = new Intl.NumberFormat(navigator.language || "en-US", {
    style: "currency",
    currency: shop.currency
  }).format;

  document.title = document.title.replace("Shop", shop.name);

  for (const node of document.querySelectorAll("[data-shop-name]")) {
    node.textContent = shop.name;
  }

  showCartCount();
}
