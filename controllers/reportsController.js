// src/controllers/reportsController.js

import prisma from "../config/prisma.js";

// ─── GET /api/reports/dashboard ───────────────────────────────────────────────
export const getDashboard = async (req, res, next) => {
  try {
    const [
      totalPrisoners,
      highRisk,
      openIncidents,
      activeStaff,
      totalScans,
      recentScans,
      recentIncidents,
    ] = await Promise.all([
      prisma.prisoner.count(),
      prisma.prisoner.count({ where: { riskLevel: "HIGH" } }),
      prisma.incident.count({ where: { resolved: false } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.scanLog.count(),
      prisma.scanLog.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        include: { prisoner: { select: { name: true, prisonerId: true } } },
      }),
      prisma.incident.findMany({
        where:   { resolved: false },
        take:    5,
        orderBy: { createdAt: "desc" },
        include: { prisoner: { select: { name: true, prisonerId: true } } },
      }),
    ]);

    res.json({
      stats: { totalPrisoners, highRisk, openIncidents, activeStaff, totalScans },
      recentScans,
      recentIncidents,
    });
  } catch (err) { next(err); }
};

// ─── GET /api/reports/blocks ──────────────────────────────────────────────────
export const getBlockReport = async (req, res, next) => {
  try {
    const blocks = await prisma.prisoner.groupBy({
      by:      ["cellBlock"],
      _count:  { id: true },
      orderBy: { cellBlock: "asc" },
    });

    const detailed = await Promise.all(
      blocks.map(async (b) => {
        const [highRisk, medium, incidents] = await Promise.all([
          prisma.prisoner.count({ where: { cellBlock: b.cellBlock, riskLevel: "HIGH" } }),
          prisma.prisoner.count({ where: { cellBlock: b.cellBlock, riskLevel: "MEDIUM" } }),
          prisma.incident.count({
            where: {
              prisoner: { cellBlock: b.cellBlock },
              resolved: false,
            },
          }),
        ]);
        return {
          block:     b.cellBlock,
          occupied:  b._count.id,
          capacity:  16,
          highRisk,
          medium,
          openIncidents: incidents,
        };
      })
    );

    res.json(detailed);
  } catch (err) { next(err); }
};

// ─── GET /api/reports/risk ────────────────────────────────────────────────────
export const getRiskReport = async (req, res, next) => {
  try {
    const distribution = await prisma.prisoner.groupBy({
      by:     ["riskLevel"],
      _count: { id: true },
    });
    res.json(distribution.map(d => ({ riskLevel: d.riskLevel, count: d._count.id })));
  } catch (err) { next(err); }
};

// ─── GET /api/reports/incidents ───────────────────────────────────────────────
export const getIncidentReport = async (req, res, next) => {
  try {
    const byType = await prisma.incident.groupBy({
      by:     ["type"],
      _count: { id: true },
    });
    const bySeverity = await prisma.incident.groupBy({
      by:     ["severity"],
      _count: { id: true },
    });
    res.json({
      byType:     byType.map(t => ({ type: t.type, count: t._count.id })),
      bySeverity: bySeverity.map(s => ({ severity: s.severity, count: s._count.id })),
    });
  } catch (err) { next(err); }
};
