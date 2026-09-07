import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseEatwildStateDirectoryIndex, parseEatwildStatePage } from "../parser";

const fixturePath = (name: string) => `${process.cwd()}/src/features/importers/eatwild/__fixtures__/${name}`;

describe("Eatwild parser", () => {
  it("discovers US state pages from the index", () => {
    const html = readFileSync(fixturePath("index.synthetic.html"), "utf8");
    const states = parseEatwildStateDirectoryIndex(html, "https://www.eatwild.com/products/index.html");

    expect(states.map((state) => state.state)).toEqual(["DC", "VA"]);
  });

  it("parses state listings into structured candidates", () => {
    const html = readFileSync(fixturePath("state.synthetic.html"), "utf8");
    const listings = parseEatwildStatePage(html, {
      state: "VA",
      sourcePageUrl: "https://www.eatwild.com/products/virginia.html",
    });

    expect(listings).toHaveLength(2);
    expect(listings[0]?.farmName).toBe("Blue Ridge Family Farm");
    expect(listings[0]?.productKeywords).toContain("grass-fed beef");
    expect(listings[0]?.pickupAvailable).toBe(true);
  });
});
