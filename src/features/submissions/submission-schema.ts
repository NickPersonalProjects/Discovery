import { z } from "zod";
import { PRODUCT_CATEGORIES } from "../farms/product-taxonomy";

const productCategoryIds = PRODUCT_CATEGORIES.map((category) => category.id) as [string, ...string[]];

export const farmSubmissionSchema = z.object({
  farmName: z.string().trim().min(2, "Farm name is required"),
  contactName: z.string().trim().min(2, "Contact name is required"),
  email: z.email("Enter a valid public or owner contact email"),
  phone: z.string().trim().optional(),
  website: z.url("Enter a valid website URL").optional().or(z.literal("")),
  street: z.string().trim().min(2, "Street address is required for moderation"),
  city: z.string().trim().min(2, "City is required"),
  state: z.string().trim().length(2, "Use a two-letter state code"),
  postalCode: z.string().trim().min(5, "ZIP code is required"),
  productCategories: z.array(z.enum(productCategoryIds)).min(1, "Choose at least one product category"),
  productDetails: z.string().trim().min(10, "Describe the products available"),
  salesMethods: z.array(z.string()).min(1, "Choose at least one sales method"),
  hours: z.string().trim().min(5, "Add hours or appointment details"),
  ownershipAttestation: z.enum(["owner", "authorized", "community"]),
  sourceNotes: z.string().trim().min(10, "Explain how this listing can be verified"),
});

export type FarmSubmissionInput = z.infer<typeof farmSubmissionSchema>;
