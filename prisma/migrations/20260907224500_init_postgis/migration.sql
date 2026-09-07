CREATE EXTENSION IF NOT EXISTS postgis;

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('UNCLAIMED', 'OWNER_CLAIMED');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('PENDING', 'PUBLISHED', 'UNPUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('IMPORTED', 'COMMUNITY_SUBMITTED', 'OWNER_CLAIMED', 'ADMIN_VERIFIED', 'POSSIBLY_STALE');

-- CreateEnum
CREATE TYPE "Availability" AS ENUM ('YEAR_ROUND', 'SEASONAL');

-- CreateEnum
CREATE TYPE "SalesMethod" AS ENUM ('FARM_STAND', 'CSA', 'PICKUP', 'DELIVERY', 'SHIPPING', 'FARMERS_MARKET');

-- CreateTable
CREATE TABLE "Farm" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT,
    "description" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'US',
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "coordinates" geometry(Point, 4326),
    "phone" TEXT,
    "normalizedPhone" TEXT,
    "publicEmail" TEXT,
    "website" TEXT,
    "normalizedDomain" TEXT,
    "socialLinks" JSONB NOT NULL DEFAULT '[]',
    "visitInfo" TEXT,
    "hours" TEXT,
    "seasonalAvailability" TEXT,
    "salesMethods" "SalesMethod"[],
    "claimStatus" "ClaimStatus" NOT NULL DEFAULT 'UNCLAIMED',
    "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'PENDING',
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'COMMUNITY_SUBMITTED',
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Farm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FarmProduct" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "details" TEXT,
    "availability" "Availability" NOT NULL DEFAULT 'SEASONAL',
    "season" TEXT,

    CONSTRAINT "FarmProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeClaim" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "certificationUrl" TEXT,

    CONSTRAINT "PracticeClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceRecord" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourcePageUrl" TEXT,
    "externalId" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCheckedAt" TIMESTAMP(3),
    "parserConfidence" INTEGER,
    "parseWarnings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rawMetadata" JSONB,
    "usageNotes" TEXT NOT NULL,

    CONSTRAINT "SourceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FarmSubmission" (
    "id" TEXT NOT NULL,
    "farmName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "phone" TEXT,
    "website" TEXT,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "productCategories" TEXT[],
    "productDetails" TEXT NOT NULL,
    "salesMethods" "SalesMethod"[],
    "hours" TEXT NOT NULL,
    "ownershipAttestation" TEXT NOT NULL,
    "sourceNotes" TEXT NOT NULL,
    "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'PENDING',
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'COMMUNITY_SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FarmSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Farm_slug_key" ON "Farm"("slug");

-- CreateIndex
CREATE INDEX "Farm_city_state_idx" ON "Farm"("city", "state");

-- CreateIndex
CREATE INDEX "Farm_postalCode_idx" ON "Farm"("postalCode");

-- CreateIndex
CREATE INDEX "Farm_publicationStatus_state_idx" ON "Farm"("publicationStatus", "state");

-- CreateIndex
CREATE INDEX "Farm_normalizedName_idx" ON "Farm"("normalizedName");

-- CreateIndex
CREATE INDEX "Farm_normalizedPhone_idx" ON "Farm"("normalizedPhone");

-- CreateIndex
CREATE INDEX "Farm_normalizedDomain_idx" ON "Farm"("normalizedDomain");

-- CreateIndex
CREATE INDEX "FarmProduct_categoryId_idx" ON "FarmProduct"("categoryId");

-- CreateIndex
CREATE INDEX "SourceRecord_farmId_idx" ON "SourceRecord"("farmId");

-- CreateIndex
CREATE INDEX "SourceRecord_sourceName_idx" ON "SourceRecord"("sourceName");

-- CreateIndex
CREATE UNIQUE INDEX "SourceRecord_sourceName_externalId_key" ON "SourceRecord"("sourceName", "externalId");

-- CreateIndex
CREATE INDEX "Farm_coordinates_gix" ON "Farm" USING GIST ("coordinates");

-- AddForeignKey
ALTER TABLE "FarmProduct" ADD CONSTRAINT "FarmProduct_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmProduct" ADD CONSTRAINT "FarmProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeClaim" ADD CONSTRAINT "PracticeClaim_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceRecord" ADD CONSTRAINT "SourceRecord_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION sync_farm_coordinates() RETURNS trigger AS $$
BEGIN
  IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN
    NEW.coordinates := NULL;
  ELSE
    NEW.coordinates := ST_SetSRID(ST_MakePoint(NEW.longitude::double precision, NEW.latitude::double precision), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER farm_coordinates_sync
BEFORE INSERT OR UPDATE OF latitude, longitude
ON "Farm"
FOR EACH ROW
EXECUTE FUNCTION sync_farm_coordinates();
