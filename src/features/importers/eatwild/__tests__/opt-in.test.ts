import { describe, expect, it, vi } from "vitest";
import { runEatwildImport } from "../adapter";

describe("Eatwild importer safeguards", () => {
  it("fails safely when opt-in is missing", async () => {
    const prisma = {} as never;
    vi.stubEnv("EATWILD_IMPORT_ENABLED", "false");

    const summary = await runEatwildImport(prisma, { state: "VA", dryRun: true });

    expect(summary.blocked).toMatch(/disabled/i);
    vi.unstubAllEnvs();
  });

  it("requires confirmation for national imports", async () => {
    const prisma = {} as never;
    vi.stubEnv("EATWILD_IMPORT_ENABLED", "true");

    const summary = await runEatwildImport(prisma, { allStates: true, dryRun: true });

    expect(summary.blocked).toMatch(/confirm-national-import/i);
    vi.unstubAllEnvs();
  });
});
