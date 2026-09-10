const form = document.querySelector("#category-form");
const note = document.querySelector("#category-note");
const list = document.querySelector("#category-list");

function categoryRow(category) {
  const rename = el("button", { class: "plain", type: "button" }, "Rename");
  const remove = el("button", { class: "danger", type: "button" }, "Delete");

  rename.addEventListener("click", () => renameCategory(category));
  remove.addEventListener("click", () => deleteCategory(category));

  return el(
    "div",
    { class: "item" },
    el(
      "div",
      { class: "info" },
      el("strong", {}, category.name),
      el("p", {}, `${category.product_count} ${category.product_count === 1 ? "product" : "products"}`)
    ),
    el("div", { class: "buttons" }, rename, remove)
  );
}

async function showCategories() {
  const categories = await api("/api/categories");

  list.replaceChildren(
    ...(categories.length
      ? categories.map(categoryRow)
      : [el("p", { class: "empty" }, "No categories yet.")])
  );
}

async function renameCategory(category) {
  const name = prompt("New name for this category:", category.name);
  if (!name || name.trim() === category.name) return;

  try {
    await api(`/api/categories/${category.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() })
    });

    setNote(note, "Category renamed.");
    await showCategories();
  } catch (error) {
    setNote(note, error.message, true);
  }
}

async function deleteCategory(category) {
  if (!confirm(`Delete the category "${category.name}"?`)) return;

  try {
    await api(`/api/categories/${category.id}`, { method: "DELETE" });
    setNote(note, `Deleted "${category.name}".`);
    await showCategories();
  } catch (error) {
    setNote(note, error.message, true);
  }
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  setNote(note, "Saving…");

  const name = new FormData(form).get("name");

  try {
    await api("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });

    form.reset();
    setNote(note, "Category added.");
    await showCategories();
  } catch (error) {
    setNote(note, error.message, true);
  }
});

loadShopSettings().then(() => setupAdminPage(showCategories));
