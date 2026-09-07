import { seedFarms } from "./seed-farms";
import type { Coordinates, Farm, FarmSearchParams, FarmSearchResult } from "./types";

const EARTH_RADIUS_MILES = 3958.8;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function calculateDistanceMiles(from: Coordinates, to: Coordinates) {
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_MILES * c;
}

export function findFarmBySlug(slug: string, farms: Farm[] = seedFarms) {
  return farms.find((farm) => farm.slug === slug && farm.publicationStatus === "published");
}

export function resolveSearchCenter(query: string | undefined, farms: Farm[]): Coordinates | undefined {
  const normalizedQuery = query?.trim().toLowerCase();
  if (!normalizedQuery) {
    return undefined;
  }

  const exactLocation = farms.find((farm) => {
    const address = farm.address;
    return (
      address.postalCode === normalizedQuery ||
      address.city.toLowerCase() === normalizedQuery ||
      `${address.city}, ${address.state}`.toLowerCase() === normalizedQuery
    );
  });

  return exactLocation?.coordinates;
}

function matchesQuery(farm: Farm, query: string | undefined, hasCenter: boolean) {
  const normalizedQuery = query?.trim().toLowerCase();
  if (!normalizedQuery || hasCenter) {
    return true;
  }

  const searchableText = [
    farm.name,
    farm.description,
    farm.address.city,
    farm.address.state,
    farm.address.postalCode,
    ...farm.products.flatMap((product) => [product.name, product.details, product.category]),
  ]
    .join(" ")
    .toLowerCase();

  return searchableText.includes(normalizedQuery);
}

function matchesCategories(farm: Farm, categories: FarmSearchParams["categories"]) {
  if (!categories?.length) {
    return true;
  }

  return farm.products.some((product) => categories.includes(product.category));
}

export function searchFarms(params: FarmSearchParams, farms: Farm[] = seedFarms): FarmSearchResult[] {
  const publishedFarms = farms.filter((farm) => farm.publicationStatus === "published");
  const center = params.userLocation ?? resolveSearchCenter(params.query, publishedFarms);
  const radiusMiles = params.radiusMiles ?? 50;

  return publishedFarms
    .filter((farm) => matchesQuery(farm, params.query, Boolean(center)))
    .filter((farm) => matchesCategories(farm, params.categories))
    .map((farm) => ({
      farm,
      distanceMiles: center ? calculateDistanceMiles(center, farm.coordinates) : undefined,
    }))
    .filter((result) => result.distanceMiles === undefined || result.distanceMiles <= radiusMiles)
    .sort((left, right) => {
      if (left.distanceMiles !== undefined && right.distanceMiles !== undefined) {
        return left.distanceMiles - right.distanceMiles;
      }

      return left.farm.name.localeCompare(right.farm.name);
    });
}
