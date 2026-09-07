import "server-only";
import { PrismaClient } from "@prisma/client";

declare global {
  var __discoveryPrismaClient: PrismaClient | undefined;
}

export const prisma =
  globalThis.__discoveryPrismaClient ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__discoveryPrismaClient = prisma;
}
