// src/middleware/audit.js
import prisma from "../config/prisma.js";

export const auditLog = (action, entity) => async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = async (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
      try {
        await prisma.auditLog.create({
          data: {
            action, entity,
            entityId:  body?.id || body?.data?.id || null,
            details:   JSON.stringify({ method: req.method, url: req.url, body: req.body }),
            ipAddress: req.ip || req.headers["x-forwarded-for"] || "unknown",
            userAgent: req.headers["user-agent"] || null,
            userId:    req.user.id,
          },
        });
      } catch (e) {
        console.error("[AuditLog] Failed to write:", e.message);
      }
    }
    return originalJson(body);
  };
  next();
};
