import "server-only";
import { PrismaClient, PublicationStatus, VerificationStatus, ClaimStatus, Availability } from "@prisma/client";
import { createHash } from "node:crypto";
import { findDuplicateCandidates } from "@/features/farms/duplicate-candidates";
import { mapEatwildKeywordToCategory } from "@/features/farms/eatwild-taxonomy";
import { canonicalizeUrl, extractDomain, normalizeName, normalizePhoneNumber } from "@/features/farms/normalization";
import { createSeedFarmRepository } from "@/features/farms/repository-seed";
import { normalizeUsState, US_STATE_ABBREVIATIONS } from "@/features/farms/us-states";
import { createConfiguredGeocoder } from "@/features/location/geocoder";
import { mapWithConcurrency, PoliteFetcher } from "./fetcher";
import { parseEatwildStateDirectoryIndex, parseEatwildStatePage } from "./parser";
import type { EatwildImportOptions, EatwildImportSummary, EatwildListingCandidate, EatwildStateDirectory } from "./types";

const EATWILD_DIRECTORY_INDEX = "https://www.eatwild.com/products/index.html";
const SOURCE_NAME = "Eatwild";
const SOURCE_USAGE_NOTES =
  "Imported from Eatwild by operator-authorized run. Operator is responsible for terms, robots directives, rate limits, and attribution requirements.";

function parseArgsStateFilter(options: EatwildImportOptions, discoveredStates: EatwildStateDirectory[]) {
  if (options.allStates) {
    return discoveredStates;
  }

  if (!options.state) {
    throw new Error("Provide --state=XX or --all-states.");
  }

  const normalized = normalizeUsState(options.state);
  if (!normalized) {
    throw new Error(`Unsupported state argument: ${options.state}`);
  }

  const match = discoveredStates.find((entry) => entry.state === normalized);
  if (!match) {
    throw new Error(`State page not found in Eatwild index for ${normalized}.`);
  }

  return [match];
}

function stableSourceId(candidate: EatwildListingCandidate) {
  return createHash("sha1")
    .update(`${candidate.sourceState}|${candidate.sourcePageUrl}|${candidate.sourceListingId}|${candidate.farmName}`)
    .digest("hex");
}

function shouldPublishCandidate(candidate: EatwildListingCandidate, hasCoordinates: boolean) {
  return Boolean(candidate.farmName && candidate.sourceState && hasCoordinates && (candidate.website || candidate.phone || candidate.locationText));
}

function parseLocationText(locationText: string | undefined) {
  if (!locationText) {
    return { street: "", city: "", postalCode: "" };
  }

  const parts = locationText.split(",").map((part) => part.trim());
  if (parts.length === 1) {
    return { street: "", city: parts[0], postalCode: "" };
  }

  const city = parts[0] ?? "";
  const street = parts.slice(0, -1).join(", ");
  const zipMatch = locationText.match(/\b\d{5}(?:-\d{4})?\b/);
  return {
    street,
    city,
    postalCode: zipMatch?.[0]?.slice(0, 5) ?? "",
  };
}

function parseSalesMethods(candidate: EatwildListingCandidate) {
  const methods = new Set<string>();
  if (candidate.pickupAvailable) {
    methods.add("PICKUP");
  }
  if (candidate.deliveryAvailable) {
    methods.add("DELIVERY");
  }
  if (candidate.shippingAvailable) {
    methods.add("SHIPPING");
  }
  if (!methods.size) {
    methods.add("FARM_STAND");
  }
  return [...methods] as Array<"PICKUP" | "DELIVERY" | "SHIPPING" | "FARM_STAND">;
}

function summarizeProductKeywords(candidate: EatwildListingCandidate) {
  const categories = new Set<string>();
  const rawLabels: string[] = [];

  candidate.productKeywords.forEach((keyword) => {
    const mapped = mapEatwildKeywordToCategory(keyword);
    if (mapped) {
      categories.add(mapped);
    } else {
      rawLabels.push(keyword);
    }
  });

  return {
    categories: [...categories],
    rawLabels,
  };
}

