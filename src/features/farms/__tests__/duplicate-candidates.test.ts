import { describe, expect, it } from "vitest";
import { seedFarms } from "../seed-farms";
import { findDuplicateCandidates } from "../duplicate-candidates";

describe("duplicate candidate detection", () => {
  it("scores duplicates by normalized name + phone/domain", () => {
    const candidates = findDuplicateCandidates(seedFarms, {
      name: "Green Valley Pastures",
      phone: "(555)010-1701",
      website: "https://www.greenvalley.example",
    });

    expect(candidates[0]?.slug).toBe("green-valley-pastures");
    expect(candidates[0]?.reasons).toContain("normalized-name");
    expect(candidates[0]?.reasons).toContain("phone");
  });
});
