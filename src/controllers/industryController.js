// src/controllers/industryController.js
// ─── PRISON INDUSTRIES TRACKER ───────────────────────────────────────────────

import prisma from "../config/prisma.js";

// ─── INDUSTRIES ───────────────────────────────────────────────────────────────
export const getIndustries = async (req, res, next) => {
  try {
    const industries = await prisma.industry.findMany({
      include: {
        _count: { select: { enrollments: true, productions: true } },
        productions: { orderBy: { date: "desc" }, take: 5 },
      },
      orderBy: { category: "asc" },
    });
    res.json(industries);
  } catch (err) { next(err); }
};

export const createIndustry = async (req, res, next) => {
  try {
    if (!["WARDEN", "ADMIN"].includes(req.user.role))
      return res.status(403).json({ error: "Insufficient permissions" });
    const { name, category, description, supervisor } = req.body;
    if (!name || !category) return res.status(400).json({ error: "name and category are required" });
    const industry = await prisma.industry.create({
      data: { name, category, description, supervisor },
    });
    res.status(201).json(industry);
  } catch (err) { next(err); }
};

export const updateIndustry = async (req, res, next) => {
  try {
    const { name, description, supervisor, isActive } = req.body;
    const industry = await prisma.industry.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(supervisor !== undefined && { supervisor }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    res.json(industry);
  } catch (err) { next(err); }
};

// ─── ENROLLMENTS ──────────────────────────────────────────────────────────────
export const getEnrollments = async (req, res, next) => {
  try {
    const { industryId, prisonerId, status } = req.query;
    const enrollments = await prisma.industryEnrollment.findMany({
      where: {
        ...(industryId && { industryId }),
        ...(prisonerId && { prisonerId }),
        ...(status && { status }),
      },
      include: {
        prisoner: { select: { name: true, prisonerId: true, cellBlock: true } },
        industry: { select: { name: true, category: true } },
      },
      orderBy: { startDate: "desc" },
    });
    res.json(enrollments);
  } catch (err) { next(err); }
};

export const enrollPrisoner = async (req, res, next) => {
  try {
    const { prisonerId, industryId, startDate, notes } = req.body;
    if (!prisonerId || !industryId || !startDate)
      return res.status(400).json({ error: "prisonerId, industryId and startDate are required" });

    // Check not already enrolled
    const existing = await prisma.industryEnrollment.findFirst({
      where: { prisonerId, industryId, status: "ACTIVE" },
    });
    if (existing) return res.status(409).json({ error: "Prisoner is already enrolled in this industry" });

    const enrollment = await prisma.industryEnrollment.create({
      data: {
        startDate: new Date(startDate), notes,
        prisoner: { connect: { id: prisonerId } },
        industry: { connect: { id: industryId } },
      },
      include: {
        prisoner: { select: { name: true, prisonerId: true } },
        industry: { select: { name: true, category: true } },
      },
    });
    res.status(201).json(enrollment);
  } catch (err) { next(err); }
};

export const updateEnrollment = async (req, res, next) => {
  try {
    const { status, endDate, notes } = req.body;
    const enrollment = await prisma.industryEnrollment.update({
      where: { id: req.params.id },
      data: {
        ...(status && { status }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(notes !== undefined && { notes }),
      },
    });
    res.json(enrollment);
  } catch (err) { next(err); }
};

// ─── PRODUCTION LOGS ──────────────────────────────────────────────────────────
export const getProductions = async (req, res, next) => {
  try {
    const { industryId, from, to } = req.query;
    const productions = await prisma.industryProduction.findMany({
      where: {
        ...(industryId && { industryId }),
        ...((from || to) && {
          date: {
            ...(from && { gte: new Date(from) }),
            ...(to && { lte: new Date(to) }),
          },
        }),
      },
      include: { industry: { select: { name: true, category: true } } },
      orderBy: { date: "desc" },
    });
    res.json(productions);
  } catch (err) { next(err); }
};

export const logProduction = async (req, res, next) => {
  try {
    const { industryId, date, quantity, unit, valueUGX, notes } = req.body;
    if (!industryId || !date || !quantity || !unit)
      return res.status(400).json({ error: "industryId, date, quantity and unit are required" });

    const production = await prisma.industryProduction.create({
      data: {
        date: new Date(date), notes,
        quantity: parseFloat(quantity),
        unit,
        valueUGX: valueUGX ? parseFloat(valueUGX) : null,
        recordedBy: req.user.id,
        industry: { connect: { id: industryId } },
      },
      include: { industry: { select: { name: true, category: true } } },
    });
    res.status(201).json(production);
  } catch (err) { next(err); }
};

// ─── INDUSTRY SUMMARY ─────────────────────────────────────────────────────────
export const getIndustrySummary = async (req, res, next) => {
  try {
    const industries = await prisma.industry.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { enrollments: true } },
        productions: { orderBy: { date: "desc" } },
        enrollments: { where: { status: "ACTIVE" }, select: { id: true } },
      },
    });

    const summary = industries.map(ind => {
      const totalValue = ind.productions.reduce((s, p) => s + (p.valueUGX || 0), 0);
      const totalQty   = ind.productions.reduce((s, p) => s + p.quantity, 0);
      return {
        id: ind.id, name: ind.name, category: ind.category,
        supervisor: ind.supervisor, isActive: ind.isActive,
        activeEnrollees: ind.enrollments.length,
        totalProductions: ind.productions.length,
        totalValueUGX: totalValue,
        totalQuantity: totalQty,
      };
    });

    const grandTotal = summary.reduce((s, i) => s + i.totalValueUGX, 0);
    res.json({ industries: summary, grandTotalValueUGX: grandTotal });
  } catch (err) { next(err); }
};
