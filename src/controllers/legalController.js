// src/controllers/legalController.js
// ─── LEGAL & CASE MANAGEMENT ──────────────────────────────────────────────────

import prisma from "../config/prisma.js";

// ─── WARRANTS ─────────────────────────────────────────────────────────────────

export const getWarrants = async (req, res, next) => {
  try {
    const { prisonerId, status, type } = req.query;
    const warrants = await prisma.warrant.findMany({
      where: {
        ...(prisonerId && { prisonerId }),
        ...(status && { status }),
        ...(type && { type }),
      },
      include: { prisoner: { select: { name: true, prisonerId: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(warrants);
  } catch (err) { next(err); }
};

export const createWarrant = async (req, res, next) => {
  try {
    const {
      prisonerId, type, issuedBy, courtName,
      issuedDate, expiryDate, documentUrl, description,
    } = req.body;
    if (!prisonerId || !type || !issuedBy || !courtName || !issuedDate)
      return res.status(400).json({ error: "prisonerId, type, issuedBy, courtName and issuedDate are required" });

    const count = await prisma.warrant.count();
    const warrantNumber = `WRT-${String(count + 1).padStart(4, "0")}`;

    const warrant = await prisma.warrant.create({
      data: {
        warrantNumber, type, issuedBy, courtName, description,
        issuedDate: new Date(issuedDate),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        documentUrl,
        prisoner: { connect: { id: prisonerId } },
      },
    });
    res.status(201).json(warrant);
  } catch (err) { next(err); }
};

export const updateWarrant = async (req, res, next) => {
  try {
    const { status, documentUrl, description } = req.body;
    const warrant = await prisma.warrant.update({
      where: { id: req.params.id },
      data: {
        ...(status && { status }),
        ...(documentUrl !== undefined && { documentUrl }),
        ...(description !== undefined && { description }),
      },
    });
    res.json(warrant);
  } catch (err) { next(err); }
};

// ─── SENTENCE CALCULATOR ──────────────────────────────────────────────────────

export const getSentences = async (req, res, next) => {
  try {
    const { prisonerId } = req.query;
    const sentences = await prisma.sentenceRecord.findMany({
      where: { ...(prisonerId && { prisonerId }) },
      include: { prisoner: { select: { name: true, prisonerId: true } } },
      orderBy: { startDate: "desc" },
    });
    res.json(sentences);
  } catch (err) { next(err); }
};

export const createSentence = async (req, res, next) => {
  try {
    const {
      prisonerId, offenseDescription, sentenceType,
      sentenceYears, startDate, goodBehaviorDays, remissionDays, notes,
    } = req.body;
    if (!prisonerId || !offenseDescription || !sentenceYears || !startDate)
      return res.status(400).json({ error: "prisonerId, offenseDescription, sentenceYears and startDate are required" });

    // Auto-calculate release date
    const start = new Date(startDate);
    const netDays = parseInt(sentenceYears)
      - (parseInt(goodBehaviorDays) || 0)
      - (parseInt(remissionDays) || 0);
    const calculatedRelease = new Date(start.getTime() + netDays * 86400000);

    const sentence = await prisma.sentenceRecord.create({
      data: {
        offenseDescription,
        sentenceType: sentenceType || "CONSECUTIVE",
        sentenceYears: parseInt(sentenceYears),
        startDate: start,
        goodBehaviorDays: parseInt(goodBehaviorDays) || 0,
        remissionDays: parseInt(remissionDays) || 0,
        calculatedRelease,
        notes,
        prisoner: { connect: { id: prisonerId } },
      },
    });

    // Update prisoner releaseDate with the latest calculated release
    await prisma.prisoner.update({
      where: { id: prisonerId },
      data: { releaseDate: calculatedRelease },
    });

    res.status(201).json(sentence);
  } catch (err) { next(err); }
};

export const updateSentenceCredits = async (req, res, next) => {
  try {
    const { goodBehaviorDays, remissionDays, notes } = req.body;
    const existing = await prisma.sentenceRecord.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Sentence not found" });

    const newGood = goodBehaviorDays !== undefined ? parseInt(goodBehaviorDays) : existing.goodBehaviorDays;
    const newRemission = remissionDays !== undefined ? parseInt(remissionDays) : existing.remissionDays;
    const netDays = existing.sentenceYears - newGood - newRemission;
    const calculatedRelease = new Date(existing.startDate.getTime() + netDays * 86400000);

    const sentence = await prisma.sentenceRecord.update({
      where: { id: req.params.id },
      data: { goodBehaviorDays: newGood, remissionDays: newRemission, calculatedRelease, notes },
    });

    // Keep prisoner releaseDate in sync
    await prisma.prisoner.update({
      where: { id: existing.prisonerId },
      data: { releaseDate: calculatedRelease },
    });

    res.json(sentence);
  } catch (err) { next(err); }
};

// ─── COURT HEARINGS ───────────────────────────────────────────────────────────

export const getHearings = async (req, res, next) => {
  try {
    const { prisonerId, upcoming } = req.query;
    const where = {
      ...(prisonerId && { prisonerId }),
      ...(upcoming === "true" && { scheduledAt: { gte: new Date() } }),
    };
    const hearings = await prisma.courtHearing.findMany({
      where,
      include: { prisoner: { select: { name: true, prisonerId: true } } },
      orderBy: { scheduledAt: "asc" },
    });
    res.json(hearings);
  } catch (err) { next(err); }
};

export const createHearing = async (req, res, next) => {
  try {
    const {
      prisonerId, courtName, caseNumber, hearingType,
      scheduledAt, venue, judge, notes, externalRef,
    } = req.body;
    if (!prisonerId || !courtName || !caseNumber || !hearingType || !scheduledAt)
      return res.status(400).json({ error: "prisonerId, courtName, caseNumber, hearingType and scheduledAt are required" });

    const count = await prisma.courtHearing.count();
    const hearingId = `HRG-${String(count + 1).padStart(4, "0")}`;

    const hearing = await prisma.courtHearing.create({
      data: {
        hearingId, courtName, caseNumber, hearingType, venue, judge, notes, externalRef,
        scheduledAt: new Date(scheduledAt),
        prisoner: { connect: { id: prisonerId } },
      },
    });
    res.status(201).json(hearing);
  } catch (err) { next(err); }
};

export const recordHearingOutcome = async (req, res, next) => {
  try {
    const { outcome, nextHearingAt, notes } = req.body;
    const hearing = await prisma.courtHearing.update({
      where: { id: req.params.id },
      data: {
        outcome,
        notes,
        syncedAt: new Date(),
        ...(nextHearingAt && { nextHearingAt: new Date(nextHearingAt) }),
      },
    });
    res.json(hearing);
  } catch (err) { next(err); }
};

// ─── JUDICIARY SYNC PORTAL ────────────────────────────────────────────────────
export const syncJudiciaryData = async (req, res, next) => {
  try {
    // This endpoint simulates receiving data from an external Judiciary API.
    // In production, this would be called by a webhook from the court system.
    const { hearings } = req.body;
    if (!hearings || !Array.isArray(hearings))
      return res.status(400).json({ error: "hearings array is required" });

    const results = [];
    for (const h of hearings) {
      const existing = await prisma.courtHearing.findFirst({ where: { externalRef: h.externalRef } });
      if (existing) {
        const updated = await prisma.courtHearing.update({
          where: { id: existing.id },
          data: { outcome: h.outcome, nextHearingAt: h.nextHearingAt ? new Date(h.nextHearingAt) : null, syncedAt: new Date() },
        });
        results.push({ action: "updated", id: updated.id });
      } else {
        results.push({ action: "skipped", externalRef: h.externalRef });
      }
    }
    res.json({ synced: results.length, results });
  } catch (err) { next(err); }
};

// ─── NATIONAL ID EXPORT ───────────────────────────────────────────────────────
export const exportToNationalDB = async (req, res, next) => {
  try {
    const { prisonerIds } = req.body;
    const where = prisonerIds?.length ? { id: { in: prisonerIds } } : {};
    const prisoners = await prisma.prisoner.findMany({
      where,
      select: {
        prisonerId: true, name: true, age: true, nationality: true, nationalId: true,
        crime: true, status: true, entryDate: true, releaseDate: true, fingerprint: true,
        sentences: { select: { offenseDescription: true, sentenceType: true, calculatedRelease: true } },
        warrants: { select: { warrantNumber: true, type: true, status: true } },
      },
    });

    // Audit the export
    await prisma.auditLog.create({
      data: {
        action: "EXPORT",
        entity: "Prisoner",
        entityId: null,
        details: JSON.stringify({ count: prisoners.length, exportedTo: "NationalDB" }),
        ipAddress: req.ip,
        userId: req.user.id,
      },
    });

    res.json({
      exportedAt: new Date().toISOString(),
      recordCount: prisoners.length,
      format: "JSON-v1",
      data: prisoners,
    });
  } catch (err) { next(err); }
};
