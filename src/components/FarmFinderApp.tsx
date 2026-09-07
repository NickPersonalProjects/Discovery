"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PRODUCT_CATEGORIES, SALES_METHOD_LABELS } from "@/features/farms/product-taxonomy";
import { farmRepository } from "@/features/farms/repository";
import type { Coordinates, ProductCategory } from "@/features/farms/types";

const radiusOptions = [25, 50, 100, 250, 500];

type GeoState = "idle" | "loading" | "ready" | "denied" | "unsupported" | "error";

function formatDistance(distanceMiles?: number) {
  if (distanceMiles === undefined) {
    return "Distance shown after choosing a recognized place or browser location";
  }

  return `${distanceMiles.toFixed(distanceMiles < 10 ? 1 : 0)} mi away`;
}

export function FarmFinderApp() {
  const [query, setQuery] = useState("Lancaster");
  const [radiusMiles, setRadiusMiles] = useState(100);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [userLocation, setUserLocation] = useState<Coordinates>();
  const [geoState, setGeoState] = useState<GeoState>("idle");

  const results = useMemo(
    () => farmRepository.search({ query, radiusMiles, categories, userLocation }),
    [categories, query, radiusMiles, userLocation],
  );

  const toggleCategory = (category: ProductCategory) => {
    setCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category],
    );
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
      },
      (error) => {
        setGeoState(error.code === error.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  return (
    <main>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__content">
          <p className="eyebrow">Nationwide-ready farm discovery MVP</p>
          <h1 id="hero-title">Find farms selling food and flowers near you.</h1>
          <p>
            Search fictional seed listings by ZIP, city, product category, or your browser location. Source
            attribution, verification freshness, and owner-claim states are modeled from day one.
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
          <strong>Data policy:</strong> demo listings are fictional. Eatwild is not scraped or republished; a future
          importer must be permission-based and retain provenance.
        </aside>
      </section>

      <section id="search" className="search-panel" aria-labelledby="search-title">
        <div>
          <p className="eyebrow">Search</p>
          <h2 id="search-title">Choose location and products</h2>
        </div>
        <form className="controls" onSubmit={(event) => event.preventDefault()}>
          <label className="field">
            <span>ZIP code or city</span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setUserLocation(undefined);
                if (geoState === "ready") {
                  setGeoState("idle");
                }
              }}
              placeholder="Lancaster, Charlottesville, 53703..."
              autoComplete="postal-code"
            />
          </label>

          <label className="field">
            <span>Radius</span>
            <select value={radiusMiles} onChange={(event) => setRadiusMiles(Number(event.target.value))}>
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
              We only use your approximate coordinates in this page session to sort and filter results. The MVP does
              not store visitor location by default.
            </p>
          </div>
          <button className="button button--secondary" type="button" onClick={requestLocation} disabled={geoState === "loading"}>
            {geoState === "loading" ? "Requesting…" : "Use my location"}
          </button>
        </div>
        <div className="status-message" role="status" aria-live="polite">
          {geoState === "ready" && "Using your browser location for this search only."}
          {geoState === "denied" && "Location permission was denied. You can still search by city or ZIP code."}
          {geoState === "unsupported" && "This browser does not support geolocation. Use city or ZIP search instead."}
          {geoState === "error" && "We could not read your location. Try again or search by city or ZIP."}
        </div>
      </section>

      <section className="results-layout" aria-labelledby="results-title">
        <div className="results-column">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Results</p>
              <h2 id="results-title">{results.length} matching farms</h2>
            </div>
            {results.length === 0 && (
              <p className="muted">Try a larger radius, clear product filters, or search a seeded city.</p>
            )}
          </div>

          <div className="farm-list">
            {results.map(({ farm, distanceMiles }) => (
              <article className="farm-card" key={farm.id}>
                <div className="farm-card__header">
                  <div>
                    <h3>
                      <Link href={`/farms/${farm.slug}`}>{farm.name}</Link>
                    </h3>
                    <p>{farm.address.city}, {farm.address.state} • {formatDistance(distanceMiles)}</p>
                  </div>
                  <span className="badge">{farm.verificationStatus.replaceAll("-", " ")}</span>
                </div>
                <p>{farm.description}</p>
                <dl className="metadata-grid">
                  <div>
                    <dt>Products</dt>
                    <dd>{farm.products.map((product) => product.name).join(", ")}</dd>
                  </div>
                  <div>
                    <dt>Sales</dt>
                    <dd>{farm.salesMethods.map((method) => SALES_METHOD_LABELS[method]).join(", ")}</dd>
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
        </div>

        <aside className="map-panel" aria-labelledby="map-title">
          <div>
            <p className="eyebrow">Map-ready view</p>
            <h2 id="map-title">Accessible MapLibre abstraction</h2>
            <p>
              A production map can mount here when tile configuration is available. Until then, local development keeps
              working with a keyboard-readable location summary.
            </p>
          </div>
          <ol className="map-list">
            {results.map(({ farm, distanceMiles }) => (
              <li key={farm.id}>
                <strong>{farm.name}</strong>
                <span>{farm.address.city}, {farm.address.state}</span>
                <span>{formatDistance(distanceMiles)}</span>
              </li>
            ))}
          </ol>
        </aside>
      </section>
    </main>
  );
}
