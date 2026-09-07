import { describe, expect, it } from "vitest";
import { seedFarms } from "../seed-farms";
import { calculateDistanceMiles, resolveSearchCenter, searchFarms } from "../search";

const lancaster = { latitude: 40.0379, longitude: -76.3055 };

describe("farm search", () => {
  it("finds a center from supported city and ZIP searches", () => {
    expect(resolveSearchCenter("Lancaster", seedFarms)).toEqual(lancaster);
    expect(resolveSearchCenter("17602", seedFarms)).toEqual(lancaster);
  });

  it("filters by radius and sorts by distance", () => {
    const results = searchFarms({ query: "Lancaster", radiusMiles: 25 });

    expect(results).toHaveLength(1);
    expect(results[0]?.farm.slug).toBe("green-valley-pastures");
    expect(results[0]?.distanceMiles).toBeLessThan(1);
  });

  it("filters by product category", () => {
    const results = searchFarms({ categories: ["dairy"] });

    expect(results.map((result) => result.farm.slug)).toEqual(["riverbend-creamery"]);
  });

  it("calculates a plausible haversine distance", () => {
    const madison = { latitude: 43.0748, longitude: -89.3838 };

    expect(calculateDistanceMiles(lancaster, madison)).toBeGreaterThan(700);
    expect(calculateDistanceMiles(lancaster, madison)).toBeLessThan(850);
  });
});
