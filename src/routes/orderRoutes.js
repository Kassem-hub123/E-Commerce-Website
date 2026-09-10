import { Router } from "express";
import * as orders from "../controllers/orderController.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

router.post("/", orders.create);
router.get("/", requireAdmin, orders.index);
router.put("/:id", requireAdmin, orders.update);
router.put("/:id/restore", requireAdmin, orders.restore);
router.delete("/:id", requireAdmin, orders.destroy);
router.delete("/:id/forever", requireAdmin, orders.destroyForever);

export default router;
