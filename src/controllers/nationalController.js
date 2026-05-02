// src/controllers/nationalController.js
// ─── NATIONAL SYSTEM INTEGRATIONS: NIRA + eCMS ───────────────────────────────

import prisma from "../config/prisma.js";

// ─── NIRA (National Identification & Registration Authority) ──────────────────

export const nireLookup = async (req, res, next) => {
  try {
    const { nationalId, prisonerId } = req.body;
    if (!nationalId) return res.status(400).json({ error: "nationalId is required" });

    // ── Live NIRA call (replace stub with real endpoint when credentials provided)
    let niraData = null;
    const NIRA_URL  = process.env.NIRA_API_URL;
    const NIRA_KEY  = process.env.NIRA_API_KEY;

    if (NIRA_URL && NIRA_KEY) {
      try {
        const resp = await fetch(`${NIRA_URL}/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": NIRA_KEY },
          body: JSON.stringify({ nin: nationalId }),
        });
        niraData = await resp.json();
      } catch (e) {
        console.warn("[NIRA] Live call failed, using stub:", e.message);
      }
    }

    // ── Stub response for dev/offline mode
    if (!niraData) {
      niraData = {
        nin: nationalId,
        fullName: "NIRA_STUB — Connect NIRA_API_URL env var for live data",
        dob: "N/A", gender: "N/A", photoUrl: null,
        stub: true,
      };
    }

    const record = await prisma.niraLookup.create({
      data: {
        nationalId,
        fullName:    niraData.fullName || null,
        dob:         niraData.dob      || null,
        gender:      niraData.gender   || null,
        photoUrl:    niraData.photoUrl || null,
        rawResponse: JSON.stringify(niraData),
        matchedTo:   prisonerId || null,
        verifiedBy:  req.user.id,
      },
    });

    // Link national ID back to prisoner record
    if (prisonerId) {
      await prisma.prisoner.update({
        where: { id: prisonerId },
        data: { nationalId },
      });
    }

    res.json({ verified: !niraData.stub, record, niraData });
  } catch (err) { next(err); }
};

export const getNiraHistory = async (req, res, next) => {
  try {
    const { prisonerId, nationalId } = req.query;
    const records = await prisma.niraLookup.findMany({
      where: {
        ...(prisonerId && { matchedTo: prisonerId }),
        ...(nationalId && { nationalId }),
      },
      orderBy: { verifiedAt: "desc" },
    });
    res.json(records);
  } catch (err) { next(err); }
};

// ─── eCMS (Electronic Court Case Management System) ──────────────────────────

export const ecmsSync = async (req, res, next) => {
  try {
    const { prisonerId, caseNumber } = req.body;
    if (!prisonerId || !caseNumber) return res.status(400).json({ error: "prisonerId and caseNumber required" });

    const ECMS_URL = process.env.ECMS_API_URL;
    const ECMS_KEY = process.env.ECMS_API_KEY;

    let caseData = null;
    if (ECMS_URL && ECMS_KEY) {
      try {
        const resp = await fetch(`${ECMS_URL}/cases/${caseNumber}`, {
          headers: { "Authorization": `Bearer ${ECMS_KEY}` },
        });
        caseData = await resp.json();
      } catch (e) {
        console.warn("[eCMS] Live call failed:", e.message);
      }
    }

    if (!caseData) {
      caseData = {
        caseNumber, courtName: "eCMS_STUB", judge: "N/A",
        status: "OPEN", charges: "Set ECMS_API_URL env var for live data",
        stub: true,
      };
    }

    const ecmsCase = await prisma.ecmsCase.upsert({
      where: { caseNumber },
      update: {
        courtName:    caseData.courtName   || "Unknown",
        judge:        caseData.judge       || null,
        status:       caseData.status      || "OPEN",
        charges:      caseData.charges     || null,
        rawData:      JSON.stringify(caseData),
        lastSyncedAt: new Date(),
      },
      create: {
        caseNumber,
        prisonerId,
        courtName:    caseData.courtName   || "Unknown",
        judge:        caseData.judge       || null,
        status:       caseData.status      || "OPEN",
        charges:      caseData.charges     || null,
        rawData:      JSON.stringify(caseData),
        lastSyncedAt: new Date(),
      },
    });

    res.json({ synced: true, case: ecmsCase, live: !caseData.stub });
  } catch (err) { next(err); }
};

export const getEcmsCases = async (req, res, next) => {
  try {
    const { prisonerId } = req.query;
    const cases = await prisma.ecmsCase.findMany({
      where: { ...(prisonerId && { prisonerId }) },
      include: { prisoner: { select: { name: true, prisonerId: true } } },
      orderBy: { lastSyncedAt: "desc" },
    });
    res.json(cases);
  } catch (err) { next(err); }
};

// ─── NATIONAL DB EXPORT (Police / Immigration) ────────────────────────────────
export const exportNationalDB = async (req, res, next) => {
  try {
    if (!["WARDEN", "ADMIN"].includes(req.user.role))
      return res.status(403).json({ error: "Only WARDEN/ADMIN can export to National DB" });

    const prisoners = await prisma.prisoner.findMany({
      select: {
        prisonerId: true, name: true, age: true, nationality: true,
        nationalId: true, crime: true, status: true, entryDate: true,
        releaseDate: true, fingerprint: true, riskLevel: true,
        sentences:  { select: { offenseDescription: true, sentenceType: true, calculatedRelease: true } },
        warrants:   { select: { warrantNumber: true, type: true, status: true } },
        ecmsCases:  { select: { caseNumber: true, courtName: true, status: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "EXPORT", entity: "Prisoner",
        details: JSON.stringify({ count: prisoners.length, destination: "NationalDB", exportedBy: req.user.name }),
        ipAddress: req.ip, userId: req.user.id,
      },
    });

    res.json({ exportedAt: new Date().toISOString(), recordCount: prisoners.length, format: "UGPRIS-v2", data: prisoners });
  } catch (err) { next(err); }
};
