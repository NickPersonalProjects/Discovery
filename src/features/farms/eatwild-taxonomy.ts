import type { ProductCategory } from "./types";

const KEYWORD_TO_CATEGORY: Array<{ keyword: string; category: ProductCategory }> = [
  { keyword: "beef", category: "meat" },
  { keyword: "pork", category: "meat" },
  { keyword: "chicken", category: "meat" },
  { keyword: "lamb", category: "meat" },
  { keyword: "egg", category: "eggs" },
  { keyword: "milk", category: "dairy" },
  { keyword: "cheese", category: "dairy" },
  { keyword: "yogurt", category: "dairy" },
  { keyword: "produce", category: "produce" },
  { keyword: "vegetable", category: "produce" },
  { keyword: "fruit", category: "produce" },
  { keyword: "honey", category: "honey" },
  { keyword: "flower", category: "flowers" },
  { keyword: "bread", category: "prepared-foods" },
  { keyword: "jam", category: "prepared-foods" },
  { keyword: "prepared", category: "prepared-foods" },
];

export function mapEatwildKeywordToCategory(keyword: string): ProductCategory | undefined {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  return KEYWORD_TO_CATEGORY.find((entry) => normalized.includes(entry.keyword))?.category;
}
