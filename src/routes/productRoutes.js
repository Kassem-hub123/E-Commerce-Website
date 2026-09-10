import { Router } from "express";
import * as products from "../controllers/productController.js";
import { requireAdmin } from "../middleware/auth.js";
import { uploadProductImages } from "../middleware/upload.js";

const router = Router();

router.get("/", products.index);
router.get("/:id", products.show);
router.post("/", requireAdmin, uploadProductImages, products.create);
router.put("/:id", requireAdmin, uploadProductImages, products.update);
router.delete("/:id", requireAdmin, products.destroy);

export default router;
