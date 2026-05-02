// src/controllers/privacyController.js
// ─── UGANDA DATA PROTECTION & PRIVACY ACT 2019 ───────────────────────────────

import prisma from "../config/prisma.js";

const DPA_DEADLINE_DAYS = 21; // Uganda DPA 2019 — Art. 22: respond within 21 days

// ─── DATA SUBJECT REQUESTS ────────────────────────────────────────────────────
export const getRequests = async (req, res, next) => {
  try {
    const { status, type } = req.query;
    const requests = await prisma.dataRequest.findMany({
      where: {
        ...(status && { status }),
        ...(type && { requestType: type }),
      },
      orderBy: { createdAt: "desc" },
    });

    // Flag overdue
    const now = new Date();
    const enriched = requests.map(r => ({
      ...r,
      isOverdue: r.status === "PENDING" || r.status === "IN_REVIEW"
        ? new Date(r.dueDate) < now : false,
      daysRemaining: Math.ceil((new Date(r.dueDate) - now) / 86400000),
    }));

    res.json(enriched);
  } catch (err) { next(err); }
};

export const createRequest = async (req, res, next) => {
  try {
    const { requestType, subjectName, subjectId, requestedBy, relationship, notes } = req.body;
    if (!requestType || !subjectName || !requestedBy)
      return res.status(400).json({ error: "requestType, subjectName and requestedBy are required" });

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + DPA_DEADLINE_DAYS);

    const request = await prisma.dataRequest.create({
      data: { requestType, subjectName, subjectId, requestedBy, relationship, notes, dueDate },
    });
    res.status(201).json(request);
  } catch (err) { next(err); }
};

export const resolveRequest = async (req, res, next) => {
  try {
    if (!["WARDEN", "ADMIN"].includes(req.user.role))
      return res.status(403).json({ error: "Only WARDEN/ADMIN can resolve data requests" });

    const { status, resolution } = req.body;
    if (!["FULFILLED", "REJECTED"].includes(status))
      return res.status(400).json({ error: "status must be FULFILLED or REJECTED" });

    const request = await prisma.dataRequest.update({
      where: { id: req.params.id },
      data: { status, resolution, resolvedAt: new Date(), handledBy: req.user.id },
    });

    await prisma.auditLog.create({
      data: {
        action: "UPDATE", entity: "DataRequest", entityId: req.params.id,
        details: JSON.stringify({ resolution, status, resolvedBy: req.user.name }),
        ipAddress: req.ip, userId: req.user.id,
      },
    });

    res.json(request);
  } catch (err) { next(err); }
};

// ─── CONSENT MANAGEMENT ───────────────────────────────────────────────────────
export const getConsents = async (req, res, next) => {
  try {
    const { prisonerId } = req.query;
    const consents = await prisma.consentRecord.findMany({
      where: { ...(prisonerId && { prisonerId }) },
      include: { prisoner: { select: { name: true, prisonerId: true } } },
      orderBy: { grantedAt: "desc" },
    });
    res.json(consents);
  } catch (err) { next(err); }
};

export const recordConsent = async (req, res, next) => {
  try {
    const { prisonerId, purpose, granted, notes } = req.body;
    if (!prisonerId || !purpose || granted === undefined)
      return res.status(400).json({ error: "prisonerId, purpose and granted are required" });

    // Revoke existing consent for same purpose
    await prisma.consentRecord.updateMany({
      where: { prisonerId, purpose, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    const consent = await prisma.consentRecord.create({
      data: {
        purpose, notes,
        granted: granted === true || granted === "true",
        prisoner: { connect: { id: prisonerId } },
      },
    });

    await prisma.auditLog.create({
      data: {
        action: granted ? "CREATE" : "DELETE",
        entity: "Consent", entityId: prisonerId,
        details: JSON.stringify({ purpose, granted, recordedBy: req.user.name }),
        ipAddress: req.ip, userId: req.user.id,
      },
    });

    res.status(201).json(consent);
  } catch (err) { next(err); }
};

// ─── PRIVACY DASHBOARD SUMMARY ────────────────────────────────────────────────
export const getPrivacyDashboard = async (req, res, next) => {
  try {
    const now = new Date();
    const [requests, consents, auditCount, recentExports] = await Promise.all([
      prisma.dataRequest.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.consentRecord.findMany({ where: { revokedAt: null } }),
      prisma.auditLog.count(),
      prisma.auditLog.findMany({
        where: { action: "EXPORT" },
        include: { user: { select: { name: true, role: true, badgeNumber: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    const pending  = requests.filter(r => r.status === "PENDING");
    const overdue  = pending.filter(r => new Date(r.dueDate) < now);
    const fulfilled= requests.filter(r => r.status === "FULFILLED");

    const consentByPurpose = consents.reduce((acc, c) => {
      acc[c.purpose] = (acc[c.purpose] || 0) + 1;
      return acc;
    }, {});

    res.json({
      dataRequests: {
        total: requests.length,
        pending: pending.length,
        overdue: overdue.length,
        fulfilled: fulfilled.length,
        complianceRate: requests.length
          ? Math.round((fulfilled.length / requests.length) * 100) : 100,
      },
      consents: { total: consents.length, byPurpose: consentByPurpose },
      auditLog:  { totalEntries: auditCount },
      recentExports,
      ugandaDPA: {
        act: "Uganda Data Protection and Privacy Act, 2019",
        deadlineDays: DPA_DEADLINE_DAYS,
        dataController: "Uganda Prisons Service",
        contact: process.env.DPA_CONTACT_EMAIL || "dpo@prisons.go.ug",
      },
    });
  } catch (err) { next(err); }
};

// ─── FULL AUDIT TRAIL (strict — immutable log) ────────────────────────────────
export const getStrictAuditTrail = async (req, res, next) => {
  try {
    if (!["WARDEN", "ADMIN"].includes(req.user.role))
      return res.status(403).json({ error: "Access denied — WARDEN/ADMIN only" });

    const { entity, action, userId, from, to, limit } = req.query;

    const logs = await prisma.auditLog.findMany({
      where: {
        ...(entity && { entity }),
        ...(action && { action }),
        ...(userId && { userId }),
        ...((from || to) && {
          createdAt: {
            ...(from && { gte: new Date(from) }),
            ...(to   && { lte: new Date(to) }),
          },
        }),
      },
      include: {
        user: { select: { name: true, email: true, role: true, badgeNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(parseInt(limit) || 500, 1000),
    });

    res.json({
      count: logs.length,
      note: "This audit trail is immutable. Records cannot be edited or deleted.",
      logs,
    });
  } catch (err) { next(err); }
};
