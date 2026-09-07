"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PRODUCT_CATEGORIES, SALES_METHOD_LABELS } from "@/features/farms/product-taxonomy";
import type { Coordinates, FarmSearchResult, ProductCategory } from "@/features/farms/types";
import type { FarmSearchResponse } from "@/features/farms/repository-types";

const radiusOptions = [25, 50, 100, 250, 500];
const PAGE_LIMIT = 25;

type GeoState = "idle" | "loading" | "ready" | "denied" | "unsupported" | "error";

function formatDistance(distanceMiles?: number) {
  if (distanceMiles === undefined) {
    return "Distance shown after choosing a location search or browser location";
  }

  return `${distanceMiles.toFixed(distanceMiles < 10 ? 1 : 0)} mi away`;
}

function buildQueryString(params: {
  query: string;
  radiusMiles: number;
  page: number;
  categories: ProductCategory[];
  userLocation?: Coordinates;
}) {
  const queryParams = new URLSearchParams();
  if (params.query.trim()) {
    queryParams.set("query", params.query.trim());
  }
  queryParams.set("radiusMiles", String(params.radiusMiles));
  queryParams.set("page", String(params.page));
  queryParams.set("limit", String(PAGE_LIMIT));
  params.categories.forEach((category) => queryParams.append("category", category));
  if (params.userLocation) {
    queryParams.set("latitude", String(params.userLocation.latitude));
    queryParams.set("longitude", String(params.userLocation.longitude));
  }
  return queryParams.toString();
}

