// src/controllers/authController.js

import bcrypt  from "bcryptjs";
import jwt     from "jsonwebtoken";
import prisma  from "../config/prisma.js";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  });

const safeUser = (u) => ({
  id: u.id, name: u.name, email: u.email,
  role: u.role, badgeNumber: u.badgeNumber, shift: u.shift,
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required" });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive)
      return res.status(401).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ error: "Invalid credentials" });

    // Write audit log
    await prisma.auditLog.create({
      data: { action: "LOGIN", entity: "User", entityId: user.id, userId: user.id, ipAddress: req.ip },
    });

    res.json({ token: signToken(user.id), user: safeUser(user) });
  } catch (err) { next(err); }
};

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
export const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    res.json(safeUser(user));
  } catch (err) { next(err); }
};

// ─── PUT /api/auth/change-password ────────────────────────────────────────────
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: "Both passwords are required" });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match)
      return res.status(401).json({ error: "Current password is incorrect" });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });

    res.json({ message: "Password updated successfully" });
  } catch (err) { next(err); }
};
