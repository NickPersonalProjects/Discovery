import { describe, expect, it } from "vitest";
import { mapEatwildKeywordToCategory } from "../eatwild-taxonomy";

describe("Eatwild taxonomy mapping", () => {
  it("maps common product keywords", () => {
    expect(mapEatwildKeywordToCategory("grass-fed beef")).toBe("meat");
    expect(mapEatwildKeywordToCategory("wildflower honey jars")).toBe("honey");
    expect(mapEatwildKeywordToCategory("artisan bread")).toBe("prepared-foods");
  });

  it("returns undefined for unknown keyword", () => {
    expect(mapEatwildKeywordToCategory("alpaca fiber")).toBeUndefined();
  });
});
