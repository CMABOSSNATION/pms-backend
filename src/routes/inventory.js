import { Router } from "express";
import { authorize } from "../middleware/auth.js";
import { auditLog } from "../middleware/audit.js";
import {
  getItems, getItem, createItem, updateItem,
  stockTransaction, getLowStockAlerts, getAuditLogs,
} from "../controllers/inventoryController.js";

const router = Router();

router.get("/",                 getItems);
router.get("/alerts/low-stock", getLowStockAlerts);
router.get("/audit",            authorize("WARDEN","ADMIN"), getAuditLogs);
router.get("/:id",              getItem);
router.post("/",                authorize("WARDEN","ADMIN","INVENTORY"), auditLog("CREATE","InventoryItem"), createItem);
router.put("/:id",              authorize("WARDEN","ADMIN","INVENTORY"), auditLog("UPDATE","InventoryItem"), updateItem);
router.post("/transaction",     auditLog("UPDATE","InventoryStock"), stockTransaction);

export default router;
