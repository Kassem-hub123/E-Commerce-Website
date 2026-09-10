const list = document.querySelector("#order-list");
const note = document.querySelector("#order-note");
const tabs = document.querySelector("#order-tabs");

const empty = {
  pending: "Nothing waiting. New orders show up here.",
  done: "No finished orders yet.",
  deleted: "The bin is empty."
};

let view = "pending";

function when(order) {
  return new Date(order.created_at).toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function buttonsFor(order) {
  if (view === "deleted") {
    const restore = el("button", { class: "plain", type: "button" }, "Restore");
    const forever = el("button", { class: "danger", type: "button" }, "Delete forever");

    restore.addEventListener("click", () => restoreOrder(order));
    forever.addEventListener("click", () => deleteForever(order));

    return [restore, forever];
  }

  const done = order.status === "done";
  const toggle = el("button", { class: "plain", type: "button" }, done ? "Move back to pending" : "Mark as done");
  const remove = el("button", { class: "danger", type: "button" }, "Delete");

  toggle.addEventListener("click", () => setStatus(order, done ? "new" : "done"));
  remove.addEventListener("click", () => deleteOrder(order));

  return [toggle, remove];
}

function label(order) {
  if (view === "deleted") return el("span", { class: "badge muted" }, "Deleted");
  if (order.status === "done") return el("span", { class: "badge muted" }, "Done");
  return el("span", { class: "badge" }, "New");
}

function orderCard(order) {
  const quiet = view !== "pending";

  const items = order.items.map(item =>
    el(
      "li",
      {},
      el("span", {}, `${item.quantity} × ${item.product_name}`),
      el("span", {}, formatMoney(item.unit_price * item.quantity))
    )
  );

  return el(
    "article",
    { class: quiet ? "order done" : "order" },
    el(
      "div",
      { class: "order-head" },
      el("strong", {}, `Order ${order.id}`),
      el("span", { class: "when" }, when(order)),
      label(order),
      el("div", { class: "buttons" }, buttonsFor(order))
    ),
    el("p", { class: "who" }, `${order.customer_name} · ${order.phone}`),
    order.address ? el("p", { class: "address" }, order.address) : null,
    el("ul", { class: "lines" }, items),
    el("p", { class: "order-total" }, el("span", {}, "Total"), el("strong", {}, formatMoney(order.total)))
  );
}

function showCounts(counts) {
  for (const tab of tabs.querySelectorAll("[data-view]")) {
    const name = tab.dataset.view;

    tab.querySelector("[data-count]").textContent = counts[name];
    tab.classList.toggle("on", name === view);
    tab.setAttribute("aria-selected", name === view);
  }
}

async function showOrders(message = "") {
  const { counts, orders } = await api(`/api/orders?view=${view}`);

  showCounts(counts);
  setNote(note, message);

  list.replaceChildren(
    ...(orders.length ? orders.map(orderCard) : [el("p", { class: "empty" }, empty[view])])
  );
}

async function run(action, done) {
  try {
    await action();
    await showOrders(done);
  } catch (error) {
    setNote(note, error.message, true);
  }
}

function setStatus(order, status) {
  return run(
    () =>
      api(`/api/orders/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      }),
    status === "done"
      ? `Order ${order.id} moved to Done.`
      : `Order ${order.id} moved back to Pending.`
  );
}

function deleteOrder(order) {
  if (!confirm(`Delete order ${order.id}? Its items go back into stock and you can restore it from the Deleted tab.`)) {
    return;
  }

  return run(
    () => api(`/api/orders/${order.id}`, { method: "DELETE" }),
    `Order ${order.id} moved to Deleted.`
  );
}

function restoreOrder(order) {
  return run(
    () => api(`/api/orders/${order.id}/restore`, { method: "PUT" }),
    `Order ${order.id} restored and taken out of stock again.`
  );
}

function deleteForever(order) {
  if (!confirm(`Delete order ${order.id} for good? This cannot be undone.`)) return;

  return run(
    () => api(`/api/orders/${order.id}/forever`, { method: "DELETE" }),
    `Order ${order.id} deleted for good.`
  );
}

tabs.addEventListener("click", event => {
  const tab = event.target.closest("[data-view]");

  if (!tab || tab.dataset.view === view) return;

  view = tab.dataset.view;
  showOrders().catch(error => setNote(note, error.message, true));
});

loadShopSettings().then(() => setupAdminPage(() => showOrders()));
