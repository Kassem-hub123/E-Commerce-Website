import { query, withTransaction } from "../db/pool.js";

// One query for the products and their images, so the list does not run an
// extra query per product.
const productSelect = `
  SELECT
    p.id,
    p.name,
    p.description,
    p.price,
    p.stock,
    p.category_id,
    c.name AS category_name,
    COALESCE(
      (
        SELECT json_agg(json_build_object('url', i.url, 'file_id', i.file_id) ORDER BY i.position, i.id)
        FROM product_images i
        WHERE i.product_id = p.id
      ),
      '[]'::json
    ) AS images
  FROM products p
  JOIN categories c ON c.id = p.category_id
`;

export async function listProducts({ search = "", categoryId = null, inStockOnly = false } = {}) {
  const filters = [];
  const values = [];

  if (search) {
    values.push(`%${search}%`);
    filters.push(`(p.name ILIKE $${values.length} OR p.description ILIKE $${values.length} OR c.name ILIKE $${values.length})`);
  }

  if (categoryId) {
    values.push(categoryId);
    filters.push(`p.category_id = $${values.length}`);
  }

  if (inStockOnly) {
    filters.push("p.stock > 0");
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const { rows } = await query(`${productSelect} ${where} ORDER BY p.created_at DESC, p.id DESC`, values);

  return rows;
}

export async function findProduct(id) {
  const { rows } = await query(`${productSelect} WHERE p.id = $1`, [id]);
  return rows[0] || null;
}

async function replaceImages(client, productId, images) {
  await client.query("DELETE FROM product_images WHERE product_id = $1", [productId]);

  for (const [position, image] of images.entries()) {
    await client.query(
      "INSERT INTO product_images (product_id, url, file_id, position) VALUES ($1, $2, $3, $4)",
      [productId, image.url, image.fileId ?? null, position]
    );
  }
}

export function createProduct({ name, description, price, stock, categoryId, images }) {
  return withTransaction(async client => {
    const { rows } = await client.query(
      `INSERT INTO products (name, description, price, stock, category_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [name, description, price, stock, categoryId]
    );

    await replaceImages(client, rows[0].id, images);
    return rows[0].id;
  });
}

// Returns the images that are no longer used, so the caller can delete the files.
export function updateProduct(id, { name, description, price, stock, categoryId, images, keepImages }) {
  return withTransaction(async client => {
    const { rows } = await client.query(
      `UPDATE products
       SET name = $2, description = $3, price = $4, stock = $5, category_id = $6, updated_at = now()
       WHERE id = $1
       RETURNING id`,
      [id, name, description, price, stock, categoryId]
    );

    if (!rows[0]) return null;

    const current = await client.query(
      "SELECT url, file_id AS \"fileId\" FROM product_images WHERE product_id = $1 ORDER BY position, id",
      [id]
    );

    const kept = keepImages ? current.rows : [];
    await replaceImages(client, id, [...kept, ...images]);

    return { id, droppedImages: keepImages ? [] : current.rows };
  });
}

export function deleteProduct(id) {
  return withTransaction(async client => {
    const images = await client.query(
      "SELECT url, file_id AS \"fileId\" FROM product_images WHERE product_id = $1",
      [id]
    );
    const { rows } = await client.query("DELETE FROM products WHERE id = $1 RETURNING id", [id]);

    return rows[0] ? { id, droppedImages: images.rows } : null;
  });
}
