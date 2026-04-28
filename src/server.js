// src/server.js
// ─── MAIN EXPRESS SERVER ──────────────────────────────────────────────────────

import "dotenv/config";
import express  from "express";
import cors     from "cors";
import morgan   from "morgan";
import router   from "./routes/index.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status:    "ok",
    service:   "PrisonCore API",
    version:   "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// ─── API ROUTES ───────────────────────────────────────────────────────────────
app.use("/api", router);

// ─── ERROR HANDLING ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── START ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   🏛️  PrisonCore API  v1.0.0        ║
  ║   http://localhost:${PORT}            ║
  ║   Mode: ${process.env.NODE_ENV || "development"}                  ║
  ╚══════════════════════════════════════╝
  `);
});

export default app;
