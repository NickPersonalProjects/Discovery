import Link from "next/link";
import { notFound } from "next/navigation";
import { PRODUCT_CATEGORIES, SALES_METHOD_LABELS } from "@/features/farms/product-taxonomy";
import { farmRepository } from "@/features/farms/repository";

export function generateStaticParams() {
  return farmRepository.listPublished().map((farm) => ({ slug: farm.slug }));
}

export default async function FarmDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const farm = farmRepository.findBySlug(slug);

  if (!farm) {
    notFound();
  }

  return (
    <main className="narrow-page">
      <Link className="text-link" href="/">
        ← Back to search
      </Link>
      <article className="detail-card">
        <header className="detail-header">
          <div>
            <p className="eyebrow">Farm profile</p>
            <h1>{farm.name}</h1>
            <p>
              {farm.address.street}, {farm.address.city}, {farm.address.state} {farm.address.postalCode}
            </p>
          </div>
          <span className="badge">{farm.verificationStatus.replaceAll("-", " ")}</span>
        </header>

        <p className="lead">{farm.description}</p>

        <section className="detail-section" aria-labelledby="contact-title">
          <h2 id="contact-title">Contact and links</h2>
          <dl className="metadata-grid">
            {farm.phone && (
              <div>
                <dt>Phone</dt>
                <dd>{farm.phone}</dd>
              </div>
            )}
            {farm.email && (
              <div>
                <dt>Email</dt>
                <dd>
                  <a className="text-link" href={`mailto:${farm.email}`}>
                    {farm.email}
                  </a>
                </dd>
              </div>
            )}
            {farm.website && (
              <div>
                <dt>Website</dt>
                <dd>
                  <a className="text-link" href={farm.website}>
                    {farm.website}
                  </a>
                </dd>
              </div>
            )}
            {farm.socialLinks.map((link) => (
              <div key={link.url}>
                <dt>{link.label}</dt>
                <dd>
                  <a className="text-link" href={link.url}>
                    {link.url}
                  </a>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="detail-section" aria-labelledby="products-title">
          <h2 id="products-title">Products</h2>
          <div className="product-list">
            {farm.products.map((product) => (
              <div className="product-card" key={product.id}>
                <strong>{product.name}</strong>
                <span>{PRODUCT_CATEGORIES.find((category) => category.id === product.category)?.label}</span>
                <p>{product.details}</p>
                <p>{product.availability === "year-round" ? "Year-round" : product.season ?? "Seasonal"}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="detail-section" aria-labelledby="visit-title">
          <h2 id="visit-title">Hours, seasons, and sales methods</h2>
          <dl className="metadata-grid">
            <div>
              <dt>Hours</dt>
              <dd>{farm.hours}</dd>
            </div>
            <div>
              <dt>Seasonality</dt>
              <dd>{farm.seasonalAvailability}</dd>
            </div>
            <div>
              <dt>Sales methods</dt>
              <dd>{farm.salesMethods.map((method) => SALES_METHOD_LABELS[method]).join(", ")}</dd>
            </div>
            <div>
              <dt>Visit notes</dt>
              <dd>{farm.visitInfo}</dd>
            </div>
          </dl>
        </section>

        <section className="detail-section" aria-labelledby="practices-title">
          <h2 id="practices-title">Practice and certification claims</h2>
          <p className="muted">
            Claims are displayed for transparency and are not Discovery endorsements unless certification evidence is
            attached.
          </p>
          <ul className="claim-list">
            {farm.practiceClaims.map((claim) => (
              <li key={claim.label}>
                <strong>{claim.label}</strong>
                <p>{claim.note}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="detail-section" aria-labelledby="source-title">
          <h2 id="source-title">Source attribution and verification</h2>
          <dl className="metadata-grid">
            <div>
              <dt>Claim status</dt>
              <dd>{farm.claimStatus.replaceAll("-", " ")}</dd>
            </div>
            <div>
              <dt>Publication state</dt>
              <dd>{farm.publicationStatus}</dd>
            </div>
            <div>
              <dt>Last verified</dt>
              <dd>{new Date(farm.lastVerifiedAt).toLocaleDateString()}</dd>
            </div>
          </dl>
          <ul className="source-list">
            {farm.sourceRecords.map((source) => (
              <li key={source.id}>
                <strong>{source.sourceName}</strong>
                <p>{source.usageNotes}</p>
                <p>Last checked {new Date(source.lastCheckedAt).toLocaleDateString()}</p>
              </li>
            ))}
          </ul>
        </section>
      </article>
    </main>
  );
}
