import type { ProductCategory, SalesMethod } from "./types";

export const PRODUCT_CATEGORIES: { id: ProductCategory; label: string }[] = [
  { id: "meat", label: "Meat" },
  { id: "eggs", label: "Eggs" },
  { id: "dairy", label: "Dairy" },
  { id: "produce", label: "Produce" },
  { id: "honey", label: "Honey" },
  { id: "flowers", label: "Flowers" },
  { id: "prepared-foods", label: "Prepared foods" },
];

export const SALES_METHOD_LABELS: Record<SalesMethod, string> = {
  "farm-stand": "Farm stand",
  csa: "CSA",
  pickup: "Pickup",
  delivery: "Delivery",
  shipping: "Shipping",
  "farmers-market": "Farmers market",
};
