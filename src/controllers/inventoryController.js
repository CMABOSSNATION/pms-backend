// src/controllers/inventoryController.js
// ─── INVENTORY & LOGISTICS ────────────────────────────────────────────────────

import prisma from "../config/prisma.js";

// ─── ITEMS ────────────────────────────────────────────────────────────────────
export const getItems = async (req, res, next) => {
  try {
    const { category, lowStock } = req.query;
    const isAdmin = ["WARDEN", "ADMIN"].includes(req.user.role);

    const items = await prisma.inventoryItem.findMany({
      where: {
        ...(category && { category }),
        ...(!isAdmin && { isRestricted: false }),
      },
      include: { logs: { orderBy: { createdAt: "desc" }, take: 5 } },
      orderBy: { category: "asc" },
    });

    // Filter low stock manually (Prisma can't compare two columns directly)
    const result = lowStock === "true"
      ? items.filter(i => i.currentStock <= i.minimumStock)
      : items;

    res.json(result);
  } catch (err) { next(err); }
};

export const getItem = async (req, res, next) => {
  try {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: req.params.id },
      include: {
        logs: {
          include: { loggedBy: { select: { name: true, badgeNumber: true } } },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });
    if (!item) return res.status(404).json({ error: "Item not found" });
    if (item.isRestricted && !["WARDEN", "ADMIN"].includes(req.user.role))
      return res.status(403).json({ error: "Access to restricted items requires WARDEN or ADMIN role" });
    res.json(item);
  } catch (err) { next(err); }
};

export const createItem = async (req, res, next) => {
  try {
    if (!["WARDEN", "ADMIN", "INVENTORY"].includes(req.user.role))
      return res.status(403).json({ error: "Insufficient permissions" });

    const { name, category, unit, currentStock, minimumStock, maximumStock, unitCost, supplier, location, isRestricted } = req.body;
    if (!name || !category) return res.status(400).json({ error: "name and category are required" });

    const count = await prisma.inventoryItem.count();
    const itemCode = `INV-${category.slice(0, 3).toUpperCase()}-${String(count + 1).padStart(4, "0")}`;

    const item = await prisma.inventoryItem.create({
      data: {
        itemCode, name, category, supplier, location,
        unit: unit || "units",
        currentStock: parseInt(currentStock) || 0,
        minimumStock: parseInt(minimumStock) || 10,
        maximumStock: parseInt(maximumStock) || 500,
        unitCost: unitCost ? parseFloat(unitCost) : null,
        isRestricted: isRestricted === true || isRestricted === "true",
      },
    });
    res.status(201).json(item);
  } catch (err) { next(err); }
};

export const updateItem = async (req, res, next) => {
  try {
    const { name, minimumStock, maximumStock, unitCost, supplier, location } = req.body;
    const item = await prisma.inventoryItem.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(minimumStock !== undefined && { minimumStock: parseInt(minimumStock) }),
        ...(maximumStock !== undefined && { maximumStock: parseInt(maximumStock) }),
        ...(unitCost !== undefined && { unitCost: parseFloat(unitCost) }),
        ...(supplier !== undefined && { supplier }),
        ...(location !== undefined && { location }),
      },
    });
    res.json(item);
  } catch (err) { next(err); }
};

// ─── STOCK TRANSACTIONS ───────────────────────────────────────────────────────
export const stockTransaction = async (req, res, next) => {
  try {
    if (!["WARDEN", "ADMIN", "INVENTORY"].includes(req.user.role))
      return res.status(403).json({ error: "Insufficient permissions" });

    const { itemId, transactionType, quantity, reason, referenceId } = req.body;
    if (!itemId || !transactionType || !quantity)
      return res.status(400).json({ error: "itemId, transactionType and quantity are required" });

    const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ error: "Item not found" });
    if (item.isRestricted && !["WARDEN", "ADMIN"].includes(req.user.role))
      return res.status(403).json({ error: "Armory transactions require WARDEN/ADMIN role" });

    const qty = parseInt(quantity);
    let newStock = item.currentStock;
    if (transactionType === "IN") newStock += qty;
    else if (transactionType === "OUT") {
      if (item.currentStock < qty) return res.status(400).json({ error: "Insufficient stock" });
      newStock -= qty;
    } else if (transactionType === "ADJUSTMENT") {
      newStock = qty;
    }

    const [updatedItem, log] = await prisma.$transaction([
      prisma.inventoryItem.update({
        where: { id: itemId },
        data: { currentStock: newStock },
      }),
      prisma.inventoryLog.create({
        data: {
          transactionType, reason, referenceId,
          quantity: qty,
          balanceAfter: newStock,
          item: { connect: { id: itemId } },
          loggedBy: { connect: { id: req.user.id } },
        },
      }),
    ]);

    res.json({ item: updatedItem, log });
  } catch (err) { next(err); }
};

// ─── LOW STOCK ALERTS ─────────────────────────────────────────────────────────
export const getLowStockAlerts = async (req, res, next) => {
  try {
    const isAdmin = ["WARDEN", "ADMIN"].includes(req.user.role);
    const items = await prisma.inventoryItem.findMany({
      where: { ...(!isAdmin && { isRestricted: false }) },
    });
    const lowStock = items.filter(i => i.currentStock <= i.minimumStock);
    const critical = lowStock.filter(i => i.currentStock === 0);
    res.json({ lowStockCount: lowStock.length, criticalCount: critical.length, items: lowStock });
  } catch (err) { next(err); }
};

// ─── AUDIT TRAIL ──────────────────────────────────────────────────────────────
export const getAuditLogs = async (req, res, next) => {
  try {
    if (!["WARDEN", "ADMIN"].includes(req.user.role))
      return res.status(403).json({ error: "Audit logs require WARDEN or ADMIN role" });

    const { entity, action, userId, from, to, limit } = req.query;

    const logs = await prisma.auditLog.findMany({
      where: {
        ...(entity && { entity }),
        ...(action && { action }),
        ...(userId && { userId }),
        ...((from || to) && {
          createdAt: {
            ...(from && { gte: new Date(from) }),
            ...(to && { lte: new Date(to) }),
          },
        }),
      },
      include: { user: { select: { name: true, email: true, role: true, badgeNumber: true } } },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit) || 200,
    });
    res.json(logs);
  } catch (err) { next(err); }
};
