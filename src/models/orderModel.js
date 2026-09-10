import { query, withTransaction } from "../db/pool.js";

const orderSelect = `
  SELECT
    o.id,
    o.customer_name,
    o.phone,
    o.address,
    o.total,
    o.status,
    o.created_at,
    o.deleted_at,
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'product_id', i.product_id,
            'product_name', i.product_name,
            'unit_price', i.unit_price,
            'quantity', i.quantity
          ) ORDER BY i.id
        )
        FROM order_items i
        WHERE i.order_id = o.id
      ),
      '[]'::json
    ) AS items
  FROM orders o
`;

const views = {
  pending: "o.deleted_at IS NULL AND o.status = 'new'",
  done: "o.deleted_at IS NULL AND o.status = 'done'",
  deleted: "o.deleted_at IS NOT NULL"
};

export const viewNames = Object.keys(views);

export async function listOrders(view) {
  const { rows } = await query(
    `${orderSelect} WHERE ${views[view]} ORDER BY o.created_at DESC, o.id DESC`
  );

  return rows;
}

export async function countOrders() {
  const { rows } = await query(`
    SELECT
      COUNT(*) FILTER (WHERE ${views.pending})::int AS pending,
      COUNT(*) FILTER (WHERE ${views.done})::int    AS done,
      COUNT(*) FILTER (WHERE ${views.deleted})::int AS deleted
    FROM orders o
  `);

  return rows[0];
}

export async function findOrder(id) {
  const { rows } = await query(`${orderSelect} WHERE o.id = $1`, [id]);
  return rows[0] || null;
}

export function createOrder({ customerName, phone, address, items }) {
  return withTransaction(async client => {
    const lines = [];

    for (const item of items) {
      const { rows } = await client.query(
        "SELECT id, name, price, stock FROM products WHERE id = $1 FOR UPDATE",
        [item.id]
      );

      const product = rows[0];

      if (!product) {
        return { error: "Something in your cart is not sold any more." };
      }

      if (product.stock < item.qty) {
        return {
          error: product.stock === 0
            ? `"${product.name}" is out of stock.`
            : `Only ${product.stock} of "${product.name}" left.`
        };
      }

      lines.push({ product, qty: item.qty });
    }

    const total = lines.reduce((sum, line) => sum + line.product.price * line.qty, 0);

    const { rows } = await client.query(
      `INSERT INTO orders (customer_name, phone, address, total)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [customerName, phone, address, total]
    );

    const orderId = rows[0].id;

    for (const { product, qty } of lines) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, product.id, product.name, product.price, qty]
      );

      await client.query("UPDATE products SET stock = stock - $2 WHERE id = $1", [product.id, qty]);
    }

    return { id: orderId, total };
  });
}

export async function setOrderStatus(id, status) {
  const { rows } = await query(
    "UPDATE orders SET status = $2 WHERE id = $1 AND deleted_at IS NULL RETURNING id",
    [id, status]
  );

  return rows[0] || null;
}

export function trashOrder(id) {
  return withTransaction(async client => {
    const { rows } = await client.query(
      "SELECT id FROM orders WHERE id = $1 AND deleted_at IS NULL FOR UPDATE",
      [id]
    );

    if (!rows[0]) return null;

    await client.query(
      `UPDATE products p
       SET stock = p.stock + i.quantity
       FROM order_items i
       WHERE i.order_id = $1 AND i.product_id = p.id`,
      [id]
    );

    await client.query("UPDATE orders SET deleted_at = now() WHERE id = $1", [id]);
    return { id };
  });
}

export function restoreOrder(id) {
  return withTransaction(async client => {
    const { rows } = await client.query(
      "SELECT id FROM orders WHERE id = $1 AND deleted_at IS NOT NULL FOR UPDATE",
      [id]
    );

    if (!rows[0]) return null;

    const { rows: lines } = await client.query(
      `SELECT i.product_id, i.quantity, p.name, p.stock
       FROM order_items i
       JOIN products p ON p.id = i.product_id
       WHERE i.order_id = $1
       ORDER BY i.product_id
       FOR UPDATE OF p`,
      [id]
    );

    for (const line of lines) {
      if (line.stock < line.quantity) {
        return {
          error: line.stock === 0
            ? `Cannot restore: "${line.name}" is out of stock.`
            : `Cannot restore: only ${line.stock} of "${line.name}" left, the order needs ${line.quantity}.`
        };
      }
    }

    for (const line of lines) {
      await client.query("UPDATE products SET stock = stock - $2 WHERE id = $1", [
        line.product_id,
        line.quantity
      ]);
    }

    await client.query("UPDATE orders SET deleted_at = NULL WHERE id = $1", [id]);
    return { id };
  });
}

export async function deleteOrderForever(id) {
  const { rows } = await query(
    "DELETE FROM orders WHERE id = $1 AND deleted_at IS NOT NULL RETURNING id",
    [id]
  );

  return rows[0] || null;
}
