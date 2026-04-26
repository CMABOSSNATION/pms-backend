// src/controllers/incidentController.js

import prisma from "../config/prisma.js";

// ─── GET /api/incidents ───────────────────────────────────────────────────────
export const getIncidents = async (req, res, next) => {
  try {
    const { resolved, severity, prisonerId } = req.query;

    const incidents = await prisma.incident.findMany({
      where: {
        ...(resolved   !== undefined && { resolved: resolved === "true" }),
        ...(severity   && { severity }),
        ...(prisonerId && { prisonerId }),
      },
      include: {
        prisoner:   { select: { prisonerId: true, name: true, cell: true } },
        reportedBy: { select: { name: true, badgeNumber: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(incidents);
  } catch (err) { next(err); }
};

// ─── GET /api/incidents/:id ───────────────────────────────────────────────────
export const getIncident = async (req, res, next) => {
  try {
    const incident = await prisma.incident.findUnique({
      where: { id: req.params.id },
      include: {
        prisoner:   true,
        reportedBy: { select: { name: true, badgeNumber: true, role: true } },
      },
    });
    if (!incident) return res.status(404).json({ error: "Incident not found" });
    res.json(incident);
  } catch (err) { next(err); }
};

// ─── POST /api/incidents ──────────────────────────────────────────────────────
export const createIncident = async (req, res, next) => {
  try {
    const { type, description, severity, location, prisonerId } = req.body;

    if (!type || !description || !prisonerId)
      return res.status(400).json({ error: "type, description and prisonerId are required" });

    // Auto-generate incidentId
    const count = await prisma.incident.count();
    const incidentId = `INC-${String(count + 1).padStart(3, "0")}`;

    const incident = await prisma.incident.create({
      data: {
        incidentId,
        type,
        description,
        severity:   severity || "MEDIUM",
        location,
        prisonerId,
        userId: req.user.id,
      },
      include: {
        prisoner:   { select: { prisonerId: true, name: true } },
        reportedBy: { select: { name: true } },
      },
    });

    // Auto-create alert on prisoner record
    await prisma.alert.create({
      data: {
        message:    `${type} incident reported on ${new Date().toLocaleDateString()}`,
        severity:   severity || "MEDIUM",
        prisonerId,
      },
    });

    res.status(201).json(incident);
  } catch (err) { next(err); }
};

// ─── PUT /api/incidents/:id/resolve ──────────────────────────────────────────
export const resolveIncident = async (req, res, next) => {
  try {
    const incident = await prisma.incident.update({
      where: { id: req.params.id },
      data:  { resolved: true, resolvedAt: new Date() },
    });
    res.json(incident);
  } catch (err) { next(err); }
};

// ─── DELETE /api/incidents/:id ────────────────────────────────────────────────
export const deleteIncident = async (req, res, next) => {
  try {
    await prisma.incident.delete({ where: { id: req.params.id } });
    res.json({ message: "Incident deleted" });
  } catch (err) { next(err); }
};
