import { Router } from "express";
import { auditLog } from "../middleware/audit.js";
import { pushOfflineBatch, getOfflineBootstrap, getSyncStatus } from "../controllers/offlineController.js";
const router = Router();
router.get("/bootstrap",    auditLog("VIEW","OfflineBootstrap"), getOfflineBootstrap);
router.post("/sync",        auditLog("SYNC","OfflineBatch"),     pushOfflineBatch);
router.get("/status",       getSyncStatus);
export default router;
