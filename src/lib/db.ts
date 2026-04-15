import { PrismaClient } from "@prisma/client";

declare global {
  var __apexPrisma__: PrismaClient | undefined;
}

export const db =
  globalThis.__apexPrisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__apexPrisma__ = db;
}
