const container = document.querySelector("#cart");

async function loadLines() {
  const lines = [];
  const dropped = [];
  let trimmed = false;

  for (const item of readCart()) {
    let product = null;

    try {
      product = await api(`/api/products/${item.id}`);
    } catch {
      setCartQuantity(item.id, 0);
      dropped.push("Something in your cart is not sold any more, so it was removed.");
      continue;
    }

    if (product.stock === 0) {
      setCartQuantity(product.id, 0);
      dropped.push(`"${product.name}" sold out, so it was removed.`);
      continue;
    }

    const qty = Math.min(item.qty, product.stock);

    if (qty !== item.qty) {
      setCartQuantity(product.id, qty);
      trimmed = true;
    }

    lines.push({ product, qty });
  }

  return { lines, dropped: [...new Set(dropped)], trimmed };
}

function cartLine({ product, qty }) {
  const amount = el("input", {
    type: "number",
    min: "1",
    max: String(product.stock),
    value: String(qty),
    "aria-label": `Quantity of ${product.name}`
  });

  const remove = el("button", { class: "danger", type: "button" }, "Remove");

  amount.addEventListener("change", () => {
    const wanted = Math.min(Math.max(Number(amount.value) || 1, 1), product.stock);
    setCartQuantity(product.id, wanted);
    show();
  });

  remove.addEventListener("click", () => {
    setCartQuantity(product.id, 0);
    show();
  });

  return el(
    "div",
    { class: "item cart-item" },
    el("img", { src: mainPhoto(product), alt: "", loading: "lazy" }),
    el(
      "div",
      { class: "info" },
      el("a", { href: `/product.html?id=${product.id}` }, el("strong", {}, product.name)),
      el("p", {}, `${formatMoney(product.price)} each · ${product.stock} in stock`)
    ),
    el("div", { class: "qty" }, amount),
    el("p", { class: "line-total" }, formatMoney(product.price * qty)),
    el("div", { class: "buttons" }, remove)
  );
}

function orderPlaced(order, customer) {
  container.replaceChildren(
    el("h2", { class: "thanks" }, "Thank you!"),
    el("p", {}, `Your order is number ${order.id}. The total is ${formatMoney(order.total)}.`),
    el("p", {}, `We will call you on ${customer.phone} to arrange the delivery.`),
    el("a", { class: "button", href: "/" }, "Keep shopping")
  );
}

function checkout(total, customer) {
  const note = el("p", { class: "note", role: "status" }, customer.error || "");
  if (customer.error) note.classList.add("bad");

  const field = (name, label, value, extra = {}) =>
    el("label", {}, el("span", {}, label), el("input", { name, value, ...extra }));

  const button = el("button", { type: "submit" }, "Place the order");

  const clear = el("button", { class: "plain", type: "button" }, "Clear cart");

  clear.addEventListener("click", () => {
    if (confirm("Remove everything from the cart?")) {
      clearCart();
      show();
    }
  });

  const form = el(
    "form",
    { class: "summary" },
    el("p", { class: "total" }, el("span", {}, "Total"), el("strong", {}, formatMoney(total))),
    field("customer_name", "Your name", customer.customer_name, { required: true }),
    field("phone", "Phone number", customer.phone, { type: "tel", required: true }),
    el(
      "label",
      {},
      el("span", {}, "Address or a note (optional)"),
      el("textarea", { name: "address", rows: "2" }, customer.address)
    ),
    el("div", { class: "actions" }, button, clear),
    note
  );

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const values = Object.fromEntries(new FormData(form));
    setNote(note, "Sending your order…");
    button.disabled = true;

    try {
      const order = await api("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, items: readCart() })
      });

      clearCart();
      orderPlaced(order, values);
    } catch (error) {
      button.disabled = false;
      show({ ...values, error: error.message });
    }
  });

  return form;
}

async function show(customer = {}) {
  const { lines, dropped, trimmed } = await loadLines();

  const notes = [...dropped];
  if (trimmed) notes.push("There was not enough stock, so some amounts were lowered.");

  const warnings = notes.map(text => el("p", { class: "note bad" }, text));

  if (!lines.length) {
    container.replaceChildren(
      el("p", { class: "empty" }, "Your cart is empty."),
      el("a", { class: "button", href: "/" }, "Browse the products"),
      ...warnings
    );
    return;
  }

  const total = lines.reduce((sum, { product, qty }) => sum + product.price * qty, 0);
  const count = lines.reduce((sum, { qty }) => sum + qty, 0);

  container.replaceChildren(
    el("p", { class: "result-line" }, `${count} ${count === 1 ? "item" : "items"}`),
    ...lines.map(cartLine),
    checkout(total, customer),
    ...warnings
  );
}

loadShopSettings().then(() => show());
