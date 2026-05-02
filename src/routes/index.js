// src/routes/index.js
import { Router }        from "express";
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
import nationalRoutes    from "./national.js";
import industryRoutes    from "./industry.js";
import privacyRoutes     from "./privacy.js";
import offlineRoutes     from "./offline.js";
import { protect }       from "../middleware/auth.js";

const router = Router();

router.use("/auth",       authRoutes);          // Public

router.use(protect);                             // Everything below requires login
router.use("/prisoners",  prisonerRoutes);
router.use("/incidents",  incidentRoutes);
router.use("/scans",      scanRoutes);
router.use("/staff",      staffRoutes);
router.use("/reports",    reportRoutes);
router.use("/legal",      legalRoutes);
router.use("/biometrics", biometricRoutes);
router.use("/medical",    medicalRoutes);
router.use("/inventory",  inventoryRoutes);
router.use("/national",   nationalRoutes);
router.use("/industry",   industryRoutes);
router.use("/privacy",    privacyRoutes);
router.use("/offline",    offlineRoutes);

export default router;
