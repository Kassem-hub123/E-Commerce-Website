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
const keepImagesBox = form.elements.keep_images;

const MAX_PHOTOS = 3;

let editingId = null;
let currentPhotos = [];

let chosenFiles = [];
let previewUrls = [];

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

function freeSlots() {
  return MAX_PHOTOS - (editingId && keepImagesBox.checked ? currentPhotos.length : 0);
}

function showPreviews() {
  for (const url of previewUrls) URL.revokeObjectURL(url);
  previewUrls = [];

  const kept = editingId && keepImagesBox.checked ? currentPhotos.map(image => image.url) : [];

  previews.replaceChildren(
    ...kept.map(url => el("img", { src: url, alt: "" })),
    ...chosenFiles.map(file => {
      const url = URL.createObjectURL(file);
      previewUrls.push(url);

      const drop = el("button", { class: "drop", type: "button", "aria-label": `Remove ${file.name}` }, "×");
      drop.addEventListener("click", () => removePhoto(file));

      return el("span", { class: "shot" }, el("img", { src: url, alt: file.name }), drop);
    })
  );
}

function tooManyMessage(slots) {
  if (slots === 0) {
    return `This product already has ${MAX_PHOTOS} photos. Untick the box below to replace them.`;
  }

  if (slots === MAX_PHOTOS) {
    return `Pick ${MAX_PHOTOS} photos at most.`;
  }

  return `Only ${slots} more photo${slots === 1 ? "" : "s"} fit, ${MAX_PHOTOS} in total.`;
}

function syncPhotoInput() {
  const bag = new DataTransfer();

  for (const file of chosenFiles) bag.items.add(file);

  photoInput.files = bag.files;
}

function samePhoto(a, b) {
  return a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;
}

function addPhotos(files) {
  const slots = freeSlots();
  let full = false;

  for (const file of files) {
    if (chosenFiles.some(chosen => samePhoto(chosen, file))) continue;

    if (chosenFiles.length >= slots) {
      full = true;
      continue;
    }

    chosenFiles.push(file);
  }

  setNote(productNote, full ? tooManyMessage(slots) : "", full);
  syncPhotoInput();
  showPreviews();
}

function removePhoto(file) {
  chosenFiles = chosenFiles.filter(chosen => chosen !== file);

  if (productNote.classList.contains("bad")) setNote(productNote, "");

  syncPhotoInput();
  showPreviews();
}

function trimPhotos() {
  const slots = freeSlots();

  if (chosenFiles.length > slots) {
    chosenFiles = chosenFiles.slice(0, slots);
    setNote(productNote, tooManyMessage(slots), true);
  }

  syncPhotoInput();
  showPreviews();
}

function resetForm() {
  editingId = null;
  currentPhotos = [];
  chosenFiles = [];
  form.reset();
  showPreviews();
  keepImagesRow.hidden = true;
  formTitle.textContent = "Add a product";
  saveButton.textContent = "Save product";
  cancelButton.hidden = true;
  setNote(productNote, "");
}

function startEdit(product) {
  editingId = product.id;
  currentPhotos = product.images;
  form.elements.name.value = product.name;
  form.elements.description.value = product.description;
  form.elements.price.value = product.price;
  form.elements.stock.value = product.stock;
  form.elements.category_id.value = product.category_id;
  chosenFiles = [];
  photoInput.value = "";
  keepImagesBox.checked = true;

  showPreviews();

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

  data.set("keep_images", editingId && keepImagesBox.checked ? "true" : "false");

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

photoInput.addEventListener("change", () => addPhotos([...photoInput.files]));
keepImagesBox.addEventListener("change", trimPhotos);

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
