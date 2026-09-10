import { findCategory } from "../models/categoryModel.js";
import * as products from "../models/productModel.js";
import { removeImages, saveImages } from "../services/imageStore.js";

function positiveId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Multipart form fields always arrive as strings, so everything is parsed here.
async function readProductForm(body) {
  const name = String(body?.name || "").trim();
  const description = String(body?.description || "").trim();
  const price = Number(body?.price);
  const stock = Number(body?.stock ?? 0);
  const categoryId = positiveId(body?.category_id);

  if (!name || !description) {
    return { error: "Name and description are required." };
  }

  if (!Number.isFinite(price) || price < 0) {
    return { error: "Enter a price of 0 or more." };
  }

  if (!Number.isInteger(stock) || stock < 0) {
    return { error: "Enter the stock as a whole number." };
  }

  if (!categoryId || !(await findCategory(categoryId))) {
    return { error: "Pick a category." };
  }

  return { data: { name, description, price, stock, categoryId } };
}

export async function index(req, res) {
  const search = String(req.query.search || "").trim();
  const categoryId = positiveId(req.query.category);
  const inStockOnly = req.query.in_stock === "true";

  res.json(await products.listProducts({ search, categoryId, inStockOnly }));
}

export async function show(req, res) {
  const product = await products.findProduct(positiveId(req.params.id));

  if (!product) {
    return res.status(404).json({ message: "Product not found." });
  }

  res.json(product);
}

export async function create(req, res) {
  const { data, error } = await readProductForm(req.body);

  if (error) {
    return res.status(400).json({ message: error });
  }

  const images = await saveImages(req.files);
  const id = await products.createProduct({ ...data, images });

  res.status(201).json(await products.findProduct(id));
}

export async function update(req, res) {
  const id = positiveId(req.params.id);
  const { data, error } = await readProductForm(req.body);

  if (error) {
    return res.status(400).json({ message: error });
  }

  // Unchecked means the new uploads replace the current gallery.
  const keepImages = req.body?.keep_images !== "false";
  const images = await saveImages(req.files);
  const result = await products.updateProduct(id, { ...data, images, keepImages });

  if (!result) {
    await removeImages(images);
    return res.status(404).json({ message: "Product not found." });
  }

  await removeImages(result.droppedImages);
  res.json(await products.findProduct(id));
}

export async function destroy(req, res) {
  const result = await products.deleteProduct(positiveId(req.params.id));

  if (!result) {
    return res.status(404).json({ message: "Product not found." });
  }

  await removeImages(result.droppedImages);
  res.json({ id: result.id });
}
