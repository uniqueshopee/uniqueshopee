import type { CategoryScene } from "@/components/product/category-illustration";
import type { Product } from "@/types";

type SearchTab = "products" | "brands" | "categories";

type SearchProduct = Product & {
  brand: string;
  href: string;
  keywords: string[];
  isFeatured: boolean;
  isNew: boolean;
};

type SearchBrand = {
  slug: string;
  name: string;
  category: "Paint" | "Plumbing";
  tagline: string;
  href: string;
  logo: string;
  keywords: string[];
};

type SearchCategory = {
  slug: string;
  name: string;
  href: string;
  description: string;
  scene: CategoryScene;
  keywords: string[];
};

type SearchSuggestion = {
  id: string;
  kind: "product" | "brand" | "category" | "query";
  label: string;
  description: string;
  href: string;
  meta: string;
};

type SearchResults = {
  products: SearchProduct[];
  brands: SearchBrand[];
  categories: SearchCategory[];
};

const RECENT_SEARCHES: string[] = [];
const POPULAR_SEARCHES: string[] = [];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function scoreMatch(subjects: string[], query: string) {
  const term = normalize(query);

  if (!term) {
    return 0;
  }

  let score = 0;

  for (const subject of subjects) {
    const value = normalize(subject);

    if (!value) continue;
    if (value === term) score += 100;
    else if (value.startsWith(term)) score += 60;
    else if (value.includes(term)) score += 30;
  }

  return score;
}

function getSearchResults(query: string, catalog: SearchResults): SearchResults {
  const term = normalize(query);

  const products = catalog.products
    .filter((product) => {
      if (!term) return true;
      return scoreMatch([product.name, product.category, product.brand, ...product.keywords], term) > 0;
    })
    .map((product) => ({ product, score: scoreMatch([product.name, product.category, product.brand, ...product.keywords], term) }))
    .sort((left, right) => {
      if (!term) {
        return Number(right.product.isFeatured) - Number(left.product.isFeatured) || Number(right.product.isNew) - Number(left.product.isNew);
      }
      return right.score - left.score || (right.product.rating ?? 0) - (left.product.rating ?? 0);
    })
    .map((entry) => entry.product);

  const brands = catalog.brands
    .filter((brand) => {
      if (!term) return true;
      return scoreMatch([brand.name, brand.category, brand.tagline, ...brand.keywords], term) > 0;
    })
    .sort((left, right) => (term ? scoreMatch([right.name, right.category, right.tagline, ...right.keywords], term) - scoreMatch([left.name, left.category, left.tagline, ...left.keywords], term) : left.name.localeCompare(right.name)));

  const categories = catalog.categories
    .filter((category) => {
      if (!term) return true;
      return scoreMatch([category.name, category.description, ...category.keywords], term) > 0;
    })
    .sort((left, right) => (term ? scoreMatch([right.name, right.description, ...right.keywords], term) - scoreMatch([left.name, left.description, ...left.keywords], term) : left.name.localeCompare(right.name)));

  return { products, brands, categories };
}

function getSearchSuggestions(query: string, limit = 6) {
  const results = getSearchResults(query, { products: [], brands: [], categories: [] });
  return {
    products: results.products.slice(0, limit),
    brands: results.brands.slice(0, limit),
    categories: results.categories.slice(0, limit),
  };
}

function getSearchSuggestionItems(query: string) {
  const term = normalize(query);
  const suggestions = getSearchSuggestions(query, 4);

  const productItems: SearchSuggestion[] = suggestions.products.map((product) => ({
    id: `product-${product.id}`,
    kind: "product",
    label: product.name,
    description: product.category,
    href: product.href,
    meta: product.brand,
  }));

  const brandItems: SearchSuggestion[] = suggestions.brands.map((brand) => ({
    id: `brand-${brand.slug}`,
    kind: "brand",
    label: brand.name,
    description: brand.tagline,
    href: brand.href,
    meta: brand.category,
  }));

  const categoryItems: SearchSuggestion[] = suggestions.categories.map((category) => ({
    id: `category-${category.slug}`,
    kind: "category",
    label: category.name,
    description: category.description,
    href: category.href,
    meta: "Category",
  }));

  const queryItems: SearchSuggestion[] = term
    ? []
    : [
        ...RECENT_SEARCHES.slice(0, 4).map((item) => ({
          id: `recent-${normalize(item)}`,
          kind: "query" as const,
          label: item,
          description: "Recent search",
          href: `/search?q=${encodeURIComponent(item)}`,
          meta: "Recent",
        })),
        ...POPULAR_SEARCHES.slice(0, 4).map((item) => ({
          id: `popular-${normalize(item)}`,
          kind: "query" as const,
          label: item,
          description: "Popular search",
          href: `/search?q=${encodeURIComponent(item)}`,
          meta: "Popular",
        })),
      ];

  return [...productItems, ...brandItems, ...categoryItems, ...queryItems];
}

export type { SearchBrand, SearchCategory, SearchProduct, SearchResults, SearchSuggestion, SearchTab };
export { POPULAR_SEARCHES, RECENT_SEARCHES, getSearchResults, getSearchSuggestionItems, getSearchSuggestions };
