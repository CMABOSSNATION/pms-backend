// src/controllers/prisonerController.js

import prisma from "../config/prisma.js";

// ─── GET /api/prisoners ───────────────────────────────────────────────────────
export const getPrisoners = async (req, res, next) => {
  try {
    const { search, riskLevel, cellBlock, status } = req.query;

    const where = {
      ...(search && {
        OR: [
          { name:       { contains: search, mode: "insensitive" } },
          { prisonerId: { contains: search, mode: "insensitive" } },
          { crime:      { contains: search, mode: "insensitive" } },
          { cell:       { contains: search, mode: "insensitive" } },
          { fingerprint:{ contains: search, mode: "insensitive" } },
        ],
      }),
      ...(riskLevel  && { riskLevel }),
      ...(cellBlock  && { cellBlock }),
      ...(status     && { status }),
    };

    const prisoners = await prisma.prisoner.findMany({
      where,
      include: { alerts: true, _count: { select: { incidents: true, scans: true } } },
      orderBy: { createdAt: "desc" },
    });

    res.json(prisoners);
  } catch (err) { next(err); }
};

// ─── GET /api/prisoners/:id ───────────────────────────────────────────────────
export const getPrisoner = async (req, res, next) => {
  try {
    const prisoner = await prisma.prisoner.findUnique({
      where: { id: req.params.id },
      include: {
        alerts:        { orderBy: { createdAt: "desc" } },
        incidents:     { orderBy: { createdAt: "desc" }, take: 10 },
        scans:         { orderBy: { createdAt: "desc" }, take: 20, include: { scannedBy: { select: { name: true } } } },
        movements:     { orderBy: { createdAt: "desc" } },
        visits:        { orderBy: { visitDate:  "desc" } },
        medicalRecords:{ orderBy: { createdAt:  "desc" } },
      },
    });

    if (!prisoner) return res.status(404).json({ error: "Prisoner not found" });
    res.json(prisoner);
  } catch (err) { next(err); }
};

// ─── POST /api/prisoners ──────────────────────────────────────────────────────
export const createPrisoner = async (req, res, next) => {
  try {
    const {
      name, age, crime, sentence, cellBlock, cell,
      riskLevel, fingerprint, entryDate, releaseDate,
      photoUrl, notes,
    } = req.body;

    if (!name || !crime || !cellBlock || !cell || !fingerprint)
      return res.status(400).json({ error: "name, crime, cellBlock, cell and fingerprint are required" });

    // Auto-generate prisonerId
    const count = await prisma.prisoner.count();
    const prisonerId = `P-${String(count + 1).padStart(3, "0")}`;

    const prisoner = await prisma.prisoner.create({
      data: {
        prisonerId, name, crime, sentence, cellBlock, cell,
        age:        parseInt(age) || 0,
        riskLevel:  riskLevel  || "MEDIUM",
        fingerprint,
        entryDate:  entryDate  ? new Date(entryDate)  : new Date(),
        releaseDate:releaseDate? new Date(releaseDate) : null,
        photoUrl, notes,
      },
    });

    res.status(201).json(prisoner);
  } catch (err) { next(err); }
};

// ─── PUT /api/prisoners/:id ───────────────────────────────────────────────────
export const updatePrisoner = async (req, res, next) => {
  try {
    const {
      name, age, crime, sentence, cellBlock, cell,
      riskLevel, status, releaseDate, photoUrl, notes,
    } = req.body;

    const prisoner = await prisma.prisoner.update({
      where: { id: req.params.id },
      data: {
        ...(name        && { name }),
        ...(age         && { age: parseInt(age) }),
        ...(crime       && { crime }),
        ...(sentence    && { sentence }),
        ...(cellBlock   && { cellBlock }),
        ...(cell        && { cell }),
        ...(riskLevel   && { riskLevel }),
        ...(status      && { status }),
        ...(releaseDate && { releaseDate: new Date(releaseDate) }),
        ...(photoUrl    !== undefined && { photoUrl }),
        ...(notes       !== undefined && { notes }),
      },
    });

    res.json(prisoner);
  } catch (err) { next(err); }
};

// ─── DELETE /api/prisoners/:id ────────────────────────────────────────────────
export const deletePrisoner = async (req, res, next) => {
  try {
    await prisma.prisoner.delete({ where: { id: req.params.id } });
    res.json({ message: "Prisoner record deleted" });
  } catch (err) { next(err); }
};

// ─── POST /api/prisoners/:id/movements ───────────────────────────────────────
export const logMovement = async (req, res, next) => {
  try {
    const { from, to, reason } = req.body;
    const movement = await prisma.movement.create({
      data: { from, to, reason, prisonerId: req.params.id },
    });
    res.status(201).json(movement);
  } catch (err) { next(err); }
};
