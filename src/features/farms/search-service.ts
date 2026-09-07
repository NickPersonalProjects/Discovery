import "server-only";
import type { FarmRepository, FarmSearchRequest, FarmSearchResponse } from "./repository-types";
import { createConfiguredGeocoder, looksLikeUsLocationQuery } from "@/features/location/geocoder";

export async function searchFarmsWithLocationSupport(
  repository: FarmRepository,
  request: FarmSearchRequest,
): Promise<FarmSearchResponse> {
  if (request.userLocation || !request.query?.trim()) {
    return repository.search(request);
  }

  if (!looksLikeUsLocationQuery(request.query)) {
    return repository.search(request);
  }

  let geocoder;
  try {
    geocoder = createConfiguredGeocoder();
  } catch (error) {
    return {
      results: [],
      total: 0,
      page: Math.max(request.page ?? 1, 1),
      limit: request.limit ?? 25,
      error: {
        code: "GEOCODER_UNAVAILABLE",
        message: error instanceof Error ? error.message : "Geocoder configuration is invalid.",
      },
    };
  }

  if (!geocoder) {
    return {
      results: [],
      total: 0,
      page: Math.max(request.page ?? 1, 1),
      limit: request.limit ?? 25,
      error: {
        code: "GEOCODER_UNAVAILABLE",
        message:
          "Text location search requires a configured geocoder. Set GEOCODER_PROVIDER and GEOCODER_USER_AGENT.",
      },
    };
  }

  const resolved = await geocoder.geocode(request.query);
  if (!resolved) {
    return {
      results: [],
      total: 0,
      page: Math.max(request.page ?? 1, 1),
      limit: request.limit ?? 25,
    };
  }

  return repository.search({
    ...request,
    userLocation: {
      latitude: resolved.latitude,
      longitude: resolved.longitude,
    },
  });
}