export function FarmFinderApp() {
  const [query, setQuery] = useState("");
  const [radiusMiles, setRadiusMiles] = useState(100);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [userLocation, setUserLocation] = useState<Coordinates>();
  const [geoState, setGeoState] = useState<GeoState>("idle");
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<FarmSearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  useEffect(() => {
    const controller = new AbortController();

    async function loadResults() {
      setLoading(true);
      setErrorMessage(undefined);

      try {
        const queryString = buildQueryString({
          query,
          radiusMiles,
          categories,
          userLocation,
          page,
        });
        const response = await fetch(`/api/farms/search?${queryString}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const payload = (await response.json()) as FarmSearchResponse;
        setResults(payload.results);
        setTotal(payload.total);
        if (payload.error) {
          setErrorMessage(payload.error.message);
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setErrorMessage("Search is temporarily unavailable. Check database and geocoder configuration.");
          setResults([]);
          setTotal(0);
        }
      } finally {
        setLoading(false);
      }
    }

    void loadResults();

    return () => controller.abort();
  }, [categories, page, query, radiusMiles, userLocation]);

  const toggleCategory = (category: ProductCategory) => {
    setCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category],
    );
    setPage(1);
  };

  const requestLocation = () => {
    if (!("geolocation" in navigator)) {
      setGeoState("unsupported");
      return;
    }

    setGeoState("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setGeoState("ready");
        setPage(1);
      },
      (error) => {
        setGeoState(error.code === error.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  const resultSummary = useMemo(() => {
    if (loading) {
      return "Loading farms…";
    }

    return `${total} matching farms`;
  }, [loading, total]);

  return (
    <main>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__content">
          <p className="eyebrow">Nationwide farm discovery foundation</p>
          <h1 id="hero-title">Find farms selling food and flowers near you.</h1>
          <p>
            Search by U.S. ZIP, city/state, product category, or browser location. Discovery stores farm-source
            attribution and verification timestamps for transparent listings.
          </p>
          <div className="hero__actions">
            <a className="button button--primary" href="#search">
              Start searching
            </a>
            <Link className="button button--secondary" href="/submit">
              Submit a farm
            </Link>
          </div>
        </div>
        <aside className="notice" aria-label="Data source notice">
          <strong>Source policy:</strong> Eatwild import is opt-in only and requires operator permission/compliance with
          terms, robots directives, rate limits, and attribution.
        </aside>
      </section>

      <section id="search" className="search-panel" aria-labelledby="search-title">
        <div>
          <p className="eyebrow">Search</p>
          <h2 id="search-title">Choose location and products</h2>
        </div>
        <form className="controls" onSubmit={(event) => event.preventDefault()}>
          <label className="field">
            <span>ZIP code or city/state</span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setUserLocation(undefined);
                setPage(1);
                if (geoState === "ready") {
                  setGeoState("idle");
                }
              }}
              placeholder="22902 or Charlottesville, VA"
              autoComplete="postal-code"
            />
          </label>

          <label className="field">
            <span>Radius</span>
            <select
              value={radiusMiles}
              onChange={(event) => {
                setRadiusMiles(Number(event.target.value));
                setPage(1);
              }}
            >
              {radiusOptions.map((option) => (
                <option key={option} value={option}>
                  Within {option} miles
                </option>
              ))}
            </select>
          </label>

          <fieldset className="field fieldset">
            <legend>Product filters</legend>
            <div className="chips">
              {PRODUCT_CATEGORIES.map((category) => (
                <label key={category.id} className="chip">
                  <input
                    type="checkbox"
                    checked={categories.includes(category.id)}
                    onChange={() => toggleCategory(category.id)}
                  />
                  <span>{category.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </form>

        <div className="geolocation-card">
          <div>
            <h3>Use browser location</h3>
            <p>
              Browser coordinates are used only for this search request. Discovery does not persist visitor precise
              location.
            </p>
          </div>
          <button className="button button--secondary" type="button" onClick={requestLocation} disabled={geoState === "loading"}>
            {geoState === "loading" ? "Requesting…" : "Use my location"}
          </button>
        </div>
        <div className="status-message" role="status" aria-live="polite">
          {geoState === "ready" && "Using your browser location for this search only."}
          {geoState === "denied" && "Location permission was denied. You can still search by city/state or ZIP code."}
          {geoState === "unsupported" && "This browser does not support geolocation. Use city/state or ZIP search instead."}
          {geoState === "error" && "We could not read your location. Try again or search by city/state or ZIP."}
        </div>
      </section>

      <section className="results-layout" aria-labelledby="results-title">
        <div className="results-column">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Results</p>
              <h2 id="results-title">{resultSummary}</h2>
            </div>
            {!loading && results.length === 0 && !errorMessage && (
              <p className="muted">No farms matched. Try another ZIP/city-state query, larger radius, or fewer filters.</p>
            )}
          </div>

          {errorMessage && <p className="muted">{errorMessage}</p>}

          <div className="farm-list">
            {results.map(({ farm, distanceMiles }) => (
              <article className="farm-card" key={farm.id}>
                <div className="farm-card__header">
                  <div>
                    <h3>
                      <Link href={`/farms/${farm.slug}`}>{farm.name}</Link>
                    </h3>
                    <p>
                      {farm.address.city}, {farm.address.state} • {formatDistance(distanceMiles)}
                    </p>
                  </div>
                  <span className="badge">{farm.verificationStatus.replaceAll("-", " ")}</span>
                </div>
                <p>{farm.description || "No profile description available yet."}</p>
                <dl className="metadata-grid">
                  <div>
                    <dt>Products</dt>
                    <dd>{farm.products.map((product) => product.name).join(", ") || "Not listed"}</dd>
                  </div>
                  <div>
                    <dt>Sales</dt>
                    <dd>{farm.salesMethods.map((method) => SALES_METHOD_LABELS[method]).join(", ") || "Not listed"}</dd>
                  </div>
                  <div>
                    <dt>Last verified</dt>
                    <dd>{new Date(farm.lastVerifiedAt).toLocaleDateString()}</dd>
                  </div>
                </dl>
                <Link className="text-link" href={`/farms/${farm.slug}`}>
                  View farm profile
                </Link>
              </article>
            ))}
          </div>

          <div className="hero__actions">
            <button className="button button--secondary" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading}>
              Previous
            </button>
            <p className="muted">
              Page {page} of {totalPages}
            </p>
            <button className="button button--secondary" onClick={() => setPage((current) => (current < totalPages ? current + 1 : current))} disabled={page >= totalPages || loading}>
              Next
            </button>
          </div>
        </div>

        <aside className="map-panel" aria-labelledby="map-title">
          <div>
            <p className="eyebrow">Map-ready view</p>
            <h2 id="map-title">Accessible MapLibre abstraction</h2>
            <p>
              Production map rendering can mount here when tile configuration is available. Until then, this summary
              remains keyboard-readable.
            </p>
          </div>
          <ol className="map-list">
            {results.map(({ farm, distanceMiles }) => (
              <li key={farm.id}>
                <strong>{farm.name}</strong>
                <span>
                  {farm.address.city}, {farm.address.state}
                </span>
                <span>{formatDistance(distanceMiles)}</span>
              </li>
            ))}
          </ol>
        </aside>
      </section>
    </main>
  );
}
