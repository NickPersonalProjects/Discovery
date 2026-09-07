import type { Farm } from "./types";
import { calculateDistanceMiles } from "./search";
import { extractDomain, normalizeName, normalizePhoneNumber } from "./normalization";

export interface DuplicateCandidateInput {
  name?: string;
  phone?: string;
  website?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  coordinates?: { latitude: number; longitude: number };
}

export interface DuplicateCandidate {
  farmId: string;
  slug: string;
  score: number;
  reasons: string[];
}

function normalizeAddress(value: DuplicateCandidateInput) {
  return `${value.street ?? ""} ${value.city ?? ""} ${value.state ?? ""} ${value.postalCode ?? ""}`
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function findDuplicateCandidates(existingFarms: Farm[], incoming: DuplicateCandidateInput): DuplicateCandidate[] {
  const incomingName = normalizeName(incoming.name ?? "");
  const incomingPhone = normalizePhoneNumber(incoming.phone);
  const incomingDomain = extractDomain(incoming.website);
  const incomingAddress = normalizeAddress(incoming);

  return existingFarms
    .map((farm) => {
      let score = 0;
      const reasons: string[] = [];

      if (normalizeName(farm.name) === incomingName) {
        score += 3;
        reasons.push("normalized-name");
      }

      if (incomingPhone && normalizePhoneNumber(farm.phone) === incomingPhone) {
        score += 3;
        reasons.push("phone");
      }

      if (incomingDomain && extractDomain(farm.website) === incomingDomain) {
        score += 3;
        reasons.push("domain");
      }

      const farmAddress = normalizeAddress({
        street: farm.address.street,
        city: farm.address.city,
        state: farm.address.state,
        postalCode: farm.address.postalCode,
      });
      if (incomingAddress && incomingAddress === farmAddress) {
        score += 2;
        reasons.push("address");
      }

      if (incoming.coordinates && farm.coordinates) {
        const distance = calculateDistanceMiles(incoming.coordinates, farm.coordinates);
        if (distance <= 1) {
          score += 2;
          reasons.push("nearby-coordinates");
        }
      }

      return score > 0
        ? {
            farmId: farm.id,
            slug: farm.slug,
            score,
            reasons,
          }
        : undefined;
    })
    .filter((candidate): candidate is DuplicateCandidate => Boolean(candidate))
    .sort((left, right) => right.score - left.score);
}
