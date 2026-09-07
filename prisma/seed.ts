import { PrismaClient, Availability, ClaimStatus, PublicationStatus, VerificationStatus } from "@prisma/client";
import { PRODUCT_CATEGORIES } from "../src/features/farms/product-taxonomy";
import { seedFarms } from "../src/features/farms/seed-farms";
import { canonicalizeUrl, extractDomain, normalizeName, normalizePhoneNumber } from "../src/features/farms/normalization";
import { toPrismaSalesMethod } from "../src/features/farms/repository-prisma";

const prisma = new PrismaClient();

function toAvailability(value: "year-round" | "seasonal") {
  return value === "year-round" ? Availability.YEAR_ROUND : Availability.SEASONAL;
}

function toClaimStatus(value: "unclaimed" | "owner-claimed") {
  return value === "owner-claimed" ? ClaimStatus.OWNER_CLAIMED : ClaimStatus.UNCLAIMED;
}

function toPublicationStatus(value: "published" | "pending" | "unpublished" | "rejected") {
  switch (value) {
    case "published":
      return PublicationStatus.PUBLISHED;
    case "pending":
      return PublicationStatus.PENDING;
    case "unpublished":
      return PublicationStatus.UNPUBLISHED;
    case "rejected":
      return PublicationStatus.REJECTED;
  }
}

function toVerificationStatus(value: "imported" | "community-submitted" | "owner-claimed" | "admin-verified" | "possibly-stale") {
  switch (value) {
    case "imported":
      return VerificationStatus.IMPORTED;
    case "community-submitted":
      return VerificationStatus.COMMUNITY_SUBMITTED;
    case "owner-claimed":
      return VerificationStatus.OWNER_CLAIMED;
    case "admin-verified":
      return VerificationStatus.ADMIN_VERIFIED;
    case "possibly-stale":
      return VerificationStatus.POSSIBLY_STALE;
  }
}

async function main() {
  for (const category of PRODUCT_CATEGORIES) {
    await prisma.productCategory.upsert({
      where: { id: category.id },
      update: { label: category.label },
      create: { id: category.id, label: category.label },
    });
  }

  for (const farm of seedFarms) {
    const normalizedWebsite = canonicalizeUrl(farm.website);

    await prisma.farm.upsert({
      where: { slug: farm.slug },
      update: {
        name: farm.name,
        normalizedName: normalizeName(farm.name),
        description: farm.description,
        street: farm.address.street,
        city: farm.address.city,
        state: farm.address.state,
        postalCode: farm.address.postalCode,
        country: farm.address.country,
        latitude: farm.coordinates?.latitude,
        longitude: farm.coordinates?.longitude,
        phone: farm.phone,
        normalizedPhone: normalizePhoneNumber(farm.phone),
        publicEmail: farm.email,
        website: normalizedWebsite,
        normalizedDomain: extractDomain(normalizedWebsite),
        socialLinks: farm.socialLinks,
        visitInfo: farm.visitInfo,
        hours: farm.hours,
        seasonalAvailability: farm.seasonalAvailability,
        salesMethods: farm.salesMethods.map(toPrismaSalesMethod),
        claimStatus: toClaimStatus(farm.claimStatus),
        publicationStatus: toPublicationStatus(farm.publicationStatus),
        verificationStatus: toVerificationStatus(farm.verificationStatus),
        lastVerifiedAt: new Date(farm.lastVerifiedAt),
      },
      create: {
        slug: farm.slug,
        name: farm.name,
        normalizedName: normalizeName(farm.name),
        description: farm.description,
        street: farm.address.street,
        city: farm.address.city,
        state: farm.address.state,
        postalCode: farm.address.postalCode,
        country: farm.address.country,
        latitude: farm.coordinates?.latitude,
        longitude: farm.coordinates?.longitude,
        phone: farm.phone,
        normalizedPhone: normalizePhoneNumber(farm.phone),
        publicEmail: farm.email,
        website: normalizedWebsite,
        normalizedDomain: extractDomain(normalizedWebsite),
        socialLinks: farm.socialLinks,
        visitInfo: farm.visitInfo,
        hours: farm.hours,
        seasonalAvailability: farm.seasonalAvailability,
        salesMethods: farm.salesMethods.map(toPrismaSalesMethod),
        claimStatus: toClaimStatus(farm.claimStatus),
        publicationStatus: toPublicationStatus(farm.publicationStatus),
        verificationStatus: toVerificationStatus(farm.verificationStatus),
        lastVerifiedAt: new Date(farm.lastVerifiedAt),
      },
    });

    const savedFarm = await prisma.farm.findUniqueOrThrow({ where: { slug: farm.slug } });

    await prisma.farmProduct.deleteMany({ where: { farmId: savedFarm.id } });
    await prisma.practiceClaim.deleteMany({ where: { farmId: savedFarm.id } });

    for (const product of farm.products) {
      await prisma.farmProduct.create({
        data: {
          farmId: savedFarm.id,
          categoryId: product.category,
          name: product.name,
          details: product.details,
          availability: toAvailability(product.availability),
          season: product.season,
        },
      });
    }

    for (const claim of farm.practiceClaims) {
      await prisma.practiceClaim.create({
        data: {
          farmId: savedFarm.id,
          label: claim.label,
          note: claim.note,
          certificationUrl: claim.certificationUrl,
        },
      });
    }

    for (const source of farm.sourceRecords) {
      await prisma.sourceRecord.upsert({
        where: {
          sourceName_externalId: {
            sourceName: source.sourceName,
            externalId: source.externalId ?? `${source.sourceName}-${farm.slug}`,
          },
        },
        create: {
          farmId: savedFarm.id,
          sourceName: source.sourceName,
          sourceUrl: source.sourceUrl,
          sourcePageUrl: source.sourceUrl,
          externalId: source.externalId ?? `${source.sourceName}-${farm.slug}`,
          importedAt: new Date(source.importedAt),
          lastCheckedAt: new Date(source.lastCheckedAt),
          rawMetadata: source.metadata,
          usageNotes: source.usageNotes,
        },
        update: {
          farmId: savedFarm.id,
          sourceUrl: source.sourceUrl,
          sourcePageUrl: source.sourceUrl,
          lastCheckedAt: new Date(source.lastCheckedAt),
          rawMetadata: source.metadata,
          usageNotes: source.usageNotes,
        },
      });
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
