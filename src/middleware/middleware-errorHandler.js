// src/middleware/errorHandler.js

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────────
// Catches any error passed via next(err) in route handlers

export const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.url} →`, err.message);

  // Prisma unique constraint violation
  if (err.code === "P2002") {
    const field = err.meta?.target?.join(", ") || "field";
    return res.status(409).json({ error: `A record with that ${field} already exists` });
  }

  // Prisma record not found
  if (err.code === "P2025") {
    return res.status(404).json({ error: "Record not found" });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ error: "Invalid token" });
  }
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ error: "Token expired — please log in again" });
  }

  // Default
  const status  = err.status || err.statusCode || 500;
  const message = err.message || "Internal server error";
  res.status(status).json({ error: message });
};

// ─── NOT FOUND HANDLER ────────────────────────────────────────────────────────
export const notFound = (req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
};
