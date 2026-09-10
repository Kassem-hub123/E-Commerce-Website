import { Router } from "express";
import { store } from "../config/env.js";

const router = Router();

router.get("/", (req, res) => {
  res.json(store);
});

export default router;
