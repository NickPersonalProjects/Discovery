import Link from "next/link";
import { SubmitFarmForm } from "@/components/SubmitFarmForm";

export default function SubmitFarmPage() {
  return (
    <main className="narrow-page">
      <Link className="text-link" href="/">
        ← Back to search
      </Link>
      <section className="page-section" aria-labelledby="submit-title">
        <p className="eyebrow">Farm registration foundation</p>
        <h1 id="submit-title">Submit a farm for moderation</h1>
        <p>
          This MVP validates listing details in the browser and documents the pending-state boundary. A production
          workflow should save submissions as unpublished records, confirm email ownership, and route them to admin
          verification before publication.
        </p>
      </section>
      <SubmitFarmForm />
    </main>
  );
}
