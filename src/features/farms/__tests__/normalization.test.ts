import { describe, expect, it } from "vitest";
import { canonicalizeUrl, extractDomain, normalizePhoneNumber, normalizeStateAndZip, normalizeZipCode } from "../normalization";

describe("normalization", () => {
  it("normalizes ZIP codes and state abbreviations", () => {
    expect(normalizeZipCode("22902-1234")).toBe("22902");
    expect(normalizeStateAndZip({ state: "Virginia", postalCode: "22902-0001" })).toEqual({
      state: "VA",
      postalCode: "22902",
    });
  });

  it("normalizes US phone numbers", () => {
    expect(normalizePhoneNumber("+1 (434) 555-0101")).toBe("4345550101");
    expect(normalizePhoneNumber("555-123")).toBeUndefined();
  });

  it("canonicalizes URLs and domains", () => {
    expect(canonicalizeUrl("www.Example.com/path/")).toBe("https://example.com/path");
    expect(extractDomain("https://www.example.com")).toBe("example.com");
  });
});
