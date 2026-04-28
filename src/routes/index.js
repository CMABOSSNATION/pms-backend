// src/routes/index.js
// Central router — mounts all sub-routers

import { Router }    from "express";
import authRoutes     from "./auth.js";
import prisonerRoutes from "./prisoners.js";
import incidentRoutes from "./incidents.js";
import scanRoutes     from "./scans.js";
import staffRoutes    from "./staff.js";
import reportRoutes   from "./reports.js";
import { protect }    from "../middleware/auth.js";

const router = Router();

// Public
router.use("/auth", authRoutes);

// Protected — all routes below require a valid JWT
router.use(protect);
router.use("/prisoners", prisonerRoutes);
router.use("/incidents", incidentRoutes);
router.use("/scans",     scanRoutes);
router.use("/staff",     staffRoutes);
router.use("/reports",   reportRoutes);

export default router;
