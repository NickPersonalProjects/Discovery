import { seedFarms } from "./seed-farms";
import { findFarmBySlug, searchFarms } from "./search";
import type { FarmSearchParams } from "./types";

export const farmRepository = {
  search(params: FarmSearchParams) {
    return searchFarms(params, seedFarms);
  },
  findBySlug(slug: string) {
    return findFarmBySlug(slug, seedFarms);
  },
  listPublished() {
    return seedFarms.filter((farm) => farm.publicationStatus === "published");
  },
};
