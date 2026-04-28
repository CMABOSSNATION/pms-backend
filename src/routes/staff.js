// src/routes/staff.js
import { Router } from "express";
import {
  getStaff, getStaffMember, createStaff,
  updateStaff, deleteStaff,
} from "../controllers/staffController.js";
import { authorize } from "../middleware/auth.js";
import { auditLog }  from "../middleware/audit.js";

const router = Router();

router.get  ("/",    getStaff);
router.get  ("/:id", getStaffMember);
router.post ("/",    authorize("WARDEN", "ADMIN"), auditLog("CREATE", "User"), createStaff);
router.put  ("/:id", authorize("WARDEN", "ADMIN"), auditLog("UPDATE", "User"), updateStaff);
router.delete("/:id",authorize("WARDEN", "ADMIN"), auditLog("DELETE", "User"), deleteStaff);

export default router;
