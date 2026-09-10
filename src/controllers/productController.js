import { findCategory } from "../models/categoryModel.js";
import { MAX_PRODUCT_IMAGES } from "../middleware/upload.js";
import * as products from "../models/productModel.js";
import { removeImages, saveImages } from "../services/imageStore.js";

const tooManyPhotos = `A product can have up to ${MAX_PRODUCT_IMAGES} photos.`;

function positiveId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

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

  if ((req.files?.length || 0) > MAX_PRODUCT_IMAGES) {
    return res.status(400).json({ message: tooManyPhotos });
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

  const current = await products.findProduct(id);

  if (!current) {
    return res.status(404).json({ message: "Product not found." });
  }

  const keepImages = req.body?.keep_images !== "false";
  const kept = keepImages ? current.images.length : 0;

  if (kept + (req.files?.length || 0) > MAX_PRODUCT_IMAGES) {
    return res.status(400).json({ message: tooManyPhotos });
  }

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
