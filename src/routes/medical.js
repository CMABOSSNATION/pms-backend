import { Router } from "express";
import { authorize } from "../middleware/auth.js";
import { auditLog } from "../middleware/audit.js";
import {
  getMedicalRecords, createMedicalRecord,
  getVaccinations, createVaccination,
  getMedications, dispenseMedication,
  getRehabLogs, createRehabLog,
  getPrisonerHealthSummary,
} from "../controllers/medicalController.js";

const router = Router();

router.get("/records",              getMedicalRecords);
router.post("/records",             authorize("MEDICAL","ADMIN"), auditLog("CREATE","MedicalRecord"), createMedicalRecord);

router.get("/vaccinations",         getVaccinations);
router.post("/vaccinations",        authorize("MEDICAL","ADMIN"), auditLog("CREATE","Vaccination"), createVaccination);

router.get("/medications",          getMedications);
router.post("/medications/dispense", authorize("MEDICAL","ADMIN"), auditLog("CREATE","Medication"), dispenseMedication);

router.get("/rehab",                getRehabLogs);
router.post("/rehab",               auditLog("CREATE","Rehabilitation"), createRehabLog);

router.get("/summary/:id",          getPrisonerHealthSummary);

export default router;
