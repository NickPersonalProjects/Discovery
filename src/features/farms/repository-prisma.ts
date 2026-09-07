import "server-only";
import { Availability, ClaimStatus, Prisma, PrismaClient, PublicationStatus, SalesMethod, VerificationStatus } from "@prisma/client";
import type { Farm, ProductCategory } from "./types";
import type { FarmRepository, FarmSearchRequest, FarmSearchResponse } from "./repository-types";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

function toPrismaSalesMethod(method: string): SalesMethod {
  switch (method) {
    case "farm-stand":
      return SalesMethod.FARM_STAND;
    case "farmers-market":
      return SalesMethod.FARMERS_MARKET;
    case "csa":
      return SalesMethod.CSA;
    case "pickup":
      return SalesMethod.PICKUP;
    case "delivery":
      return SalesMethod.DELIVERY;
    default:
      return SalesMethod.SHIPPING;
  }
}

function fromPrismaSalesMethod(method: SalesMethod): Farm["salesMethods"][number] {
  switch (method) {
    case SalesMethod.FARM_STAND:
      return "farm-stand";
    case SalesMethod.FARMERS_MARKET:
      return "farmers-market";
    case SalesMethod.CSA:
      return "csa";
    case SalesMethod.PICKUP:
      return "pickup";
    case SalesMethod.DELIVERY:
      return "delivery";
    case SalesMethod.SHIPPING:
      return "shipping";
  }
}

function fromPrismaPublication(status: PublicationStatus): Farm["publicationStatus"] {
  switch (status) {
    case PublicationStatus.PUBLISHED:
      return "published";
    case PublicationStatus.PENDING:
      return "pending";
    case PublicationStatus.UNPUBLISHED:
      return "unpublished";
    case PublicationStatus.REJECTED:
      return "rejected";
  }
}

function fromPrismaClaimStatus(status: ClaimStatus): Farm["claimStatus"] {
  return status === ClaimStatus.OWNER_CLAIMED ? "owner-claimed" : "unclaimed";
}

function fromPrismaVerification(status: VerificationStatus): Farm["verificationStatus"] {
  switch (status) {
    case VerificationStatus.IMPORTED:
      return "imported";
    case VerificationStatus.COMMUNITY_SUBMITTED:
      return "community-submitted";
    case VerificationStatus.OWNER_CLAIMED:
      return "owner-claimed";
    case VerificationStatus.ADMIN_VERIFIED:
      return "admin-verified";
    case VerificationStatus.POSSIBLY_STALE:
      return "possibly-stale";
  }
}

function fromPrismaAvailability(availability: Availability): "year-round" | "seasonal" {
  return availability === Availability.YEAR_ROUND ? "year-round" : "seasonal";
}

const farmInclude = {
  products: {
    include: {
      category: true,
    },
  },
  practiceClaims: true,
  sourceRecords: true,
} satisfies Prisma.FarmInclude;

function mapFarm(record: Prisma.FarmGetPayload<{ include: typeof farmInclude }>): Farm {
  const latitude = record.latitude ? Number(record.latitude) : undefined;
  const longitude = record.longitude ? Number(record.longitude) : undefined;

  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    description: record.description,
    address: {
      street: record.street,
      city: record.city,
      state: record.state,
      postalCode: record.postalCode,
      country: "US",
    },
    coordinates: latitude !== undefined && longitude !== undefined ? { latitude, longitude } : undefined,
    phone: record.phone ?? undefined,
    email: record.publicEmail ?? undefined,
    website: record.website ?? undefined,
    socialLinks: Array.isArray(record.socialLinks) ? (record.socialLinks as Array<{ label: string; url: string }>) : [],
    visitInfo: record.visitInfo ?? "",
    hours: record.hours ?? "",
    seasonalAvailability: record.seasonalAvailability ?? "",
    products: record.products.map((product) => ({
      id: product.id,
      category: product.categoryId as ProductCategory,
      name: product.name,
      details: product.details ?? "",
      availability: fromPrismaAvailability(product.availability),
      season: product.season ?? undefined,
    })),
    salesMethods: record.salesMethods.map(fromPrismaSalesMethod),
    practiceClaims: record.practiceClaims.map((claim) => ({
      label: claim.label,
      note: claim.note,
      certificationUrl: claim.certificationUrl ?? undefined,
    })),
    claimStatus: fromPrismaClaimStatus(record.claimStatus),
    publicationStatus: fromPrismaPublication(record.publicationStatus),
    verificationStatus: fromPrismaVerification(record.verificationStatus),
    lastVerifiedAt: (record.lastVerifiedAt ?? record.updatedAt).toISOString(),
    sourceRecords: record.sourceRecords.map((source) => ({
      id: source.id,
      sourceName: source.sourceName,
      sourceUrl: source.sourceUrl ?? undefined,
      externalId: source.externalId,
      importedAt: source.importedAt.toISOString(),
      lastCheckedAt: (source.lastCheckedAt ?? source.importedAt).toISOString(),
      usageNotes: source.usageNotes,
      metadata: source.rawMetadata && typeof source.rawMetadata === "object" ? (source.rawMetadata as Record<string, string>) : {},
    })),
    isFictionalSeed: false,
  };
}

