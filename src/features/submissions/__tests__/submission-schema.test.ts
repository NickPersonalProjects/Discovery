import { describe, expect, it } from "vitest";
import { farmSubmissionSchema } from "../submission-schema";

const validSubmission = {
  farmName: "Demo Farm",
  contactName: "Casey Farmer",
  email: "casey@example.test",
  phone: "",
  website: "https://demo.example",
  street: "1 Demo Lane",
  city: "Ames",
  state: "IA",
  postalCode: "50010",
  productCategories: ["produce"],
  productDetails: "Seasonal vegetables and herbs for local pickup.",
  salesMethods: ["pickup"],
  hours: "Saturday mornings by appointment",
  ownershipAttestation: "owner",
  sourceNotes: "Owner-submitted listing with current public contact details.",
};

describe("farm submission validation", () => {
  it("accepts a complete pending listing submission", () => {
    expect(farmSubmissionSchema.safeParse(validSubmission).success).toBe(true);
  });

  it("requires products, sales methods, and verification notes", () => {
    const result = farmSubmissionSchema.safeParse({
      ...validSubmission,
      productCategories: [],
      salesMethods: [],
      sourceNotes: "too short",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toEqual(
        expect.arrayContaining([
          "Choose at least one product category",
          "Choose at least one sales method",
          "Explain how this listing can be verified",
        ]),
      );
    }
  });
});
