// Product list page. The search text and the chosen category live in the URL so
// the page can be shared and the back button works.

const list = document.querySelector("#products");
const resultLine = document.querySelector("#result-line");
const filters = document.querySelector("#filters");
const searchForm = document.querySelector("#search-form");
const searchInput = document.querySelector("#search-input");

function currentQuery() {
  const params = new URLSearchParams(location.search);

  return {
    search: params.get("search") || "",
    category: params.get("category") || ""
  };
}

function linkTo({ search, category }) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (category) params.set("category", category);

  const query = params.toString();
  return query ? `/?${query}` : "/";
}

function productCard(product) {
  return el(
    "a",
    { class: "card", href: `/product.html?id=${product.id}` },
    el("div", { class: "photo" }, el("img", { src: mainPhoto(product), alt: product.name, loading: "lazy" })),
    el("span", { class: "tag" }, product.category_name),
    el("h3", {}, product.name),
    el("p", { class: "price" }, formatMoney(product.price)),
    stockLabel(product.stock)
  );
}

function showFilters(categories, selected) {
  const { search } = currentQuery();
  const all = [{ id: "", name: "All products" }, ...categories];

  filters.replaceChildren(
    ...all.map(category =>
      el(
        "a",
        {
          href: linkTo({ search, category: category.id }),
          class: String(category.id) === selected ? "on" : null
        },
        category.name
      )
    )
  );
}

function showProducts(products, { search }) {
  if (!products.length) {
    resultLine.textContent = "";
    list.replaceChildren(
      el("p", { class: "empty" }, search ? `Nothing matches "${search}".` : "No products yet.")
    );
    return;
  }

  resultLine.textContent = `${products.length} ${products.length === 1 ? "product" : "products"}`;
  list.replaceChildren(...products.map(productCard));
}

async function load() {
  const query = currentQuery();
  searchInput.value = query.search;

  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.category) params.set("category", query.category);

  try {
    const [categories, products] = await Promise.all([
      api("/api/categories"),
      api(`/api/products?${params}`)
    ]);

    showFilters(categories, query.category);
    showProducts(products, query);
  } catch (error) {
    resultLine.textContent = "";
    list.replaceChildren(el("p", { class: "empty" }, `Could not load the products. ${error.message}`));
  }
}

searchForm.addEventListener("submit", event => {
  event.preventDefault();
  const { category } = currentQuery();
  history.pushState({}, "", linkTo({ search: searchInput.value.trim(), category }));
  load();
});

window.addEventListener("popstate", load);

loadShopSettings().then(load);
