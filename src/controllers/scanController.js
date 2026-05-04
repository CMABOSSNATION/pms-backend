// src/controllers/scanController.js

import prisma from "../config/prisma.js";

// ─── POST /api/scans ──────────────────────────────────────────────────────────
// Performs a prisoner scan by fingerprint, prisonerId, or name
export const performScan = async (req, res, next) => {
  try {
    const { query, location } = req.body;

    if (!query || !location)
      return res.status(400).json({ error: "query and location are required" });

    // Find prisoner by fingerprint, prisonerId, or name
    // NOTE: SQLite does not support mode: "insensitive" — using plain contains
    const prisoner = await prisma.prisoner.findFirst({
      where: {
        OR: [
          { fingerprint: { equals: query } },
          { prisonerId:  { equals: query } },
          { name:        { contains: query } },
        ],
      },
      include: { alerts: true },
    });

    if (!prisoner) {
      return res.status(404).json({
        found: false,
        message: "No match found — unregistered or unknown individual",
      });
    }

    // Write scan log
    const scan = await prisma.scanLog.create({
      data: {
        location,
        riskLevel:  prisoner.riskLevel,
        hasAlerts:  prisoner.alerts.length > 0,
        prisonerId: prisoner.id,
        userId:     req.user.id,
      },
    });

    // Log movement
    await prisma.movement.create({
      data: {
        from:       "Unknown",
        to:         location,
        reason:     "Security Scan",
        prisonerId: prisoner.id,
      },
    });

    res.json({
      found: true,
      scan,
      prisoner: {
        id:          prisoner.id,
        prisonerId:  prisoner.prisonerId,
        name:        prisoner.name,
        fingerprint: prisoner.fingerprint,
        cell:        prisoner.cell,
        riskLevel:   prisoner.riskLevel,
        status:      prisoner.status,
        alerts:      prisoner.alerts,
      },
    });
  } catch (err) { next(err); }
};

// ─── GET /api/scans ───────────────────────────────────────────────────────────
export const getScanLog = async (req, res, next) => {
  try {
    const { prisonerId, limit = 50 } = req.query;

    const scans = await prisma.scanLog.findMany({
      where:   prisonerId ? { prisonerId } : {},
      include: {
        prisoner:  { select: { prisonerId: true, name: true, riskLevel: true } },
        scannedBy: { select: { name: true, badgeNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      take:    parseInt(limit),
    });

    res.json(scans);
  } catch (err) { next(err); }
};
