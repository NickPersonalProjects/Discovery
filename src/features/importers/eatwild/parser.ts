import { normalizeUsState } from "@/features/farms/us-states";
import type { EatwildListingCandidate, EatwildStateDirectory } from "./types";

const LINK_PATTERN = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

function stripTags(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function toAbsoluteUrl(href: string, baseUrl: string): string {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
}

export function parseEatwildStateDirectoryIndex(html: string, baseUrl: string): EatwildStateDirectory[] {
  const states = new Map<string, EatwildStateDirectory>();

  for (const match of html.matchAll(LINK_PATTERN)) {
    const href = match[1];
    const label = stripTags(match[2] ?? "");
    const state = normalizeUsState(label);
    if (!state) {
      continue;
    }

    states.set(state, {
      state,
      url: toAbsoluteUrl(href, baseUrl),
    });
  }

  return [...states.values()].sort((left, right) => left.state.localeCompare(right.state));
}

function splitListings(html: string): string[] {
  const explicitBlocks = html.match(/<div[^>]*class=["'][^"']*listing[^"']*["'][^>]*>[\s\S]*?<\/div>/gi);
  if (explicitBlocks?.length) {
    return explicitBlocks;
  }

  const h3Segments = html.split(/<h3[^>]*>/i);
  return h3Segments.slice(1).map((segment) => `<h3>${segment}`);
}

function extractField(blockText: string, label: string): string | undefined {
  const pattern = new RegExp(`${label}\\s*[:\\-]\\s*([^\\n|]+)`, "i");
  const match = blockText.match(pattern);
  return match?.[1]?.trim();
}

function extractWebsite(blockHtml: string): string | undefined {
  const match = blockHtml.match(/https?:\/\/[^\s"'<>]+/i);
  return match?.[0];
}

function extractEmail(blockText: string): string | undefined {
  const match = blockText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0];
}

function extractPhone(blockText: string): string | undefined {
  const match = blockText.match(/(?:\+?1[\s.-]*)?\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}/);
  return match?.[0];
}

function extractProducts(blockText: string): string[] {
  const productLine = extractField(blockText, "Products") ?? extractField(blockText, "Product") ?? "";
  return productLine
    .split(/[,;/]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractPracticeClaims(blockText: string): string[] {
  const source = extractField(blockText, "Practices") ?? extractField(blockText, "Practice") ?? "";
  return source
    .split(/[,;/]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseEatwildStatePage(html: string, input: { state: string; sourcePageUrl: string }): EatwildListingCandidate[] {
  const candidates: EatwildListingCandidate[] = [];
  const listings = splitListings(html);

  listings.forEach((listingHtml, index) => {
    const text = stripTags(listingHtml);
    const farmNameMatch = listingHtml.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
    const farmName = stripTags(farmNameMatch?.[1] ?? text.split(/[|\n]/)[0] ?? "");
    if (!farmName) {
      return;
    }

    const products = extractProducts(text);
    const practices = extractPracticeClaims(text);
    const website = extractWebsite(listingHtml);
    const phone = extractPhone(text);
    const email = extractEmail(text);
    const locationText = extractField(text, "Address") ?? extractField(text, "Location") ?? extractField(text, "City");
    const lowerText = text.toLowerCase();

    const warnings: string[] = [];
    if (!phone && !website && !email) {
      warnings.push("missing_contact");
    }
    if (!products.length) {
      warnings.push("missing_products");
    }

    const parsedState = normalizeUsState(input.state) ?? "";
    candidates.push({
      sourceState: parsedState,
      sourcePageUrl: input.sourcePageUrl,
      sourceListingId: `${parsedState}-${index}-${farmName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      farmName,
      locationText,
      phone,
      email,
      website,
      productKeywords: products,
      rawProductLabels: products,
      shippingAvailable: lowerText.includes("ship"),
      deliveryAvailable: lowerText.includes("delivery"),
      pickupAvailable: lowerText.includes("pickup") || lowerText.includes("farm stand"),
      practiceClaims: practices,
      parserConfidence: Math.max(1, 5 - warnings.length),
      parseWarnings: warnings,
      metadata: {
        parser: "eatwild-state-page-v1",
      },
    });
  });

  return candidates;
}
