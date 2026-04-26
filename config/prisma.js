// src/config/prisma.js
// Single shared Prisma client instance used across the whole app

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" 
    ? ["query", "error", "warn"] 
    : ["error"],
});

export default prisma;
