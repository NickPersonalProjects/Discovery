import { searchFarms } from "./search";
import { seedFarms } from "./seed-farms";
import type { Farm } from "./types";
import type { FarmRepository, FarmSearchRequest, FarmSearchResponse } from "./repository-types";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

function paginateResults(results: ReturnType<typeof searchFarms>, page: number, limit: number): FarmSearchResponse {
  const start = (page - 1) * limit;
  return {
    results: results.slice(start, start + limit),
    total: results.length,
    page,
    limit,
  };
}

export function createSeedFarmRepository(farms: Farm[] = seedFarms): FarmRepository {
  return {
    async search(params: FarmSearchRequest) {
      const page = Math.max(params.page ?? 1, 1);
      const limit = Math.min(Math.max(params.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
      const results = searchFarms(params, farms);
      return paginateResults(results, page, limit);
    },
    async findBySlug(slug: string) {
      return farms.find((farm) => farm.slug === slug && farm.publicationStatus === "published");
    },
    async listPublished() {
      return farms.filter((farm) => farm.publicationStatus === "published");
    },
    async health() {
      return {
        ok: true,
        message: "Using deterministic local demo seed repository.",
      };
    },
  };
}
