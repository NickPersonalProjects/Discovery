"use client";

import { useState } from "react";
import { PRODUCT_CATEGORIES, SALES_METHOD_LABELS } from "@/features/farms/product-taxonomy";
import { farmSubmissionSchema } from "@/features/submissions/submission-schema";

type FormStatus = "idle" | "error" | "success";

export function SubmitFarmForm() {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errors, setErrors] = useState<string[]>([]);

  return (
    <form
      className="submission-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const parsed = farmSubmissionSchema.safeParse({
          farmName: formData.get("farmName"),
          contactName: formData.get("contactName"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          website: formData.get("website"),
          street: formData.get("street"),
          city: formData.get("city"),
          state: formData.get("state"),
          postalCode: formData.get("postalCode"),
          productCategories: formData.getAll("productCategories"),
          productDetails: formData.get("productDetails"),
          salesMethods: formData.getAll("salesMethods"),
          hours: formData.get("hours"),
          ownershipAttestation: formData.get("ownershipAttestation"),
          sourceNotes: formData.get("sourceNotes"),
        });

        if (!parsed.success) {
          setStatus("error");
          setErrors(parsed.error.issues.map((issue) => issue.message));
          return;
        }

        setStatus("success");
        setErrors([]);
        event.currentTarget.reset();
      }}
    >
      <div className="form-grid">
        <label className="field">
          <span>Farm name</span>
          <input name="farmName" required />
        </label>
        <label className="field">
          <span>Your name</span>
          <input name="contactName" required autoComplete="name" />
        </label>
        <label className="field">
          <span>Public or owner contact email</span>
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label className="field">
          <span>Public phone</span>
          <input name="phone" type="tel" autoComplete="tel" />
        </label>
        <label className="field field--wide">
          <span>Website</span>
          <input name="website" type="url" placeholder="https://farm.example" />
        </label>
        <label className="field field--wide">
          <span>Street address</span>
          <input name="street" required autoComplete="street-address" />
        </label>
        <label className="field">
          <span>City</span>
          <input name="city" required autoComplete="address-level2" />
        </label>
        <label className="field">
          <span>State</span>
          <input name="state" required maxLength={2} autoComplete="address-level1" />
        </label>
        <label className="field">
          <span>ZIP code</span>
          <input name="postalCode" required autoComplete="postal-code" />
        </label>
      </div>

      <fieldset className="field fieldset">
        <legend>Products sold</legend>
        <div className="chips">
          {PRODUCT_CATEGORIES.map((category) => (
            <label key={category.id} className="chip">
              <input type="checkbox" name="productCategories" value={category.id} />
              <span>{category.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="field">
        <span>Product details and seasonal availability</span>
        <textarea name="productDetails" required rows={4} />
      </label>

      <fieldset className="field fieldset">
        <legend>Sales methods</legend>
        <div className="chips">
          {Object.entries(SALES_METHOD_LABELS).map(([value, label]) => (
            <label key={value} className="chip">
              <input type="checkbox" name="salesMethods" value={value} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="field">
        <span>Hours or appointment details</span>
        <textarea name="hours" required rows={3} />
      </label>

      <fieldset className="field fieldset">
        <legend>Source and ownership information</legend>
        <label className="radio-row">
          <input type="radio" name="ownershipAttestation" value="owner" required />
          I own this farm.
        </label>
        <label className="radio-row">
          <input type="radio" name="ownershipAttestation" value="authorized" />
          I am authorized to submit this listing.
        </label>
        <label className="radio-row">
          <input type="radio" name="ownershipAttestation" value="community" />
          I am suggesting a public listing for moderation.
        </label>
      </fieldset>

      <label className="field">
        <span>Verification/source notes</span>
        <textarea name="sourceNotes" required rows={4} />
      </label>

      {status === "error" && (
        <div className="alert alert--error" role="alert">
          <strong>Please fix the submission:</strong>
          <ul>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      {status === "success" && (
        <div className="alert alert--success" role="status">
          Submission validated locally. In production this would create a pending, unpublished moderation record.
        </div>
      )}

      <button className="button button--primary" type="submit">
        Validate pending submission
      </button>
    </form>
  );
}
