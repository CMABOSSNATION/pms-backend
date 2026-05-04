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

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  "http://localhost:3000",
  "capacitor://localhost",
  "http://localhost",
];

// Allow the production frontend URL set via CLIENT_URL env var
if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Render health checks)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status:    "ok",
    service:   "PrisonCore API",
    version:   "1.0.0",
    env:       process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// ─── API ROUTES ───────────────────────────────────────────────────────────────
app.use("/api", router);

// ─── ERROR HANDLING ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── START ────────────────────────────────────────────────────────────────────
// IMPORTANT: Bind to 0.0.0.0 — Render requires this to detect the open port.
// "127.0.0.1" (localhost) is invisible to Render's network layer.

const DB_LABEL = process.env.DATABASE_URL?.startsWith("postgresql")
  ? "PostgreSQL (Render)"
  : process.env.DATABASE_URL?.startsWith("file")
  ? "SQLite (local)"
  : "Unknown";

app.listen(PORT, "0.0.0.0", () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   🏛️  PrisonCore API  v1.0.0        ║
  ║   Port: ${PORT}                        ║
  ║   Mode: ${(process.env.NODE_ENV || "development").padEnd(24)}║
  ║   DB:   ${DB_LABEL.padEnd(24)}║
  ╚══════════════════════════════════════╝
  `);
});

export default app;
