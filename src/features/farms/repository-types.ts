import type { Coordinates, Farm, FarmSearchResult, ProductCategory } from "./types";

export type RepositoryErrorCode = "DATABASE_UNAVAILABLE" | "GEOCODER_UNAVAILABLE";

export interface RepositoryError {
  code: RepositoryErrorCode;
  message: string;
}

export interface FarmSearchRequest {
  query?: string;
  radiusMiles?: number;
  categories?: ProductCategory[];
  userLocation?: Coordinates;
  page?: number;
  limit?: number;
}

export interface FarmSearchResponse {
  results: FarmSearchResult[];
  total: number;
  page: number;
  limit: number;
  error?: RepositoryError;
}

export interface RepositoryHealth {
  ok: boolean;
  message: string;
}

export interface FarmRepository {
  search(params: FarmSearchRequest): Promise<FarmSearchResponse>;
  findBySlug(slug: string): Promise<Farm | undefined>;
  listPublished(): Promise<Farm[]>;
  health(): Promise<RepositoryHealth>;
}