function baseWhere(categories?: ProductCategory[]) {
  const published = { publicationStatus: PublicationStatus.PUBLISHED };
  if (!categories?.length) {
    return published;
  }

  return {
    ...published,
    products: {
      some: {
        categoryId: {
          in: categories,
        },
      },
    },
  };
}

async function searchByRadius(prisma: PrismaClient, request: FarmSearchRequest): Promise<FarmSearchResponse> {
  const center = request.userLocation;
  if (!center) {
    throw new Error("searchByRadius requires a center point.");
  }

  const page = Math.max(request.page ?? 1, 1);
  const limit = Math.min(Math.max(request.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const radiusMiles = Math.max(request.radiusMiles ?? 50, 1);
  const radiusMeters = radiusMiles * 1609.344;
  const offset = (page - 1) * limit;
  const categoryFilters = request.categories?.length
    ? Prisma.sql`
      AND EXISTS (
        SELECT 1 FROM "FarmProduct" fp
        WHERE fp."farmId" = f."id"
        AND fp."categoryId" IN (${Prisma.join(request.categories)})
      )
    `
    : Prisma.empty;

  const rows = await prisma.$queryRaw<Array<{ id: string; distance_miles: number }>>`
    SELECT f."id", ST_DistanceSphere(
      f."coordinates",
      ST_SetSRID(ST_MakePoint(${center.longitude}, ${center.latitude}), 4326)
    ) / 1609.344 AS distance_miles
    FROM "Farm" f
    WHERE f."publicationStatus" = 'PUBLISHED'
      AND f."coordinates" IS NOT NULL
      AND ST_DWithin(
        f."coordinates"::geography,
        ST_SetSRID(ST_MakePoint(${center.longitude}, ${center.latitude}), 4326)::geography,
        ${radiusMeters}
      )
      ${categoryFilters}
    ORDER BY distance_miles ASC, f."name" ASC
    OFFSET ${offset}
    LIMIT ${limit}
  `;

  const [{ count }] = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "Farm" f
    WHERE f."publicationStatus" = 'PUBLISHED'
      AND f."coordinates" IS NOT NULL
      AND ST_DWithin(
        f."coordinates"::geography,
        ST_SetSRID(ST_MakePoint(${center.longitude}, ${center.latitude}), 4326)::geography,
        ${radiusMeters}
      )
      ${categoryFilters}
  `;

  if (!rows.length) {
    return { results: [], total: Number(count), page, limit };
  }

  const farms = await prisma.farm.findMany({
    where: {
      id: {
        in: rows.map((row) => row.id),
      },
    },
    include: farmInclude,
  });

  const order = new Map(rows.map((row, index) => [row.id, index]));
  const distances = new Map(rows.map((row) => [row.id, row.distance_miles]));
  const sorted = farms
    .sort((left, right) => (order.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(right.id) ?? Number.MAX_SAFE_INTEGER))
    .map((farm) => ({
      farm: mapFarm(farm),
      distanceMiles: distances.get(farm.id),
    }));

  return {
    results: sorted,
    total: Number(count),
    page,
    limit,
  };
}

async function searchByText(prisma: PrismaClient, request: FarmSearchRequest): Promise<FarmSearchResponse> {
  const page = Math.max(request.page ?? 1, 1);
  const limit = Math.min(Math.max(request.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const skip = (page - 1) * limit;
  const query = request.query?.trim();

  const where: Prisma.FarmWhereInput = {
    ...baseWhere(request.categories),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { city: { contains: query, mode: "insensitive" } },
            { state: { contains: query, mode: "insensitive" } },
            { postalCode: { contains: query, mode: "insensitive" } },
            {
              products: {
                some: {
                  name: { contains: query, mode: "insensitive" },
                },
              },
            },
          ],
        }
      : {}),
  };

  const [farms, total] = await Promise.all([
    prisma.farm.findMany({
      where,
      include: farmInclude,
      orderBy: [{ name: "asc" }],
      skip,
      take: limit,
    }),
    prisma.farm.count({ where }),
  ]);

  return {
    results: farms.map((farm) => ({ farm: mapFarm(farm) })),
    total,
    page,
    limit,
  };
}

export function createPrismaFarmRepository(prisma: PrismaClient): FarmRepository {
  return {
    async search(request) {
      if (request.userLocation) {
        return searchByRadius(prisma, request);
      }

      return searchByText(prisma, request);
    },
    async findBySlug(slug) {
      const farm = await prisma.farm.findFirst({
        where: {
          slug,
          publicationStatus: PublicationStatus.PUBLISHED,
        },
        include: farmInclude,
      });
      return farm ? mapFarm(farm) : undefined;
    },
    async listPublished() {
      const farms = await prisma.farm.findMany({
        where: {
          publicationStatus: PublicationStatus.PUBLISHED,
        },
        include: farmInclude,
        orderBy: { name: "asc" },
      });
      return farms.map(mapFarm);
    },
    async health() {
      try {
        await prisma.$queryRaw`SELECT 1`;
        return { ok: true, message: "Database connection is ready." };
      } catch (error) {
        return {
          ok: false,
          message:
            error instanceof Error
              ? `Database unavailable: ${error.message}`
              : "Database unavailable: unknown error.",
        };
      }
    },
  };
}

export { toPrismaSalesMethod };
