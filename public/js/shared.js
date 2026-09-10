// Small helpers shared by the storefront and the admin pages.

const shop = {
  name: "Shop",
  whatsapp: "",
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

// Creates an element: el("p", { class: "note" }, "text", childNode)
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

function whatsappLink(message) {
  if (!shop.whatsapp) return null;
  return `https://wa.me/${shop.whatsapp}?text=${encodeURIComponent(message)}`;
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

async function loadShopSettings() {
  try {
    Object.assign(shop, await api("/api/settings"));
  } catch {
    // Keep the defaults; the pages still work without the shop details.
  }

  formatMoney = new Intl.NumberFormat(navigator.language || "en-US", {
    style: "currency",
    currency: shop.currency
  }).format;

  document.title = document.title.replace("Shop", shop.name);

  for (const node of document.querySelectorAll("[data-shop-name]")) {
    node.textContent = shop.name;
  }
}
