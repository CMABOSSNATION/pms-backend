// src/routes/scans.js
import { Router } from "express";
import { performScan, getScanLog } from "../controllers/scanController.js";
import { auditLog } from "../middleware/audit.js";

const router = Router();

router.get ("/",  getScanLog);
router.post("/",  auditLog("SCAN", "ScanLog"), performScan);

export default router;
