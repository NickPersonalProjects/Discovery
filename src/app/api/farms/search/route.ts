import { NextResponse } from "next/server";
import { getServerFarmRepository } from "@/features/farms/repository-server";
import { PRODUCT_CATEGORIES } from "@/features/farms/product-taxonomy";
import type { ProductCategory } from "@/features/farms/types";
import { searchFarmsWithLocationSupport } from "@/features/farms/search-service";

const VALID_CATEGORIES = new Set(PRODUCT_CATEGORIES.map((category) => category.id as ProductCategory));

function parseNumber(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("query") ?? undefined;
  const radiusMiles = parseNumber(url.searchParams.get("radiusMiles"));
  const page = parseNumber(url.searchParams.get("page"));
  const limit = parseNumber(url.searchParams.get("limit"));
  const latitude = parseNumber(url.searchParams.get("latitude"));
  const longitude = parseNumber(url.searchParams.get("longitude"));

  const categories = url.searchParams
    .getAll("category")
    .filter((category): category is ProductCategory => VALID_CATEGORIES.has(category as ProductCategory));

  const repository = getServerFarmRepository();
  const response = await searchFarmsWithLocationSupport(repository, {
    query,
    radiusMiles,
    categories,
    page,
    limit,
    userLocation:
      latitude !== undefined && longitude !== undefined
        ? {
            latitude,
            longitude,
          }
        : undefined,
  });

  return NextResponse.json(response, {
    status: response.error ? 503 : 200,
  });
}
