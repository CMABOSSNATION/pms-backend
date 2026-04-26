// src/middleware/audit.js
// Automatically writes an audit log entry after mutating requests

import prisma from "../config/prisma.js";

export const auditLog = (action, entity) => async (req, res, next) => {
  // Save original json method
  const originalJson = res.json.bind(res);

  res.json = async (body) => {
    // Only log successful mutations (2xx)
    if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
      try {
        await prisma.auditLog.create({
          data: {
            action,
            entity,
            entityId:  body?.id || body?.data?.id || null,
            details:   JSON.stringify({ method: req.method, url: req.url }),
            ipAddress: req.ip,
            userId:    req.user.id,
          },
        });
      } catch (e) {
        // Don't let audit failure crash the response
        console.error("[AuditLog] Failed to write:", e.message);
      }
    }
    return originalJson(body);
  };

  next();
};
