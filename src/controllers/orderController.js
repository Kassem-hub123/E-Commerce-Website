import * as orders from "../models/orderModel.js";

const MAX_ITEMS = 50;

function positiveId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function readOrderForm(body) {
  const customerName = String(body?.customer_name || "").trim();
  const phone = String(body?.phone || "").trim();
  const address = String(body?.address || "").trim();
  const cart = Array.isArray(body?.items) ? body.items : [];

  if (!customerName || !phone) {
    return { error: "Your name and phone number are required." };
  }

  if (!cart.length) {
    return { error: "Your cart is empty." };
  }

  if (cart.length > MAX_ITEMS) {
    return { error: "That is too many different products for one order." };
  }

  const items = [];

  for (const entry of cart) {
    const id = positiveId(entry?.id);
    const qty = Number(entry?.qty);

    if (!id || !Number.isInteger(qty) || qty < 1) {
      return { error: "Something in your cart is not valid." };
    }

    if (items.some(item => item.id === id)) {
      return { error: "The same product is in the cart twice." };
    }

    items.push({ id, qty });
  }

  return { data: { customerName, phone, address, items } };
}

export async function index(req, res) {
  const view = String(req.query.view || "pending");

  if (!orders.viewNames.includes(view)) {
    return res.status(400).json({ message: "Unknown order list." });
  }

  res.json({
    view,
    counts: await orders.countOrders(),
    orders: await orders.listOrders(view)
  });
}

export async function create(req, res) {
  const { data, error } = readOrderForm(req.body);

  if (error) {
    return res.status(400).json({ message: error });
  }

  const result = await orders.createOrder(data);

  if (result.error) {
    return res.status(409).json({ message: result.error });
  }

  res.status(201).json({ id: result.id, total: result.total });
}

export async function update(req, res) {
  const status = String(req.body?.status || "");

  if (status !== "new" && status !== "done") {
    return res.status(400).json({ message: "An order is either new or done." });
  }

  const order = await orders.setOrderStatus(positiveId(req.params.id), status);

  if (!order) {
    return res.status(404).json({ message: "Order not found." });
  }

  res.json(await orders.findOrder(order.id));
}

export async function destroy(req, res) {
  const result = await orders.trashOrder(positiveId(req.params.id));

  if (!result) {
    return res.status(404).json({ message: "Order not found." });
  }

  res.json({ id: result.id });
}

export async function restore(req, res) {
  const result = await orders.restoreOrder(positiveId(req.params.id));

  if (!result) {
    return res.status(404).json({ message: "Deleted order not found." });
  }

  if (result.error) {
    return res.status(409).json({ message: result.error });
  }

  res.json(await orders.findOrder(result.id));
}

export async function destroyForever(req, res) {
  const result = await orders.deleteOrderForever(positiveId(req.params.id));

  if (!result) {
    return res.status(404).json({ message: "Deleted order not found." });
  }

  res.json({ id: result.id });
}
