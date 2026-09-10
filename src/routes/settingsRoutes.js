import { Router } from "express";
import { store } from "../config/env.js";

const router = Router();

// The storefront reads the shop name and WhatsApp number from here so they are
// not hard coded in the HTML.
router.get("/", (req, res) => {
  res.json(store);
});

export default router;
