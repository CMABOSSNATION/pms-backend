import { Router } from "express";
import { authorize } from "../middleware/auth.js";
import { auditLog } from "../middleware/audit.js";
import {
  getWarrants, createWarrant, updateWarrant,
  getSentences, createSentence, updateSentenceCredits,
  getHearings, createHearing, recordHearingOutcome,
  syncJudiciaryData, exportToNationalDB,
} from "../controllers/legalController.js";

const router = Router();

router.get("/warrants",                getWarrants);
router.post("/warrants",               authorize("WARDEN","ADMIN","LEGAL"), auditLog("CREATE","Warrant"), createWarrant);
router.put("/warrants/:id",            authorize("WARDEN","ADMIN","LEGAL"), auditLog("UPDATE","Warrant"), updateWarrant);

router.get("/sentences",               getSentences);
router.post("/sentences",              authorize("WARDEN","ADMIN","LEGAL"), auditLog("CREATE","Sentence"), createSentence);
router.put("/sentences/:id/credits",   authorize("WARDEN","ADMIN","LEGAL"), auditLog("UPDATE","Sentence"), updateSentenceCredits);

router.get("/hearings",                getHearings);
router.post("/hearings",               authorize("WARDEN","ADMIN","LEGAL"), auditLog("CREATE","Hearing"), createHearing);
router.put("/hearings/:id/outcome",    authorize("WARDEN","ADMIN","LEGAL"), auditLog("UPDATE","Hearing"), recordHearingOutcome);

router.post("/judiciary/sync",         authorize("WARDEN","ADMIN"), auditLog("SYNC","JudiciaryData"), syncJudiciaryData);
router.post("/export/national-db",     authorize("WARDEN","ADMIN"), auditLog("EXPORT","NationalDB"), exportToNationalDB);

export default router;
