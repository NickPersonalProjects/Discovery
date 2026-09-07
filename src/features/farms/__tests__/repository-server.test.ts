import { describe, expect, it, vi } from "vitest";
import { getServerFarmRepository } from "../repository-server";

describe("repository server configuration", () => {
  it("returns a helpful database-unavailable message when DATABASE_URL is missing", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("LOCAL_DEMO_SEED_ENABLED", "");
    const repository = getServerFarmRepository();

    const result = await repository.search({ query: "22902" });

    expect(result.error?.code).toBe("DATABASE_UNAVAILABLE");
    vi.unstubAllEnvs();
  });
});
