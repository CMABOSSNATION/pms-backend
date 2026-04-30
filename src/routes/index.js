// src/routes/index.js
import { Router }       from "express";
import authRoutes        from "./auth.js";
import prisonerRoutes    from "./prisoners.js";
import incidentRoutes    from "./incidents.js";
import scanRoutes        from "./scans.js";
import staffRoutes       from "./staff.js";
import reportRoutes      from "./reports.js";
import legalRoutes       from "./legal.js";
import biometricRoutes   from "./biometrics.js";
import medicalRoutes     from "./medical.js";
import inventoryRoutes   from "./inventory.js";
import { protect }       from "../middleware/auth.js";

const router = Router();

// Public
router.use("/auth", authRoutes);

// Protected
router.use(protect);
router.use("/prisoners",  prisonerRoutes);
router.use("/incidents",  incidentRoutes);
router.use("/scans",      scanRoutes);
router.use("/staff",      staffRoutes);
router.use("/reports",    reportRoutes);
router.use("/legal",      legalRoutes);
router.use("/biometrics", biometricRoutes);
router.use("/medical",    medicalRoutes);
router.use("/inventory",  inventoryRoutes);

export default router;
