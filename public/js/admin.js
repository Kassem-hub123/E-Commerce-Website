// Admin products page: add, edit, delete and search products.

const form = document.querySelector("#product-form");
const formTitle = document.querySelector("#form-title");
const saveButton = document.querySelector("#save-button");
const cancelButton = document.querySelector("#cancel-edit");
const productNote = document.querySelector("#product-note");
const categorySelect = document.querySelector("#category-select");
const photoInput = document.querySelector("#photo-input");
const previews = document.querySelector("#previews");
const keepImagesRow = document.querySelector("#keep-images-row");
const productList = document.querySelector("#product-list");
const searchForm = document.querySelector("#admin-search");
const searchInput = document.querySelector("#admin-search-input");

let editingId = null;

async function fillCategories() {
  const categories = await api("/api/categories");

  if (!categories.length) {
    categorySelect.replaceChildren(el("option", { value: "" }, "Add a category first"));
    return;
  }

  categorySelect.replaceChildren(
    ...categories.map(category => el("option", { value: category.id }, category.name))
  );
}

function productRow(product) {
  const edit = el("button", { class: "plain", type: "button" }, "Edit");
  const remove = el("button", { class: "danger", type: "button" }, "Delete");

  edit.addEventListener("click", () => startEdit(product));
  remove.addEventListener("click", () => deleteProduct(product));

  return el(
    "div",
    { class: "item" },
    el("img", { src: mainPhoto(product), alt: "", loading: "lazy" }),
    el(
      "div",
      { class: "info" },
      el("strong", {}, product.name),
      el(
        "p",
        {},
        `${product.category_name} · ${formatMoney(product.price)} · ${product.stock} in stock · ` +
          `${product.images.length} photo${product.images.length === 1 ? "" : "s"}`
      )
    ),
    el("div", { class: "buttons" }, edit, remove)
  );
}

async function showProducts() {
  const params = new URLSearchParams();
  if (searchInput.value.trim()) params.set("search", searchInput.value.trim());

  const products = await api(`/api/products?${params}`);

  productList.replaceChildren(
    ...(products.length ? products.map(productRow) : [el("p", { class: "empty" }, "No products found.")])
  );
}

function resetForm() {
  editingId = null;
  form.reset();
  previews.replaceChildren();
  keepImagesRow.hidden = true;
  formTitle.textContent = "Add a product";
  saveButton.textContent = "Save product";
  cancelButton.hidden = true;
  setNote(productNote, "");
}

function startEdit(product) {
  editingId = product.id;
  form.elements.name.value = product.name;
  form.elements.description.value = product.description;
  form.elements.price.value = product.price;
  form.elements.stock.value = product.stock;
  form.elements.category_id.value = product.category_id;
  form.elements.images.value = "";
  form.elements.keep_images.checked = true;

  previews.replaceChildren(
    ...product.images.map(image => el("img", { src: image.url, alt: "" }))
  );

  keepImagesRow.hidden = product.images.length === 0;
  formTitle.textContent = `Edit "${product.name}"`;
  saveButton.textContent = "Save changes";
  cancelButton.hidden = false;
  setNote(productNote, "");
  form.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function deleteProduct(product) {
  if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;

  try {
    await api(`/api/products/${product.id}`, { method: "DELETE" });
    if (editingId === product.id) resetForm();
    setNote(productNote, `Deleted "${product.name}".`);
    await showProducts();
  } catch (error) {
    setNote(productNote, error.message, true);
  }
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  setNote(productNote, "Saving…");
  saveButton.disabled = true;

  const data = new FormData(form);

  // The checkbox is only sent when it is ticked, so send the flag explicitly.
  data.set("keep_images", editingId && form.elements.keep_images.checked ? "true" : "false");

  try {
    await api(editingId ? `/api/products/${editingId}` : "/api/products", {
      method: editingId ? "PUT" : "POST",
      body: data
    });

    const wasEditing = Boolean(editingId);
    resetForm();
    setNote(productNote, wasEditing ? "Changes saved." : "Product added.");
    await showProducts();
  } catch (error) {
    setNote(productNote, error.message, true);
  } finally {
    saveButton.disabled = false;
  }
});

photoInput.addEventListener("change", () => {
  const files = [...photoInput.files];
  previews.replaceChildren(
    ...files.map(file => el("img", { src: URL.createObjectURL(file), alt: file.name }))
  );
});

cancelButton.addEventListener("click", resetForm);

searchForm.addEventListener("submit", event => {
  event.preventDefault();
  showProducts();
});

document.querySelector("#clear-search").addEventListener("click", () => {
  searchInput.value = "";
  showProducts();
});

loadShopSettings().then(() =>
  setupAdminPage(async () => {
    await fillCategories();
    await showProducts();
  })
);
