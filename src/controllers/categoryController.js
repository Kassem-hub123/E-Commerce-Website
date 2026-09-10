import * as categories from "../models/categoryModel.js";

const DUPLICATE_NAME = "23505";
const STILL_IN_USE = ["23001", "23503"];

function readName(body) {
  return String(body?.name || "").trim();
}

export async function index(req, res) {
  res.json(await categories.listCategories());
}

export async function create(req, res) {
  const name = readName(req.body);

  if (!name) {
    return res.status(400).json({ message: "Category name is required." });
  }

  try {
    res.status(201).json(await categories.createCategory(name));
  } catch (error) {
    if (error.code !== DUPLICATE_NAME) throw error;
    res.status(409).json({ message: `"${name}" already exists.` });
  }
}

export async function update(req, res) {
  const name = readName(req.body);

  if (!name) {
    return res.status(400).json({ message: "Category name is required." });
  }

  try {
    const category = await categories.renameCategory(Number(req.params.id), name);

    if (!category) {
      return res.status(404).json({ message: "Category not found." });
    }

    res.json(category);
  } catch (error) {
    if (error.code !== DUPLICATE_NAME) throw error;
    res.status(409).json({ message: `"${name}" already exists.` });
  }
}

export async function destroy(req, res) {
  try {
    const category = await categories.deleteCategory(Number(req.params.id));

    if (!category) {
      return res.status(404).json({ message: "Category not found." });
    }

    res.json({ id: category.id });
  } catch (error) {
    if (!STILL_IN_USE.includes(error.code)) throw error;
    res.status(409).json({ message: "Move or delete this category's products first." });
  }
}