async function processCandidate(params: {
  prisma: PrismaClient;
  candidate: EatwildListingCandidate;
  dryRun: boolean;
  geocodeCache: Map<string, { latitude: number; longitude: number } | null>;
  geocoder: ReturnType<typeof createConfiguredGeocoder>;
  summary: EatwildImportSummary;
}) {
  const { prisma, candidate, dryRun, geocodeCache, geocoder, summary } = params;

  const geocodeKey = [candidate.locationText, candidate.sourceState].filter(Boolean).join("|");
  let coordinates = geocodeCache.get(geocodeKey);
  if (coordinates === undefined) {
    const resolved = geocoder && geocodeKey ? await geocoder.geocode(`${candidate.locationText}, ${candidate.sourceState}`) : undefined;
    coordinates = resolved ? { latitude: resolved.latitude, longitude: resolved.longitude } : null;
    geocodeCache.set(geocodeKey, coordinates);
  }

  const seedRepository = createSeedFarmRepository();
  const existingFarms = await seedRepository.listPublished();
  const duplicates = findDuplicateCandidates(existingFarms, {
    name: candidate.farmName,
    phone: candidate.phone,
    website: candidate.website,
    city: candidate.locationText,
    state: candidate.sourceState,
    coordinates: coordinates ?? undefined,
  });

  if (duplicates.length > 1 && duplicates[0]?.score === duplicates[1]?.score && duplicates[0].score >= 3) {
    summary.duplicateCandidates += 1;
    summary.skipped += 1;
    return;
  }

  const normalizedWebsite = canonicalizeUrl(candidate.website);
  const publicationStatus = shouldPublishCandidate(candidate, Boolean(coordinates))
    ? PublicationStatus.PUBLISHED
    : PublicationStatus.PENDING;

  const externalId = stableSourceId(candidate);
  const sourcePayload = {
    sourceName: SOURCE_NAME,
    sourceUrl: EATWILD_DIRECTORY_INDEX,
    sourcePageUrl: candidate.sourcePageUrl,
    externalId,
    parserConfidence: candidate.parserConfidence,
    parseWarnings: candidate.parseWarnings,
    rawMetadata: {
      rawProductLabels: candidate.rawProductLabels,
      listingId: candidate.sourceListingId,
      ...candidate.metadata,
    },
    usageNotes: SOURCE_USAGE_NOTES,
  };

  const locationParts = parseLocationText(candidate.locationText);
  const productSummary = summarizeProductKeywords(candidate);

  if (dryRun) {
    summary.inserted += 1;
    return;
  }

  const strongMatch = duplicates.find((candidateMatch) => candidateMatch.score >= 4);
  const farmId = strongMatch?.farmId;

  const farm = farmId
    ? await prisma.farm.update({
        where: { id: farmId },
        data: {
          verificationStatus: VerificationStatus.IMPORTED,
          publicationStatus,
          lastVerifiedAt: new Date(),
        },
      })
    : await prisma.farm.create({
        data: {
          slug: `${normalizeName(candidate.farmName).replace(/\s+/g, "-")}-${externalId.slice(0, 8)}`,
          name: candidate.farmName,
          normalizedName: normalizeName(candidate.farmName),
          description: "",
          street: locationParts.street,
          city: locationParts.city,
          state: candidate.sourceState,
          postalCode: locationParts.postalCode,
          country: "US",
          latitude: coordinates?.latitude,
          longitude: coordinates?.longitude,
          phone: candidate.phone,
          normalizedPhone: normalizePhoneNumber(candidate.phone),
          publicEmail: candidate.email,
          website: normalizedWebsite,
          normalizedDomain: extractDomain(normalizedWebsite),
          socialLinks: [],
          visitInfo: "",
          hours: "",
          seasonalAvailability: "",
          salesMethods: parseSalesMethods(candidate),
          claimStatus: ClaimStatus.UNCLAIMED,
          publicationStatus,
          verificationStatus: VerificationStatus.IMPORTED,
          lastVerifiedAt: new Date(),
          practiceClaims: {
            create: candidate.practiceClaims.map((claim) => ({
              label: "Source-provided practice claim",
              note: claim,
            })),
          },
          products: {
            create: productSummary.categories.map((categoryId) => ({
              categoryId,
              name: categoryId,
              details: productSummary.rawLabels.join(", "),
              availability: Availability.SEASONAL,
            })),
          },
        },
      });

  await prisma.sourceRecord.upsert({
    where: {
      sourceName_externalId: {
        sourceName: SOURCE_NAME,
        externalId,
      },
    },
    create: {
      ...sourcePayload,
      farmId: farm.id,
    },
    update: {
      farmId: farm.id,
      sourcePageUrl: sourcePayload.sourcePageUrl,
      parserConfidence: sourcePayload.parserConfidence,
      parseWarnings: sourcePayload.parseWarnings,
      rawMetadata: sourcePayload.rawMetadata,
      usageNotes: sourcePayload.usageNotes,
      lastCheckedAt: new Date(),
    },
  });

  if (farmId) {
    summary.updated += 1;
  } else {
    summary.inserted += 1;
  }
}

