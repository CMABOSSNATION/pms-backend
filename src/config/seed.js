// src/config/seed.js
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Staff accounts ───────────────────────────────────────────────────────────
  const warden = await prisma.user.upsert({
    where: { email: "warden@prisoncore.local" },
    update: {},
    create: {
      name: "Chief Warden Hayes", email: "warden@prisoncore.local",
      password: await bcrypt.hash("Warden@1234", 10),
      role: "WARDEN", badgeNumber: "WDN-001", shift: "DAY",
    },
  });

  const guard = await prisma.user.upsert({
    where: { email: "guard@prisoncore.local" },
    update: {},
    create: {
      name: "Officer T. Chen", email: "guard@prisoncore.local",
      password: await bcrypt.hash("Guard@1234", 10),
      role: "GUARD", badgeNumber: "BG-017", shift: "NIGHT",
    },
  });

  const medic = await prisma.user.upsert({
    where: { email: "medical@prisoncore.local" },
    update: {},
    create: {
      name: "Nurse A. Okafor", email: "medical@prisoncore.local",
      password: await bcrypt.hash("Medical@1234", 10),
      role: "MEDICAL", badgeNumber: "MED-004", shift: "DAY",
    },
  });

  await prisma.user.upsert({
    where: { email: "legal@prisoncore.local" },
    update: {},
    create: {
      name: "Legal Officer K. Asante", email: "legal@prisoncore.local",
      password: await bcrypt.hash("Legal@1234", 10),
      role: "LEGAL", badgeNumber: "LGL-001", shift: "DAY",
    },
  });

  await prisma.user.upsert({
    where: { email: "inventory@prisoncore.local" },
    update: {},
    create: {
      name: "Stores Officer B. Mutua", email: "inventory@prisoncore.local",
      password: await bcrypt.hash("Inventory@1234", 10),
      role: "INVENTORY", badgeNumber: "INV-001", shift: "DAY",
    },
  });

  // ── Prisoners ────────────────────────────────────────────────────────────────
  const p1 = await prisma.prisoner.upsert({
    where: { prisonerId: "P-001" },
    update: {},
    create: {
      prisonerId: "P-001", name: "Marcus J. Thornton", age: 34,
      crime: "Armed Robbery", sentence: "8 years",
      cellBlock: "A", cell: "A-12",
      riskLevel: "HIGH", fingerprint: "FP-7731A",
      entryDate: new Date("2021-03-15"),
      releaseDate: new Date("2029-03-15"),
    },
  });

  const p2 = await prisma.prisoner.upsert({
    where: { prisonerId: "P-002" },
    update: {},
    create: {
      prisonerId: "P-002", name: "Devon R. Wallace", age: 29,
      crime: "Drug Trafficking", sentence: "5 years",
      cellBlock: "B", cell: "B-04",
      riskLevel: "MEDIUM", fingerprint: "FP-4432B",
      entryDate: new Date("2022-07-01"),
      releaseDate: new Date("2027-07-01"),
    },
  });

  const p3 = await prisma.prisoner.upsert({
    where: { prisonerId: "P-003" },
    update: {},
    create: {
      prisonerId: "P-003", name: "Sofia M. Reyes", age: 41,
      crime: "Fraud", sentence: "3 years",
      cellBlock: "C", cell: "C-08",
      riskLevel: "LOW", fingerprint: "FP-9901C",
      entryDate: new Date("2023-01-20"),
      releaseDate: new Date("2026-01-20"),
    },
  });

  // ── Incidents ────────────────────────────────────────────────────────────────
  await prisma.incident.upsert({
    where: { incidentId: "INC-001" },
    update: {},
    create: {
      incidentId: "INC-001", type: "Contraband",
      description: "Found unauthorized items during cell check.",
      severity: "HIGH", location: "Block A",
      resolved: true, resolvedAt: new Date("2024-11-05"),
      prisonerId: p1.id, userId: warden.id,
    },
  });

  await prisma.incident.upsert({
    where: { incidentId: "INC-002" },
    update: {},
    create: {
      incidentId: "INC-002", type: "Medical Emergency",
      description: "Prisoner reported chest pain.",
      severity: "HIGH", location: "Block C",
      resolved: false,
      prisonerId: p3.id, userId: guard.id,
    },
  });

  // ── Alerts (skip if already exist) ───────────────────────────────────────────
  const existingAlert = await prisma.alert.findFirst({ where: { prisonerId: p1.id } });
  if (!existingAlert) {
    await prisma.alert.create({
      data: { message: "Violation: Contraband found 2024-11", severity: "HIGH", prisonerId: p1.id },
    });
  }

  // ── Sample Inventory Items ────────────────────────────────────────────────────
  const invItems = [
    { itemCode: "INV-FOO-0001", name: "Prison Rations (Daily)", category: "FOOD", unit: "kg", currentStock: 450, minimumStock: 100, maximumStock: 1000, unitCost: 2.5, location: "Kitchen Store" },
    { itemCode: "INV-UNI-0001", name: "Prison Uniforms", category: "UNIFORM", unit: "units", currentStock: 80, minimumStock: 50, maximumStock: 300, unitCost: 15, location: "Stores Room A" },
    { itemCode: "INV-MED-0001", name: "Paracetamol 500mg", category: "MEDICAL", unit: "tablets", currentStock: 1200, minimumStock: 200, maximumStock: 5000, unitCost: 0.05, location: "Medical Store" },
    { itemCode: "INV-ARM-0001", name: "Duty Batons", category: "ARMORY", unit: "units", currentStock: 24, minimumStock: 20, maximumStock: 60, unitCost: 45, location: "Armory Vault", isRestricted: true },
    { itemCode: "INV-MAI-0001", name: "Cell Padlocks", category: "MAINTENANCE", unit: "units", currentStock: 8, minimumStock: 15, maximumStock: 100, unitCost: 12, location: "Maintenance Store" },
    { itemCode: "INV-OFF-0001", name: "A4 Paper Reams", category: "OFFICE", unit: "reams", currentStock: 30, minimumStock: 10, maximumStock: 100, unitCost: 6, location: "Admin Office" },
  ];

  for (const inv of invItems) {
    await prisma.inventoryItem.upsert({
      where: { itemCode: inv.itemCode },
      update: {},
      create: inv,
    });
  }

  console.log("✅ Seed complete!");
  console.log("   Warden    → warden@prisoncore.local    / Warden@1234");
  console.log("   Guard     → guard@prisoncore.local     / Guard@1234");
  console.log("   Medical   → medical@prisoncore.local   / Medical@1234");
  console.log("   Legal     → legal@prisoncore.local     / Legal@1234");
  console.log("   Inventory → inventory@prisoncore.local / Inventory@1234");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

  // ── Industries ───────────────────────────────────────────────────────────────
  const industries = [
    { name: "Luzira Farm Unit",       category: "FARMING",   supervisor: "Sgt. Okello B.", description: "Crop farming — maize, beans, cassava" },
    { name: "Woodwork & Carpentry",   category: "CARPENTRY", supervisor: "Sgt. Nassaka R.", description: "Furniture making and wood products" },
    { name: "Tailoring & Uniforms",   category: "TAILORING", supervisor: "Sgt. Apio M.",    description: "Prison uniform production and repairs" },
    { name: "Prison Bakery",          category: "BAKERY",    supervisor: "Sgt. Wamala J.",  description: "Daily bread and pastry production" },
  ];

  const industryRecords = [];
  for (const ind of industries) {
    const existing = await prisma.industry.findUnique({ where: { name: ind.name } });
    if (!existing) {
      const created = await prisma.industry.create({ data: ind });
      industryRecords.push(created);
    } else {
      industryRecords.push(existing);
    }
  }

  // Enroll prisoners in industries
  if (industryRecords.length > 0) {
    const enrollments = [
      { prisonerId: p1.id, industryId: industryRecords[0].id, startDate: new Date("2022-01-10") },
      { prisonerId: p2.id, industryId: industryRecords[1].id, startDate: new Date("2022-09-01") },
      { prisonerId: p3.id, industryId: industryRecords[2].id, startDate: new Date("2023-03-01") },
    ];
    for (const enr of enrollments) {
      const exists = await prisma.industryEnrollment.findFirst({
        where: { prisonerId: enr.prisonerId, industryId: enr.industryId, status: "ACTIVE" },
      });
      if (!exists) await prisma.industryEnrollment.create({ data: enr });
    }

    // Sample production logs
    const prods = [
      { industryId: industryRecords[0].id, date: new Date("2024-11-01"), quantity: 120, unit: "kg", valueUGX: 240000, recordedBy: warden.id },
      { industryId: industryRecords[1].id, date: new Date("2024-11-01"), quantity: 4,   unit: "chairs", valueUGX: 320000, recordedBy: warden.id },
      { industryId: industryRecords[3].id, date: new Date("2024-11-01"), quantity: 200, unit: "loaves", valueUGX: 100000, recordedBy: warden.id },
    ];
    for (const prod of prods) {
      const exists = await prisma.industryProduction.findFirst({
        where: { industryId: prod.industryId, date: prod.date },
      });
      if (!exists) await prisma.industryProduction.create({ data: prod });
    }
  }
