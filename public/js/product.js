const container = document.querySelector("#product");

function gallery(product) {
  const photos = product.images.length
    ? product.images.map(image => image.url)
    : [placeholderImage(product.name)];

  let index = 0;

  const main = el("img", { src: photos[0], alt: product.name });
  const counter = el("span", { class: "counter" }, `1 / ${photos.length}`);
  const previous = el("button", { class: "arrow previous", type: "button", "aria-label": "Previous photo" }, "‹");
  const next = el("button", { class: "arrow next", type: "button", "aria-label": "Next photo" }, "›");

  const thumbs = photos.map((url, position) =>
    el(
      "button",
      { type: "button", class: position === 0 ? "on" : null, "aria-label": `Photo ${position + 1}` },
      el("img", { src: url, alt: "", loading: "lazy" })
    )
  );

  function show(wanted) {
    index = (wanted + photos.length) % photos.length;
    main.src = photos[index];
    counter.textContent = `${index + 1} / ${photos.length}`;
    thumbs.forEach((thumb, position) => thumb.classList.toggle("on", position === index));
  }

  thumbs.forEach((thumb, position) => thumb.addEventListener("click", () => show(position)));
  previous.addEventListener("click", () => show(index - 1));
  next.addEventListener("click", () => show(index + 1));

  const frame = el("div", { class: "main" }, main);

  if (photos.length > 1) {
    frame.append(previous, next, counter);

    document.addEventListener("keydown", event => {
      if (event.key === "ArrowLeft") show(index - 1);
      if (event.key === "ArrowRight") show(index + 1);
    });

    let startX = 0;

    frame.addEventListener("touchstart", event => {
      startX = event.changedTouches[0].clientX;
    }, { passive: true });

    frame.addEventListener("touchend", event => {
      const moved = event.changedTouches[0].clientX - startX;
      if (Math.abs(moved) > 40) show(index + (moved < 0 ? 1 : -1));
    });
  }

  return el("div", { class: "gallery" }, frame, photos.length > 1 ? el("div", { class: "thumbs" }, thumbs) : null);
}

function cartForm(product) {
  if (product.stock === 0) {
    return el("div", {}, el("button", { type: "button", disabled: true }, "Out of stock"));
  }

  const note = el("p", { class: "note", role: "status" });

  const quantity = el("input", {
    type: "number",
    min: "1",
    max: String(product.stock),
    value: "1",
    "aria-label": "Quantity"
  });

  const add = el("button", { type: "button" }, "Add to cart");

  add.addEventListener("click", () => {
    const wanted = Math.min(Math.max(Number(quantity.value) || 1, 1), product.stock);
    const inCart = addToCart(product.id, wanted, product.stock);

    quantity.value = "1";
    note.replaceChildren(
      `${inCart} in your cart. `,
      el("a", { href: "/cart.html" }, "View cart")
    );
  });

  return el("div", {}, el("div", { class: "buy" }, quantity, add), note);
}

function details(product) {
  return el(
    "div",
    {},
    el("a", { class: "tag", href: `/?category=${product.category_id}` }, product.category_name),
    el("h1", {}, product.name),
    el("p", { class: "price" }, formatMoney(product.price)),
    stockLabel(product.stock),
    el("p", { class: "description" }, product.description),
    cartForm(product)
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
