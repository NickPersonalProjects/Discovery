import "server-only";
import { normalizeUsState } from "@/features/farms/us-states";
import { normalizeZipCode } from "@/features/farms/normalization";

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

export interface Geocoder {
  geocode(query: string): Promise<GeocodeResult | undefined>;
}

class NominatimGeocoder implements Geocoder {
  private readonly userAgent: string;

  constructor(userAgent: string) {
    this.userAgent = userAgent;
  }

  async geocode(query: string): Promise<GeocodeResult | undefined> {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=us&limit=1&q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": this.userAgent,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return undefined;
    }

    const payload = (await response.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    const first = payload[0];
    if (!first) {
      return undefined;
    }

    return {
      latitude: Number(first.lat),
      longitude: Number(first.lon),
      displayName: first.display_name,
    };
  }
}

export function looksLikeUsLocationQuery(query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) {
    return false;
  }

  if (Boolean(normalizeZipCode(trimmed))) {
    return true;
  }

  const commaParts = trimmed.split(",").map((part) => part.trim());
  if (commaParts.length >= 2 && normalizeUsState(commaParts[commaParts.length - 1])) {
    return true;
  }

  const words = trimmed.split(/\s+/);
  const tail = words.slice(-2).join(" ");
  return Boolean(normalizeUsState(words[words.length - 1]) ?? normalizeUsState(tail));
}

export function createConfiguredGeocoder(): Geocoder | undefined {
  const provider = process.env.GEOCODER_PROVIDER?.trim().toLowerCase();
  if (!provider) {
    return undefined;
  }

  if (provider === "nominatim") {
    const userAgent = process.env.GEOCODER_USER_AGENT?.trim();
    if (!userAgent) {
      throw new Error("GEOCODER_USER_AGENT is required when GEOCODER_PROVIDER=nominatim.");
    }

    return new NominatimGeocoder(userAgent);
  }

  throw new Error(`Unsupported geocoder provider: ${provider}`);
}
