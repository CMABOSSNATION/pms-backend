// src/controllers/staffController.js

import bcrypt from "bcryptjs";
import prisma  from "../config/prisma.js";

const safeUser = (u) => {
  const { password, ...rest } = u;
  return rest;
};

// ─── GET /api/staff ───────────────────────────────────────────────────────────
export const getStaff = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, email: true, role: true,
        badgeNumber: true, shift: true, isActive: true, createdAt: true,
        _count: { select: { incidents: true, scans: true, auditLogs: true } },
      },
    });
    res.json(users);
  } catch (err) { next(err); }
};

// ─── GET /api/staff/:id ───────────────────────────────────────────────────────
export const getStaffMember = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.params.id },
      select: {
        id: true, name: true, email: true, role: true,
        badgeNumber: true, shift: true, isActive: true, createdAt: true,
        auditLogs: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!user) return res.status(404).json({ error: "Staff member not found" });
    res.json(user);
  } catch (err) { next(err); }
};

// ─── POST /api/staff ──────────────────────────────────────────────────────────
export const createStaff = async (req, res, next) => {
  try {
    const { name, email, password, role, badgeNumber, shift } = req.body;

    if (!name || !email || !password || !badgeNumber)
      return res.status(400).json({ error: "name, email, password and badgeNumber are required" });

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email, password: hashed, role: role || "GUARD", badgeNumber, shift: shift || "DAY" },
    });

    res.status(201).json(safeUser(user));
  } catch (err) { next(err); }
};

// ─── PUT /api/staff/:id ───────────────────────────────────────────────────────
export const updateStaff = async (req, res, next) => {
  try {
    const { name, role, shift, isActive } = req.body;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(name     && { name }),
        ...(role     && { role }),
        ...(shift    && { shift }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    res.json(safeUser(user));
  } catch (err) { next(err); }
};

// ─── DELETE /api/staff/:id ────────────────────────────────────────────────────
export const deleteStaff = async (req, res, next) => {
  try {
    // Deactivate instead of hard delete (preserve audit trail)
    await prisma.user.update({
      where: { id: req.params.id },
      data:  { isActive: false },
    });
    res.json({ message: "Staff member deactivated" });
  } catch (err) { next(err); }
};
