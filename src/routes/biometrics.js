import { Router } from "express";
import { authorize } from "../middleware/auth.js";
import { auditLog } from "../middleware/audit.js";
import {
  logBiometricScan, getBiometricLogs, performRollCall,
  getCustodyLogs, createCustodyLog,
  getMovements, logMovement, returnMovement,
} from "../controllers/biometricController.js";

const router = Router();

router.get("/scans",              getBiometricLogs);
router.post("/scans",             auditLog("SCAN","Biometric"), logBiometricScan);
router.post("/roll-call",         auditLog("SCAN","RollCall"), performRollCall);

router.get("/custody",            getCustodyLogs);
router.post("/custody",           auditLog("CREATE","CustodyLog"), createCustodyLog);

router.get("/movements",          getMovements);
router.post("/movements",         auditLog("CREATE","Movement"), logMovement);
router.put("/movements/:id/return", auditLog("UPDATE","Movement"), returnMovement);

export default router;
