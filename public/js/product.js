// Single product page with a small photo gallery and the WhatsApp link.

const container = document.querySelector("#product");

function gallery(product) {
  const photos = product.images.length
    ? product.images.map(image => image.url)
    : [placeholderImage(product.name)];

  const main = el("img", { src: photos[0], alt: product.name });
  const thumbs = photos.map((url, index) =>
    el(
      "button",
      { type: "button", class: index === 0 ? "on" : null, "aria-label": `Photo ${index + 1}` },
      el("img", { src: url, alt: "", loading: "lazy" })
    )
  );

  thumbs.forEach((thumb, index) => {
    thumb.addEventListener("click", () => {
      main.src = photos[index];
      thumbs.forEach(other => other.classList.toggle("on", other === thumb));
    });
  });

  return el(
    "div",
    { class: "gallery" },
    el("div", { class: "main" }, main),
    photos.length > 1 ? el("div", { class: "thumbs" }, thumbs) : null
  );
}

function details(product) {
  const link = whatsappLink(`Hi, I would like to ask about "${product.name}".`);

  return el(
    "div",
    {},
    el("a", { class: "tag", href: `/?category=${product.category_id}` }, product.category_name),
    el("h1", {}, product.name),
    el("p", { class: "price" }, formatMoney(product.price)),
    stockLabel(product.stock),
    el("p", { class: "description" }, product.description),
    link
      ? el("a", { class: "button whatsapp", href: link, target: "_blank", rel: "noopener" }, "Ask on WhatsApp")
      : el("p", { class: "note" }, "Set WHATSAPP_NUMBER in the .env file to show the WhatsApp button.")
  );
}

async function load() {
  const id = new URLSearchParams(location.search).get("id");

  if (!id) {
    container.replaceChildren(el("p", { class: "empty" }, "No product was chosen."));
    return;
  }

  try {
    const product = await api(`/api/products/${id}`);
    document.title = `${product.name} — ${shop.name}`;
    container.className = "product";
    container.replaceChildren(gallery(product), details(product));
  } catch (error) {
    container.replaceChildren(el("p", { class: "empty" }, error.message));
  }
}

loadShopSettings().then(load);
