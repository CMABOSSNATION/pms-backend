// src/controllers/medicalController.js
// ─── MEDICAL & REHABILITATION TRACKING ───────────────────────────────────────

import prisma from "../config/prisma.js";

// ─── MEDICAL RECORDS (EHR) ────────────────────────────────────────────────────
export const getMedicalRecords = async (req, res, next) => {
  try {
    // Only MEDICAL role can view confidential records
    const isMedical = ["MEDICAL", "WARDEN", "ADMIN"].includes(req.user.role);
    const { prisonerId, type } = req.query;

    const records = await prisma.medicalRecord.findMany({
      where: {
        ...(prisonerId && { prisonerId }),
        ...(type && { type }),
        ...(!isMedical && { isConfidential: false }),
      },
      include: { prisoner: { select: { name: true, prisonerId: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(records);
  } catch (err) { next(err); }
};

export const createMedicalRecord = async (req, res, next) => {
  try {
    if (!["MEDICAL", "ADMIN"].includes(req.user.role))
      return res.status(403).json({ error: "Only medical officers can create health records" });

    const { prisonerId, type, description, treatment, medication, diagnosis, nextReview, isConfidential } = req.body;
    if (!prisonerId || !type || !description)
      return res.status(400).json({ error: "prisonerId, type and description are required" });

    const record = await prisma.medicalRecord.create({
      data: {
        type, description, treatment, medication, diagnosis,
        isConfidential: isConfidential !== false,
        nextReview: nextReview ? new Date(nextReview) : null,
        prisoner: { connect: { id: prisonerId } },
      },
    });
    res.status(201).json(record);
  } catch (err) { next(err); }
};

// ─── VACCINATIONS ─────────────────────────────────────────────────────────────
export const getVaccinations = async (req, res, next) => {
  try {
    const { prisonerId } = req.query;
    const records = await prisma.vaccination.findMany({
      where: { ...(prisonerId && { prisonerId }) },
      include: { prisoner: { select: { name: true, prisonerId: true } } },
      orderBy: { givenDate: "desc" },
    });
    res.json(records);
  } catch (err) { next(err); }
};

export const createVaccination = async (req, res, next) => {
  try {
    if (!["MEDICAL", "ADMIN"].includes(req.user.role))
      return res.status(403).json({ error: "Only medical officers can log vaccinations" });

    const { prisonerId, vaccine, doseNumber, givenDate, nextDueDate, givenBy, batchNumber } = req.body;
    if (!prisonerId || !vaccine || !givenDate || !givenBy)
      return res.status(400).json({ error: "prisonerId, vaccine, givenDate and givenBy are required" });

    const record = await prisma.vaccination.create({
      data: {
        vaccine, givenBy, batchNumber,
        doseNumber: parseInt(doseNumber) || 1,
        givenDate: new Date(givenDate),
        nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
        prisoner: { connect: { id: prisonerId } },
      },
    });
    res.status(201).json(record);
  } catch (err) { next(err); }
};

// ─── eMAR — MEDICATION DISPENSING ────────────────────────────────────────────
export const getMedications = async (req, res, next) => {
  try {
    const { prisonerId, status } = req.query;
    const meds = await prisma.medicationLog.findMany({
      where: {
        ...(prisonerId && { prisonerId }),
        ...(status && { status }),
      },
      include: {
        prisoner: { select: { name: true, prisonerId: true } },
        dispensedBy: { select: { name: true, badgeNumber: true } },
      },
      orderBy: { scheduledAt: "desc" },
    });
    res.json(meds);
  } catch (err) { next(err); }
};

export const dispenseMedication = async (req, res, next) => {
  try {
    if (!["MEDICAL", "ADMIN"].includes(req.user.role))
      return res.status(403).json({ error: "Only medical officers can dispense medication" });

    const { prisonerId, medicationName, dosage, scheduledAt, status, notes } = req.body;
    if (!prisonerId || !medicationName || !dosage || !scheduledAt)
      return res.status(400).json({ error: "prisonerId, medicationName, dosage and scheduledAt are required" });

    const log = await prisma.medicationLog.create({
      data: {
        medicationName, dosage, notes,
        status: status || "DISPENSED",
        dispensedAt: new Date(),
        scheduledAt: new Date(scheduledAt),
        prisoner: { connect: { id: prisonerId } },
        dispensedBy: { connect: { id: req.user.id } },
      },
      include: {
        prisoner: { select: { name: true, prisonerId: true } },
        dispensedBy: { select: { name: true } },
      },
    });
    res.status(201).json(log);
  } catch (err) { next(err); }
};

// ─── REHABILITATION ───────────────────────────────────────────────────────────
export const getRehabLogs = async (req, res, next) => {
  try {
    const { prisonerId, category } = req.query;
    const logs = await prisma.rehabilitationLog.findMany({
      where: {
        ...(prisonerId && { prisonerId }),
        ...(category && { category }),
      },
      include: { prisoner: { select: { name: true, prisonerId: true } } },
      orderBy: { sessionDate: "desc" },
    });
    res.json(logs);
  } catch (err) { next(err); }
};

export const createRehabLog = async (req, res, next) => {
  try {
    const { prisonerId, programName, category, sessionDate, attended, performance, notes, instructor } = req.body;
    if (!prisonerId || !programName || !sessionDate)
      return res.status(400).json({ error: "prisonerId, programName and sessionDate are required" });

    const log = await prisma.rehabilitationLog.create({
      data: {
        programName, notes, instructor,
        category: category || "VOCATIONAL",
        sessionDate: new Date(sessionDate),
        attended: attended !== false,
        performance: performance || null,
        prisoner: { connect: { id: prisonerId } },
      },
    });
    res.status(201).json(log);
  } catch (err) { next(err); }
};

// ─── PRISONER HEALTH SUMMARY ──────────────────────────────────────────────────
export const getPrisonerHealthSummary = async (req, res, next) => {
  try {
    if (!["MEDICAL", "WARDEN", "ADMIN"].includes(req.user.role))
      return res.status(403).json({ error: "Insufficient permissions" });

    const { id } = req.params;
    const [records, vaccinations, medications, rehab] = await Promise.all([
      prisma.medicalRecord.findMany({ where: { prisonerId: id }, orderBy: { createdAt: "desc" } }),
      prisma.vaccination.findMany({ where: { prisonerId: id }, orderBy: { givenDate: "desc" } }),
      prisma.medicationLog.findMany({ where: { prisonerId: id }, orderBy: { scheduledAt: "desc" }, take: 30 }),
      prisma.rehabilitationLog.findMany({ where: { prisonerId: id }, orderBy: { sessionDate: "desc" } }),
    ]);

    const attendanceRate = rehab.length
      ? Math.round((rehab.filter(r => r.attended).length / rehab.length) * 100)
      : 0;

    res.json({ records, vaccinations, medications, rehabilitationLogs: rehab, attendanceRate });
  } catch (err) { next(err); }
};
