// src/routes/reports.js
import { Router } from "express";
import {
  getDashboard, getBlockReport,
  getRiskReport, getIncidentReport,
} from "../controllers/reportsController.js";

const router = Router();

router.get("/dashboard", getDashboard);
router.get("/blocks",    getBlockReport);
router.get("/risk",      getRiskReport);
router.get("/incidents", getIncidentReport);

export default router;
