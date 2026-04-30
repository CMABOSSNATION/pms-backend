// src/controllers/biometricController.js
// ─── ADVANCED BIOMETRICS & SECURITY ──────────────────────────────────────────

import prisma from "../config/prisma.js";
import crypto from "crypto";

// Helper — create a deterministic hash from biometric raw data
const hashBiometric = (raw) =>
  crypto.createHash("sha256").update(raw + process.env.JWT_SECRET).digest("hex");

// ─── BIOMETRIC SCAN ───────────────────────────────────────────────────────────
export const logBiometricScan = async (req, res, next) => {
  try {
    const { prisonerId, scanType, scanPurpose, location, deviceId, rawBiometric, matchScore } = req.body;
    if (!prisonerId || !scanType || !scanPurpose || !location)
      return res.status(400).json({ error: "prisonerId, scanType, scanPurpose and location are required" });

    const rawHash = rawBiometric ? hashBiometric(rawBiometric) : null;

    // Verify identity if rawBiometric is provided
    let matched = true;
    if (rawBiometric && scanPurpose !== "INTAKE") {
      const prisoner = await prisma.prisoner.findUnique({ where: { id: prisonerId } });
      if (!prisoner) return res.status(404).json({ error: "Prisoner not found" });

      if (scanType === "FINGERPRINT") {
        matched = prisoner.fingerprint === rawBiometric || rawHash === prisoner.fingerprint;
      } else if (scanType === "IRIS") {
        matched = prisoner.irisCode === rawHash;
      }
    }

    const log = await prisma.biometricLog.create({
      data: {
        scanType, scanPurpose, location, deviceId,
        matchScore: parseFloat(matchScore) || null,
        matched,
        rawHash,
        prisoner: { connect: { id: prisonerId } },
      },
      include: { prisoner: { select: { name: true, prisonerId: true, riskLevel: true } } },
    });

    res.status(201).json({ ...log, identityVerified: matched });
  } catch (err) { next(err); }
};

export const getBiometricLogs = async (req, res, next) => {
  try {
    const { prisonerId, scanType, limit } = req.query;
    const logs = await prisma.biometricLog.findMany({
      where: {
        ...(prisonerId && { prisonerId }),
        ...(scanType && { scanType }),
      },
      include: { prisoner: { select: { name: true, prisonerId: true } } },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit) || 100,
    });
    res.json(logs);
  } catch (err) { next(err); }
};

// ─── DAILY ROLL CALL ──────────────────────────────────────────────────────────
export const performRollCall = async (req, res, next) => {
  try {
    const { cellBlock, scans } = req.body;
    // scans = [{ prisonerId, rawBiometric, deviceId }]
    if (!scans || !Array.isArray(scans))
      return res.status(400).json({ error: "scans array is required" });

    const results = [];
    for (const scan of scans) {
      try {
        const log = await prisma.biometricLog.create({
          data: {
            scanType: "FINGERPRINT",
            scanPurpose: "ROLL_CALL",
            location: `Cell Block ${cellBlock || "?"}`,
            deviceId: scan.deviceId,
            matched: true,
            prisoner: { connect: { id: scan.prisonerId } },
          },
        });
        results.push({ prisonerId: scan.prisonerId, status: "PRESENT", logId: log.id });
      } catch {
        results.push({ prisonerId: scan.prisonerId, status: "ERROR" });
      }
    }

    const present = results.filter(r => r.status === "PRESENT").length;
    res.json({ cellBlock, total: scans.length, present, results });
  } catch (err) { next(err); }
};

// ─── CHAIN OF CUSTODY ─────────────────────────────────────────────────────────
export const getCustodyLogs = async (req, res, next) => {
  try {
    const { prisonerId, eventType } = req.query;
    const logs = await prisma.custodyLog.findMany({
      where: {
        ...(prisonerId && { prisonerId }),
        ...(eventType && { eventType }),
      },
      include: {
        prisoner: { select: { name: true, prisonerId: true } },
        officer: { select: { name: true, badgeNumber: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(logs);
  } catch (err) { next(err); }
};

export const createCustodyLog = async (req, res, next) => {
  try {
    const {
      prisonerId, eventType, itemDescription, itemCategory,
      itemValue, quantity, condition, storageLocation,
      inmateSignature, notes,
    } = req.body;
    if (!prisonerId || !eventType || !itemDescription)
      return res.status(400).json({ error: "prisonerId, eventType and itemDescription are required" });

    const count = await prisma.custodyLog.count();
    const custodyId = `COC-${String(count + 1).padStart(5, "0")}`;

    // Officer signs digitally — hash of badgeNumber + timestamp
    const officerSignature = hashBiometric(`${req.user.badgeNumber}-${Date.now()}`);

    const log = await prisma.custodyLog.create({
      data: {
        custodyId, eventType, itemDescription, notes, condition,
        storageLocation,
        itemCategory: itemCategory || "PERSONAL",
        itemValue: itemValue ? parseFloat(itemValue) : null,
        quantity: parseInt(quantity) || 1,
        officerSignature,
        inmateSignature: inmateSignature || null,
        signedAt: new Date(),
        prisoner: { connect: { id: prisonerId } },
        officer: { connect: { id: req.user.id } },
      },
      include: {
        prisoner: { select: { name: true, prisonerId: true } },
        officer: { select: { name: true, badgeNumber: true } },
      },
    });
    res.status(201).json(log);
  } catch (err) { next(err); }
};

// ─── ENHANCED MOVEMENT TRACKING ───────────────────────────────────────────────
export const getMovements = async (req, res, next) => {
  try {
    const { prisonerId, category } = req.query;
    const movements = await prisma.movement.findMany({
      where: {
        ...(prisonerId && { prisonerId }),
        ...(category && { category }),
      },
      include: {
        prisoner: { select: { name: true, prisonerId: true } },
        authorizedBy: { select: { name: true, badgeNumber: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(movements);
  } catch (err) { next(err); }
};

export const logMovement = async (req, res, next) => {
  try {
    const { prisonerId, from, to, reason, category, escortBadge } = req.body;
    if (!prisonerId || !from || !to)
      return res.status(400).json({ error: "prisonerId, from and to are required" });

    const movement = await prisma.movement.create({
      data: {
        from, to, reason, escortBadge,
        category: category || "INTERNAL",
        prisoner: { connect: { id: prisonerId } },
        authorizedBy: { connect: { id: req.user.id } },
      },
      include: {
        prisoner: { select: { name: true, prisonerId: true } },
        authorizedBy: { select: { name: true, badgeNumber: true } },
      },
    });
    res.status(201).json(movement);
  } catch (err) { next(err); }
};

export const returnMovement = async (req, res, next) => {
  try {
    const movement = await prisma.movement.update({
      where: { id: req.params.id },
      data: { returnedAt: new Date() },
    });
    res.json(movement);
  } catch (err) { next(err); }
};
