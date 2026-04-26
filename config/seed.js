// src/config/seed.js
// Run with: npm run db:seed

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Warden account ──────────────────────────────────────────────────────────
  const warden = await prisma.user.upsert({
    where: { email: "warden@prisoncore.local" },
    update: {},
    create: {
      name:        "Chief Warden Hayes",
      email:       "warden@prisoncore.local",
      password:    await bcrypt.hash("Warden@1234", 10),
      role:        "WARDEN",
      badgeNumber: "WDN-001",
      shift:       "DAY",
    },
  });

  const guard = await prisma.user.upsert({
    where: { email: "guard@prisoncore.local" },
    update: {},
    create: {
      name:        "Officer T. Chen",
      email:       "guard@prisoncore.local",
      password:    await bcrypt.hash("Guard@1234", 10),
      role:        "GUARD",
      badgeNumber: "BG-017",
      shift:       "NIGHT",
    },
  });

  const medic = await prisma.user.upsert({
    where: { email: "medical@prisoncore.local" },
    update: {},
    create: {
      name:        "Nurse A. Okafor",
      email:       "medical@prisoncore.local",
      password:    await bcrypt.hash("Medical@1234", 10),
      role:        "MEDICAL",
      badgeNumber: "MED-004",
      shift:       "DAY",
    },
  });

  // ── Prisoners ────────────────────────────────────────────────────────────────
  const p1 = await prisma.prisoner.upsert({
    where: { prisonerId: "P-001" },
    update: {},
    create: {
      prisonerId:  "P-001",
      name:        "Marcus J. Thornton",
      age:         34,
      crime:       "Armed Robbery",
      sentence:    "8 years",
      cellBlock:   "A",
      cell:        "A-12",
      riskLevel:   "HIGH",
      fingerprint: "FP-8821A",
      entryDate:   new Date("2021-03-15"),
      releaseDate: new Date("2029-03-15"),
    },
  });

  const p2 = await prisma.prisoner.upsert({
    where: { prisonerId: "P-002" },
    update: {},
    create: {
      prisonerId:  "P-002",
      name:        "Darnell R. Bridges",
      age:         29,
      crime:       "Drug Trafficking",
      sentence:    "5 years",
      cellBlock:   "B",
      cell:        "B-04",
      riskLevel:   "MEDIUM",
      fingerprint: "FP-4432B",
      entryDate:   new Date("2022-07-01"),
      releaseDate: new Date("2027-07-01"),
    },
  });

  const p3 = await prisma.prisoner.upsert({
    where: { prisonerId: "P-003" },
    update: {},
    create: {
      prisonerId:  "P-003",
      name:        "Sofia M. Reyes",
      age:         41,
      crime:       "Fraud",
      sentence:    "3 years",
      cellBlock:   "C",
      cell:        "C-08",
      riskLevel:   "LOW",
      fingerprint: "FP-9901C",
      entryDate:   new Date("2023-01-20"),
      releaseDate: new Date("2026-01-20"),
    },
  });

  // ── Incidents ────────────────────────────────────────────────────────────────
  await prisma.incident.upsert({
    where: { incidentId: "INC-001" },
    update: {},
    create: {
      incidentId:  "INC-001",
      type:        "Contraband",
      description: "Found unauthorized items during cell check.",
      severity:    "HIGH",
      location:    "Block A",
      resolved:    true,
      resolvedAt:  new Date("2024-11-05"),
      prisonerId:  p1.id,
      userId:      warden.id,
    },
  });

  await prisma.incident.upsert({
    where: { incidentId: "INC-002" },
    update: {},
    create: {
      incidentId:  "INC-002",
      type:        "Medical Emergency",
      description: "Prisoner reported chest pain.",
      severity:    "HIGH",
      location:    "Block C",
      resolved:    false,
      prisonerId:  p3.id,
      userId:      guard.id,
    },
  });

  // ── Alerts ───────────────────────────────────────────────────────────────────
  await prisma.alert.create({
    data: {
      message:    "Violation: Contraband found 2024-11",
      severity:   "HIGH",
      prisonerId: p1.id,
    },
  });

  console.log("✅ Seed complete!");
  console.log("   Warden  → warden@prisoncore.local  / Warden@1234");
  console.log("   Guard   → guard@prisoncore.local   / Guard@1234");
  console.log("   Medical → medical@prisoncore.local / Medical@1234");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
