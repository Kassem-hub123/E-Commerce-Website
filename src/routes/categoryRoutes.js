import { Router } from "express";
import * as categories from "../controllers/categoryController.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/", categories.index);
router.post("/", requireAdmin, categories.create);
router.put("/:id", requireAdmin, categories.update);
router.delete("/:id", requireAdmin, categories.destroy);

export default router;
