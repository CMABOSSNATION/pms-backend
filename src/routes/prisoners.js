// src/routes/prisoners.js
import { Router } from "express";
import {
  getPrisoners, getPrisoner, createPrisoner,
  updatePrisoner, deletePrisoner, logMovement,
} from "../controllers/prisonerController.js";
import { authorize }  from "../middleware/auth.js";
import { auditLog }   from "../middleware/audit.js";

const router = Router();

router.get  ("/",               getPrisoners);
router.get  ("/:id",            getPrisoner);
router.post ("/",               authorize("WARDEN","ADMIN"), auditLog("CREATE","Prisoner"), createPrisoner);
router.put  ("/:id",            authorize("WARDEN","ADMIN","GUARD"), auditLog("UPDATE","Prisoner"), updatePrisoner);
router.delete("/:id",           authorize("WARDEN","ADMIN"), auditLog("DELETE","Prisoner"), deletePrisoner);
router.post ("/:id/movements",  auditLog("CREATE","Movement"), logMovement);

export default router;
