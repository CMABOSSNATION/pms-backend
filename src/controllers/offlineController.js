// src/controllers/offlineController.js
// ─── OFFLINE SYNC ENGINE ─────────────────────────────────────────────────────

import prisma from "../config/prisma.js";

// ─── RECEIVE OFFLINE BATCH FROM DEVICE ───────────────────────────────────────
export const pushOfflineBatch = async (req, res, next) => {
  try {
    const { deviceId, operations } = req.body;
    if (!deviceId || !Array.isArray(operations))
      return res.status(400).json({ error: "deviceId and operations[] are required" });

    const results = [];

    for (const op of operations) {
      const { localId, entity, operation, payload } = op;
      let result = { localId, entity, operation, status: "SYNCED", serverId: null, conflict: null };

      try {
        const data = typeof payload === "string" ? JSON.parse(payload) : payload;

        if (entity === "Movement" && operation === "CREATE") {
          const created = await prisma.movement.create({
            data: {
              from: data.from, to: data.to, reason: data.reason,
              category: data.category || "INTERNAL",
              escortBadge: data.escortBadge,
              prisoner: { connect: { id: data.prisonerId } },
              ...(data.authorizedById && { authorizedBy: { connect: { id: data.authorizedById } } }),
            },
          });
          result.serverId = created.id;
        }

        else if (entity === "Incident" && operation === "CREATE") {
          const count = await prisma.incident.count();
          const created = await prisma.incident.create({
            data: {
              incidentId: `INC-${String(count + 1).padStart(4, "0")}`,
              type: data.type, description: data.description,
              severity: data.severity || "MEDIUM", location: data.location,
              prisoner: { connect: { id: data.prisonerId } },
              reportedBy: { connect: { id: req.user.id } },
            },
          });
          result.serverId = created.id;
        }

        else if (entity === "ScanLog" && operation === "CREATE") {
          const created = await prisma.scanLog.create({
            data: {
              location: data.location, riskLevel: data.riskLevel,
              hasAlerts: data.hasAlerts || false,
              prisoner: { connect: { id: data.prisonerId } },
              scannedBy: { connect: { id: req.user.id } },
            },
          });
          result.serverId = created.id;
        }

        else if (entity === "BiometricLog" && operation === "CREATE") {
          const created = await prisma.biometricLog.create({
            data: {
              scanType: data.scanType, scanPurpose: data.scanPurpose,
              location: data.location, deviceId: data.deviceId,
              matchScore: data.matchScore, matched: data.matched !== false,
              prisoner: { connect: { id: data.prisonerId } },
            },
          });
          result.serverId = created.id;
        }

        else if (entity === "MedicationLog" && operation === "CREATE") {
          const created = await prisma.medicationLog.create({
            data: {
              medicationName: data.medicationName, dosage: data.dosage,
              status: data.status || "DISPENSED", notes: data.notes,
              scheduledAt: new Date(data.scheduledAt),
              prisoner:    { connect: { id: data.prisonerId } },
              dispensedBy: { connect: { id: req.user.id } },
            },
          });
          result.serverId = created.id;
        }

        else if (entity === "RehabilitationLog" && operation === "CREATE") {
          const created = await prisma.rehabilitationLog.create({
            data: {
              programName: data.programName, category: data.category || "VOCATIONAL",
              sessionDate: new Date(data.sessionDate),
              attended: data.attended !== false,
              performance: data.performance, notes: data.notes, instructor: data.instructor,
              prisoner: { connect: { id: data.prisonerId } },
            },
          });
          result.serverId = created.id;
        }

        else if (entity === "IndustryProduction" && operation === "CREATE") {
          const created = await prisma.industryProduction.create({
            data: {
              date: new Date(data.date), quantity: parseFloat(data.quantity),
              unit: data.unit, valueUGX: data.valueUGX ? parseFloat(data.valueUGX) : null,
              notes: data.notes, recordedBy: req.user.id,
              industry: { connect: { id: data.industryId } },
            },
          });
          result.serverId = created.id;
        }

        else {
          result.status = "SKIPPED";
          result.conflict = `Unsupported entity/operation: ${entity}/${operation}`;
        }

        // Audit every synced operation
        if (result.status === "SYNCED") {
          await prisma.auditLog.create({
            data: {
              action: operation, entity,
              entityId: result.serverId,
              details: JSON.stringify({ deviceId, localId, offlineSync: true }),
              ipAddress: req.ip, userId: req.user.id,
            },
          });
        }

        // Save sync record
        await prisma.syncQueue.create({
          data: {
            deviceId, entity, operation, localId,
            payload: JSON.stringify(data),
            serverIdMap: result.serverId,
            status: result.status,
          },
        });

      } catch (err) {
        result.status = "FAILED";
        result.conflict = err.message;
        await prisma.syncQueue.create({
          data: {
            deviceId, entity, operation, localId,
            payload: JSON.stringify(op.payload),
            status: "FAILED",
            conflictData: err.message,
          },
        });
      }

      results.push(result);
    }

    const synced   = results.filter(r => r.status === "SYNCED").length;
    const failed   = results.filter(r => r.status === "FAILED").length;
    const skipped  = results.filter(r => r.status === "SKIPPED").length;

    res.json({ deviceId, total: operations.length, synced, failed, skipped, results });
  } catch (err) { next(err); }
};

// ─── GET FULL DATASET FOR OFFLINE BOOTSTRAP ───────────────────────────────────
export const getOfflineBootstrap = async (req, res, next) => {
  try {
    // Returns everything a device needs to work completely offline
    const [prisoners, incidents, staff, movements, industries] = await Promise.all([
      prisma.prisoner.findMany({
        where: { status: { not: "RELEASED" } },
        select: {
          id: true, prisonerId: true, name: true, age: true,
          crime: true, cellBlock: true, cell: true,
          status: true, riskLevel: true, fingerprint: true,
          entryDate: true, releaseDate: true,
        },
      }),
      prisma.incident.findMany({
        where: { resolved: false },
        select: { id: true, incidentId: true, type: true, severity: true,
          description: true, prisonerId: true, createdAt: true },
      }),
      prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, name: true, role: true, badgeNumber: true },
      }),
      prisma.movement.findMany({
        where: { returnedAt: null },
        select: { id: true, from: true, to: true, category: true, prisonerId: true, createdAt: true },
      }),
      prisma.industry.findMany({
        where: { isActive: true },
        select: { id: true, name: true, category: true },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        action: "VIEW", entity: "OfflineBootstrap",
        details: JSON.stringify({ deviceAgent: req.headers["user-agent"] }),
        ipAddress: req.ip, userId: req.user.id,
      },
    });

    res.json({
      bootstrappedAt: new Date().toISOString(),
      prisoners, incidents, staff, movements, industries,
      meta: {
        prisonerCount: prisoners.length,
        activeIncidents: incidents.length,
        staffCount: staff.length,
      },
    });
  } catch (err) { next(err); }
};

// ─── SYNC STATUS ──────────────────────────────────────────────────────────────
export const getSyncStatus = async (req, res, next) => {
  try {
    const { deviceId } = req.query;
    const records = await prisma.syncQueue.findMany({
      where: { ...(deviceId && { deviceId }) },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const summary = {
      total: records.length,
      synced: records.filter(r => r.status === "SYNCED").length,
      pending: records.filter(r => r.status === "PENDING").length,
      failed: records.filter(r => r.status === "FAILED").length,
      conflicts: records.filter(r => r.status === "CONFLICT").length,
    };

    res.json({ deviceId, summary, records });
  } catch (err) { next(err); }
};