export async function runEatwildImport(prisma: PrismaClient, options: EatwildImportOptions): Promise<EatwildImportSummary> {
  const summary: EatwildImportSummary = {
    pagesFetched: 0,
    listingsParsed: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    duplicateCandidates: 0,
    parseWarnings: 0,
    failures: 0,
  };

  if (process.env.EATWILD_IMPORT_ENABLED !== "true") {
    return {
      ...summary,
      blocked:
        "Eatwild import is disabled. Set EATWILD_IMPORT_ENABLED=true after confirming permission, robots directives, attribution, and rate limits.",
    };
  }

  if (options.allStates && !options.confirmNationalImport) {
    return {
      ...summary,
      blocked: "Nationwide import requires --confirm-national-import.",
    };
  }

  const userAgent = process.env.EATWILD_IMPORT_USER_AGENT?.trim();
  if (!userAgent) {
    throw new Error("EATWILD_IMPORT_USER_AGENT is required for polite fetching and operator contact.");
  }

  const fetcher = new PoliteFetcher({
    userAgent,
    minDelayMs: Number(process.env.EATWILD_IMPORT_THROTTLE_MS ?? 1200),
    timeoutMs: Number(process.env.EATWILD_IMPORT_TIMEOUT_MS ?? 20000),
    maxRetries: Number(process.env.EATWILD_IMPORT_MAX_RETRIES ?? 2),
    retryBackoffMs: Number(process.env.EATWILD_IMPORT_RETRY_BACKOFF_MS ?? 1000),
  });

  const indexHtml = await fetcher.fetchText(EATWILD_DIRECTORY_INDEX);
  summary.pagesFetched += 1;
  const discoveredStates = parseEatwildStateDirectoryIndex(indexHtml, EATWILD_DIRECTORY_INDEX).filter((entry) =>
    US_STATE_ABBREVIATIONS.has(entry.state),
  );

  const statePages = parseArgsStateFilter(options, discoveredStates);
  const geocoder = createConfiguredGeocoder();
  const geocodeCache = new Map<string, { latitude: number; longitude: number } | null>();

  const parsedListingsByState = await mapWithConcurrency(
    statePages,
    Number(process.env.EATWILD_IMPORT_MAX_CONCURRENCY ?? 2),
    async (stateEntry) => {
      const html = await fetcher.fetchText(stateEntry.url);
      summary.pagesFetched += 1;
      return parseEatwildStatePage(html, {
        state: stateEntry.state,
        sourcePageUrl: stateEntry.url,
      });
    },
  );

  for (const stateCandidates of parsedListingsByState) {
    for (const candidate of stateCandidates) {
      summary.listingsParsed += 1;
      summary.parseWarnings += candidate.parseWarnings.length;

      try {
        await processCandidate({
          prisma,
          candidate,
          dryRun: Boolean(options.dryRun),
          geocoder,
          geocodeCache,
          summary,
        });
      } catch {
        summary.failures += 1;
      }
    }
  }

  return summary;
}
