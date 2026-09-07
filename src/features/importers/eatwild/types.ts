export interface EatwildStateDirectory {
  state: string;
  url: string;
}

export interface EatwildListingCandidate {
  sourceState: string;
  sourcePageUrl: string;
  sourceListingId: string;
  farmName: string;
  locationText?: string;
  phone?: string;
  email?: string;
  website?: string;
  productKeywords: string[];
  rawProductLabels: string[];
  shippingAvailable: boolean;
  deliveryAvailable: boolean;
  pickupAvailable: boolean;
  practiceClaims: string[];
  parserConfidence: number;
  parseWarnings: string[];
  metadata: Record<string, string>;
}

export interface EatwildImportOptions {
  state?: string;
  allStates?: boolean;
  confirmNationalImport?: boolean;
  dryRun?: boolean;
}

export interface EatwildImportSummary {
  pagesFetched: number;
  listingsParsed: number;
  inserted: number;
  updated: number;
  skipped: number;
  duplicateCandidates: number;
  parseWarnings: number;
  failures: number;
  blocked?: string;
}
