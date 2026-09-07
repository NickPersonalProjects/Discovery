import "server-only";
import type { FarmRepository } from "./repository-types";
import { createSeedFarmRepository } from "./repository-seed";
import { createPrismaFarmRepository } from "./repository-prisma";
import { prisma } from "@/server/db/prisma";

function createUnavailableRepository(message: string): FarmRepository {
  return {
    async search(params) {
      return {
        results: [],
        total: 0,
        page: Math.max(params.page ?? 1, 1),
        limit: params.limit ?? 25,
        error: {
          code: "DATABASE_UNAVAILABLE",
          message,
        },
      };
    },
    async findBySlug() {
      return undefined;
    },
    async listPublished() {
      return [];
    },
    async health() {
      return { ok: false, message };
    },
  };
}

export function getServerFarmRepository(): FarmRepository {
  if (process.env.LOCAL_DEMO_SEED_ENABLED === "true") {
    return createSeedFarmRepository();
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return createUnavailableRepository(
      "DATABASE_URL is not configured. Configure PostgreSQL/PostGIS or set LOCAL_DEMO_SEED_ENABLED=true for local demo mode.",
    );
  }

  return createPrismaFarmRepository(prisma);
}
