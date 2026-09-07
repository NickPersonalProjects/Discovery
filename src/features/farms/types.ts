export type ProductCategory =
  | "meat"
  | "eggs"
  | "dairy"
  | "produce"
  | "honey"
  | "flowers"
  | "prepared-foods";

export type SalesMethod =
  | "farm-stand"
  | "csa"
  | "pickup"
  | "delivery"
  | "shipping"
  | "farmers-market";

export type ClaimStatus = "unclaimed" | "owner-claimed";
export type PublicationStatus = "published" | "pending" | "unpublished" | "rejected";
export type VerificationStatus =
  | "imported"
  | "community-submitted"
  | "owner-claimed"
  | "admin-verified"
  | "possibly-stale";

export type Availability = "year-round" | "seasonal";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface FarmAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: "US";
}

export interface ProductListing {
  id: string;
  category: ProductCategory;
  name: string;
  details: string;
  availability: Availability;
  season?: string;
}

export interface PracticeClaim {
  label: string;
  note: string;
  certificationUrl?: string;
}

export interface SourceRecord {
  id: string;
  sourceName: string;
  sourceUrl?: string;
  externalId?: string;
  importedAt: string;
  lastCheckedAt: string;
  usageNotes: string;
  metadata: Record<string, string>;
}

export interface Farm {
  id: string;
  slug: string;
  name: string;
  description: string;
  address: FarmAddress;
  coordinates?: Coordinates;
  phone?: string;
  email?: string;
  website?: string;
  socialLinks: { label: string; url: string }[];
  visitInfo: string;
  hours: string;
  seasonalAvailability: string;
  products: ProductListing[];
  salesMethods: SalesMethod[];
  practiceClaims: PracticeClaim[];
  claimStatus: ClaimStatus;
  publicationStatus: PublicationStatus;
  verificationStatus: VerificationStatus;
  lastVerifiedAt: string;
  sourceRecords: SourceRecord[];
  isFictionalSeed: boolean;
}

export interface FarmSearchParams {
  query?: string;
  radiusMiles?: number;
  categories?: ProductCategory[];
  userLocation?: Coordinates;
}

export interface FarmSearchResult {
  farm: Farm;
  distanceMiles?: number;
}
