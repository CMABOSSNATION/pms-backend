// src/routes/incidents.js
import { Router } from "express";
import {
  getIncidents, getIncident, createIncident,
  resolveIncident, deleteIncident,
} from "../controllers/incidentController.js";
import { authorize } from "../middleware/auth.js";
import { auditLog }  from "../middleware/audit.js";

const router = Router();

router.get  ("/",            getIncidents);
router.get  ("/:id",         getIncident);
router.post ("/",            auditLog("CREATE","Incident"), createIncident);
router.put  ("/:id/resolve", auditLog("UPDATE","Incident"), resolveIncident);
router.delete("/:id",        authorize("WARDEN","ADMIN"),   deleteIncident);

export default router;
