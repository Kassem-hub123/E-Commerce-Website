import { query } from "../db/pool.js";

export async function listCategories() {
  const { rows } = await query(`
    SELECT c.id, c.name, COUNT(p.id)::int AS product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    GROUP BY c.id
    ORDER BY c.name
  `);

  return rows;
}

export async function findCategory(id) {
  const { rows } = await query("SELECT id, name FROM categories WHERE id = $1", [id]);
  return rows[0] || null;
}

export async function createCategory(name) {
  const { rows } = await query(
    "INSERT INTO categories (name) VALUES ($1) RETURNING id, name, 0 AS product_count",
    [name]
  );

  return rows[0];
}

export async function renameCategory(id, name) {
  const { rows } = await query(
    "UPDATE categories SET name = $2 WHERE id = $1 RETURNING id, name",
    [id, name]
  );

  return rows[0] || null;
}

export async function deleteCategory(id) {
  const { rows } = await query("DELETE FROM categories WHERE id = $1 RETURNING id", [id]);
  return rows[0] || null;
}
