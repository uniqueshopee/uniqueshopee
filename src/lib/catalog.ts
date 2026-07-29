import "server-only";

import { unstable_cache } from "next/cache";
import type { Product } from "@/types";
import { getSupabasePublicServerClient } from "@/lib/supabase/public-server";

type JsonRecord = Record<string, unknown>;

type DepartmentRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean | null;
  deleted_at: string | null;
  sort_order: number | null;
};

type CategoryRow = {
  id: string;
  department_id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean | null;
  deleted_at: string | null;
};

type BrandRow = {
  id: string;
  department_id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  is_active: boolean | null;
  is_featured: boolean | null;
  deleted_at: string | null;
  created_at: string;
};

type ProductRow = {
  id: string;
  department_id: string;
  category_id: string;
  brand_id: string;
  slug: string;
  sku: string;
  name: string;
  description: string | null;
  short_description: string | null;
  gst_rate: number | string | null;
  mrp: number | string;
  selling_price: number | string;
  discount_amount: number | string | null;
  discount_percent: number | string | null;
  status: string;
  featured: boolean;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string[] | null;
  canonical_url: string | null;
  og_image_url: string | null;
  specification: JsonRecord | null;
  attributes: JsonRecord | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

type ProductImageRow = {
  id: string;
  product_id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  deleted_at: string | null;
};

type ProductVariantRow = {
  id: string;
  product_id: string;
  sku: string;
  variant_name: string;
  option_label: string | null;
  option_value: string | null;
  variant_options: JsonRecord | null;
  mrp_override: number | string | null;
  selling_price_override: number | string | null;
  barcode: string | null;
  weight: number | string | null;
  is_default: boolean;
  is_active: boolean;
  deleted_at: string | null;
};

type InventoryRow = {
  id: string;
  product_variant_id: string;
  current_quantity: number | string;
  reserved_quantity: number | string;
  low_stock_threshold: number | string;
  stock_status: string;
  warehouse_location: string | null;
  deleted_at: string | null;
};

type CatalogDepartment = {
  id: string;
  slug: string;
  name: string;
  description: string;
  isActive: boolean;
  categories: CatalogCategory[];
  brands: CatalogBrand[];
  products: CatalogProduct[];
};

type CatalogCategory = {
  id: string;
  departmentId: string;
  departmentSlug: string;
  departmentName: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  isActive: boolean;
  products: CatalogProduct[];
  brands: CatalogBrand[];
};

type CatalogBrand = {
  id: string;
  departmentId: string;
  departmentSlug: string;
  departmentName: string;
  categoryId: string | null;
  categorySlug: string | null;
  categoryName: string | null;
  name: string;
  slug: string;
  description: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  products: CatalogProduct[];
};

type CatalogProduct = Product & {
  departmentId: string;
  departmentSlug: string;
  departmentName: string;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  brandId: string;
  brandSlug: string;
  brandName: string;
  sku: string;
  description: string;
  shortDescription: string;
  gstRate: number;
  specification: JsonRecord | null;
  attributes: JsonRecord | null;
  status: string;
  featured: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  stockCount: number;
  reservedCount: number;
  lowStockThreshold: number;
  primaryImageUrl: string;
  gallery: string[];
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
  scene: "living-room" | "house" | "bucket" | "wall" | "roof" | "wood" | "metal" | "tools" | "pipes" | "pipes-cold" | "fittings" | "faucet" | "valve" | "pump" | "tank" | "bathroom";
  keywords: string[];
};

type SearchProduct = CatalogProduct & {
  brand: string;
  href: string;
  keywords: string[];
  isFeatured: boolean;
  isNew: boolean;
};

type SearchResults = {
  products: SearchProduct[];
  brands: SearchBrand[];
  categories: SearchCategory[];
};

type CategoryBrand = {
  name: string;
  category: "Paint" | "Plumbing" | "Tools" | "Hardware" | "Electrical";
  description: string;
  href: string;
  logo?: string;
};

type RelatedCategory = {
  name: string;
  slug: string;
  href: string;
  scene:
    | "living-room"
    | "house"
    | "bucket"
    | "wall"
    | "roof"
    | "wood"
    | "metal"
    | "tools"
    | "pipes"
    | "pipes-cold"
    | "fittings"
    | "faucet"
    | "valve"
    | "pump"
    | "tank"
    | "bathroom";
};

type CategoryTone = {
  fill: string;
  ring: string;
  accentRgb: string;
  wash: string;
};

type CategoryContent = {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  subtitle: string;
  scene: RelatedCategory["scene"];
  tone: CategoryTone;
  productIds: string[];
  catalog: Array<{
    productId: string;
    brand: string;
    isFeatured?: boolean;
    isNew?: boolean;
  }>;
  brands: CategoryBrand[];
  relatedCategories: RelatedCategory[];
  buyingGuide: string[];
  faq: Array<{ question: string; answer: string }>;
  promotionalBanner: string;
};

type BrandTheme = "paint" | "plumbing";

type BrandCategoryItem = {
  name: string;
  description: string;
  href: string;
  scene:
    | "living-room"
    | "house"
    | "bucket"
    | "wall"
    | "roof"
    | "wood"
    | "metal"
    | "tools"
    | "pipes"
    | "pipes-cold"
    | "fittings"
    | "faucet"
    | "valve"
    | "pump"
    | "tank"
    | "bathroom";
};

type BrandCollectionItem = {
  name: string;
  description: string;
  href: string;
  scene:
    | "living-room"
    | "house"
    | "bucket"
    | "wall"
    | "roof"
    | "wood"
    | "metal"
    | "tools"
    | "pipes"
    | "pipes-cold"
    | "fittings"
    | "faucet"
    | "valve"
    | "pump"
    | "tank"
    | "bathroom";
};

type BrandCertification = {
  label: string;
  note: string;
};

type BrandPillar = {
  title: string;
  description: string;
};

type BrandFaq = {
  question: string;
  answer: string;
};

type BrandHistoryItem = {
  year: string;
  title: string;
  description: string;
};

type BrandContent = {
  slug: string;
  name: string;
  logo: string;
  tagline: string;
  heroScene: BrandCategoryItem["scene"];
  heroImagePlaceholder: string;
  description: string;
  founded: number;
  headquarters: string;
  theme: BrandTheme;
  categories: BrandCategoryItem[];
  featuredProductIds: string[];
  recentProductIds: string[];
  certifications: BrandCertification[];
  popularCollections: BrandCollectionItem[];
  faqs: BrandFaq[];
  buyingGuide: string[];
  relatedBrandSlugs: string[];
  history: BrandHistoryItem[];
  strengths: string[];
  trustPillars: BrandPillar[];
};

type DepartmentTone = {
  fill: string;
  ring: string;
  accentRgb: string;
  wash: string;
};

type DepartmentCategoryItem = {
  name: string;
  description: string;
  href: string;
  initials: string;
  tone: DepartmentTone;
};

type DepartmentBrandItem = {
  name: string;
  category: "Paint" | "Plumbing";
  description: string;
  initials: string;
  href: string;
  tone: DepartmentTone;
};

type DepartmentContent = {
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
  categories: DepartmentCategoryItem[];
  brands: DepartmentBrandItem[];
  featuredProductIds: string[];
};

type ProductVariant = {
  label: string;
  value: string;
  group: string | null;
  isDefault: boolean;
};

type ProductSpecification = {
  label: string;
  value: string;
};

type ProductDownload = {
  label: string;
  meta: string;
};

type ProductReview = {
  name: string;
  title: string;
  rating: number;
  date: string;
  body: string;
};

type ProductFaq = {
  question: string;
  answer: string;
};

type ProductDetail = {
  slug: string;
  brand: string;
  brandAccent: "paint" | "plumbing" | "tools";
  brandDescription: string;
  gallery: string[];
  variants: ProductVariant[];
  description: string;
  highlights: string[];
  specifications: ProductSpecification[];
  applications: string[];
  downloads: ProductDownload[];
  reviews: ProductReview[];
  faq: ProductFaq[];
  delivery: string[];
  gstRate: number;
  stockMessage: string;
  stockCount: number;
  relatedProductIds: string[];
  recentProductIds: string[];
  bundleProductIds: string[];
};

type CatalogSnapshot = {
  departments: CatalogDepartment[];
  categories: CatalogCategory[];
  brands: CatalogBrand[];
  products: CatalogProduct[];
  imagesByProductId: Map<string, ProductImageRow[]>;
  variantsByProductId: Map<string, ProductVariantRow[]>;
  inventoriesByVariantId: Map<string, InventoryRow[]>;
  searchBrands: SearchBrand[];
  searchCategories: SearchCategory[];
  searchProducts: SearchProduct[];
  byDepartmentSlug: Map<string, CatalogDepartment>;
  byCategorySlug: Map<string, CatalogCategory>;
  byBrandSlug: Map<string, CatalogBrand>;
  byProductSlug: Map<string, CatalogProduct>;
};

const DEFAULT_PRODUCT_IMAGE =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" role="img" aria-label="Product placeholder">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#f8efe5"/>
          <stop offset="100%" stop-color="#e8f2fb"/>
        </linearGradient>
      </defs>
      <rect width="800" height="800" rx="48" fill="url(#g)"/>
      <circle cx="400" cy="330" r="120" fill="rgba(255,255,255,0.75)"/>
      <rect x="240" y="500" width="320" height="38" rx="19" fill="rgba(15,23,42,0.14)"/>
      <rect x="290" y="558" width="220" height="22" rx="11" fill="rgba(15,23,42,0.10)"/>
    </svg>`,
  );

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function toBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function initialsFrom(value: string) {
  return value
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function departmentTone(slug: string): DepartmentTone {
  if (slug === "plumbing") {
    return {
      fill: "from-cyan-50 via-white to-sky-50",
      ring: "ring-cyan-200",
      accentRgb: "rgb(6 182 212)",
      wash: "rgba(6, 182, 212, 0.16)",
    };
  }

  return {
    fill: "from-amber-50 via-white to-orange-50",
    ring: "ring-amber-200",
    accentRgb: "rgb(245 158 11)",
    wash: "rgba(245, 158, 11, 0.16)",
  };
}

function categoryScene(name: string, departmentSlug: string): BrandCategoryItem["scene"] {
  const lower = normalize(name);

  if (departmentSlug === "plumbing") {
    if (lower.includes("cpvc")) return "pipes-cold";
    if (lower.includes("fitting")) return "fittings";
    if (lower.includes("faucet")) return "faucet";
    if (lower.includes("valve")) return "valve";
    if (lower.includes("pump")) return "pump";
    if (lower.includes("tank")) return "tank";
    if (lower.includes("bath")) return "bathroom";
    return "pipes";
  }

  if (lower.includes("wood")) return "wood";
  if (lower.includes("metal")) return "metal";
  if (lower.includes("primer") || lower.includes("putty")) return "bucket";
  if (lower.includes("waterproof")) return "roof";
  if (lower.includes("tool")) return "tools";
  if (lower.includes("wall")) return "wall";
  return "living-room";
}

function brandThemeFromDepartment(slug: string): BrandTheme {
  return slug === "plumbing" ? "plumbing" : "paint";
}

function buildProductReviewCount(attributes: JsonRecord | null) {
  return toNumber(attributes?.review_count ?? attributes?.reviews_count ?? attributes?.reviewCount, 0);
}

function buildProductRating(attributes: JsonRecord | null) {
  const rating = toNumber(attributes?.rating ?? attributes?.average_rating, 0);
  return rating > 0 ? rating : 4.5;
}

function buildSearchKeywords(product: CatalogProduct) {
  return [
    product.name,
    product.sku,
    product.brandName,
    product.categoryName,
    product.departmentName,
    product.slug,
  ];
}

function buildProductFromRow(
  row: ProductRow,
  lookups: {
    departmentsById: Map<string, DepartmentRow>;
    categoriesById: Map<string, CategoryRow>;
    brandsById: Map<string, BrandRow>;
    imagesByProductId: Map<string, ProductImageRow[]>;
    variantsByProductId: Map<string, ProductVariantRow[]>;
    inventoriesByVariantId: Map<string, InventoryRow[]>;
  },
): CatalogProduct | null {
  if (row.status !== "active" || row.deleted_at) {
    return null;
  }

  const department = lookups.departmentsById.get(row.department_id);
  const category = lookups.categoriesById.get(row.category_id);
  const brand = lookups.brandsById.get(row.brand_id);

  if (!department || !category || !brand) {
    return null;
  }

  const images = (lookups.imagesByProductId.get(row.id) ?? [])
    .filter((image) => image.deleted_at === null)
    .sort((left, right) => left.sort_order - right.sort_order);
  const variants = (lookups.variantsByProductId.get(row.id) ?? []).filter((variant) => variant.deleted_at === null);
  const inventories = variants.flatMap((variant) =>
    (lookups.inventoriesByVariantId.get(variant.id) ?? []).filter((inventory) => inventory.deleted_at === null),
  );
  const stockCount = inventories.reduce((sum, inventory) => sum + toNumber(inventory.current_quantity), 0);
  const reservedCount = inventories.reduce((sum, inventory) => sum + toNumber(inventory.reserved_quantity), 0);
  const lowStockThreshold = inventories.length > 0 ? toNumber(inventories[0]?.low_stock_threshold, 10) : 10;
  const gallery = images.map((image) => image.image_url);
  const primaryImageUrl = images.find((image) => image.is_primary)?.image_url ?? images[0]?.image_url ?? row.og_image_url ?? DEFAULT_PRODUCT_IMAGE;
  const price = toNumber(row.selling_price);
  const mrp = toNumber(row.mrp);
  const compareAtPrice = mrp > price ? mrp : undefined;
  const isNew = new Date(row.created_at).getTime() > Date.now() - 1000 * 60 * 60 * 24 * 45;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    price,
    compareAtPrice,
    image: primaryImageUrl,
    category: category.name,
    sku: row.sku,
    rating: buildProductRating(row.attributes),
    reviewCount: buildProductReviewCount(row.attributes),
    inStock: stockCount > 0,
    badge: row.featured ? "bestseller" : compareAtPrice && compareAtPrice > price ? "sale" : isNew ? "new" : undefined,
    departmentId: department.id,
    departmentSlug: department.slug,
    departmentName: department.name,
    categoryId: category.id,
    categorySlug: category.slug,
    categoryName: category.name,
    brandId: brand.id,
    brandSlug: brand.slug,
    brandName: brand.name,
    description: row.description ?? "",
    shortDescription: row.short_description ?? "",
    gstRate: toNumber(row.gst_rate, 18),
    specification: row.specification,
    attributes: row.attributes,
    status: row.status,
    featured: row.featured,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    stockCount,
    reservedCount,
    lowStockThreshold,
    primaryImageUrl,
    gallery: gallery.length > 0 ? gallery : [primaryImageUrl],
    isNew,
  };
}

function makeBrandTagline(brand: Pick<CatalogBrand, "name" | "description">) {
  return brand.description || `${brand.name} products for modern projects.`;
}

function makeDepartmentDescription(slug: string) {
  return slug === "plumbing"
    ? "Premium plumbing essentials, fittings, and water management products for modern homes."
    : "Premium paint systems, finishes, and surface prep essentials for every project.";
}

function makeCategoryDescription(name: string, departmentSlug: string) {
  return departmentSlug === "plumbing"
    ? `Browse ${name.toLowerCase()} and water-management essentials designed for clean, reliable installations.`
    : `Discover ${name.toLowerCase()} products and surface-prep essentials for premium wall finishes.`;
}

function makeBuyingGuide(departmentSlug: string, categoryName?: string) {
  if (departmentSlug === "plumbing") {
    return [
      "Match pipe, fitting, and valve choices with the installation pressure and temperature.",
      "Choose compatible accessories from the same system for smoother installation.",
      "For bathrooms and fixtures, prioritize finish quality and serviceability.",
    ];
  }

  return [
    `Choose the right finish for ${categoryName ? categoryName.toLowerCase() : "your room"} based on usage and light exposure.`,
    "Pair primers and preparation systems with the final coat to improve durability.",
    "For exterior work, confirm weather resistance and recommended recoat intervals before purchase.",
  ];
}

function makeFaq(departmentSlug: string, categoryName?: string) {
  if (departmentSlug === "plumbing") {
    return [
      {
        question: "How do I choose the right plumbing accessory?",
        answer: "Match the material, pressure rating, and compatibility with the existing installation.",
      },
      {
        question: "What should I check before buying fittings?",
        answer: "Confirm dimensions, material grade, and the exact application for the fitting or valve.",
      },
    ];
  }

  return [
    {
      question: `Which paint is best for ${categoryName ? categoryName.toLowerCase() : "this space"}?`,
      answer: "Choose the finish based on traffic, light exposure, and the surface preparation level.",
    },
    {
      question: "Should I use primer before painting?",
      answer: "Primer is recommended for better adhesion, smoother finish, and longer product life.",
    },
  ];
}

function makeApplications(departmentSlug: string, categoryName: string) {
  if (departmentSlug === "plumbing") {
    return [categoryName, "Bathroom", "Kitchen", "Utility Room"].filter(Boolean);
  }

  return [categoryName, "Living Room", "Bedroom", "Exterior"].filter(Boolean);
}

function makeBrandAccent(departmentSlug: string): "paint" | "plumbing" | "tools" {
  return departmentSlug === "plumbing" ? "plumbing" : "paint";
}

type CatalogSnapshotData = {
  departments: DepartmentRow[];
  categories: CategoryRow[];
  brands: BrandRow[];
  products: ProductRow[];
  productImages: ProductImageRow[];
  productVariants: ProductVariantRow[];
  inventories: InventoryRow[];
};

function buildSnapshot(data: CatalogSnapshotData): CatalogSnapshot {
  const departmentsById = new Map(data.departments.map((item) => [item.id, item]));
  const categoriesById = new Map(data.categories.map((item) => [item.id, item]));
  const brandsById = new Map(data.brands.map((item) => [item.id, item]));
  const imagesByProductId = new Map<string, ProductImageRow[]>();
  const variantsByProductId = new Map<string, ProductVariantRow[]>();
  const inventoriesByVariantId = new Map<string, InventoryRow[]>();

  for (const image of data.productImages) {
    const list = imagesByProductId.get(image.product_id) ?? [];
    list.push(image);
    imagesByProductId.set(image.product_id, list);
  }

  for (const variant of data.productVariants) {
    const list = variantsByProductId.get(variant.product_id) ?? [];
    list.push(variant);
    variantsByProductId.set(variant.product_id, list);
  }

  for (const inventory of data.inventories) {
    const list = inventoriesByVariantId.get(inventory.product_variant_id) ?? [];
    list.push(inventory);
    inventoriesByVariantId.set(inventory.product_variant_id, list);
  }

  const products = data.products
    .map((row) =>
      buildProductFromRow(row, {
        departmentsById,
        categoriesById,
        brandsById,
        imagesByProductId,
        variantsByProductId,
        inventoriesByVariantId,
      }),
    )
    .filter((item): item is CatalogProduct => Boolean(item));

  const departments = data.departments
    .filter((row) => row.deleted_at === null && toBoolean(row.is_active, true))
    .sort((left, right) => toNumber(left.sort_order, 0) - toNumber(right.sort_order, 0))
    .map((row) => {
      const departmentProducts = products.filter((product) => product.departmentId === row.id);
      return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        description: row.description ?? makeDepartmentDescription(row.slug),
        isActive: toBoolean(row.is_active, true),
        categories: [],
        brands: [],
        products: departmentProducts,
      } satisfies CatalogDepartment;
    });

  const categories = data.categories
    .filter((row) => row.deleted_at === null && toBoolean(row.is_active, true))
    .map((row) => {
      const department = departmentsById.get(row.department_id);
      const departmentSlug = department?.slug ?? "paints";
      const departmentName = department?.name ?? "Paints";
      const categoryProducts = products.filter((product) => product.categoryId === row.id);
      const categoryBrands = data.brands
        .filter((brand) => brand.category_id === row.id && brand.deleted_at === null && toBoolean(brand.is_active, true))
        .map((brand) => {
          const dept = departmentsById.get(brand.department_id);
          return {
            id: brand.id,
            departmentId: brand.department_id,
            departmentSlug: dept?.slug ?? departmentSlug,
            departmentName: dept?.name ?? departmentName,
            categoryId: brand.category_id,
            categorySlug: row.slug,
            categoryName: row.name,
            name: brand.name,
            slug: brand.slug,
            description: brand.description ?? makeBrandTagline({ name: brand.name, description: "" }),
            logoUrl: brand.logo_url,
            websiteUrl: brand.website_url,
            isActive: toBoolean(brand.is_active, true),
            isFeatured: toBoolean(brand.is_featured, false),
            createdAt: brand.created_at,
            products: categoryProducts.filter((product) => product.brandId === brand.id),
          } satisfies CatalogBrand;
        });

      return {
        id: row.id,
        departmentId: row.department_id,
        departmentSlug,
        departmentName,
        name: row.name,
        slug: row.slug,
        description: row.description ?? makeCategoryDescription(row.name, departmentSlug),
        imageUrl: row.image_url,
        isActive: toBoolean(row.is_active, true),
        products: categoryProducts,
        brands: categoryBrands,
      } satisfies CatalogCategory;
    });

  const brands = data.brands
    .filter((row) => row.deleted_at === null && toBoolean(row.is_active, true))
    .map((row) => {
      const department = departmentsById.get(row.department_id);
      const category = row.category_id ? categoriesById.get(row.category_id) : null;
      const departmentSlug = department?.slug ?? "paints";
      const departmentName = department?.name ?? "Paints";
      const brandProducts = products.filter((product) => product.brandId === row.id);
      return {
        id: row.id,
        departmentId: row.department_id,
        departmentSlug,
        departmentName,
        categoryId: row.category_id,
        categorySlug: category?.slug ?? null,
        categoryName: category?.name ?? null,
        name: row.name,
        slug: row.slug,
        description: row.description ?? `${row.name} products for modern projects.`,
        logoUrl: row.logo_url,
        websiteUrl: row.website_url,
        isActive: toBoolean(row.is_active, true),
        isFeatured: toBoolean(row.is_featured, false),
        createdAt: row.created_at,
        products: brandProducts,
      } satisfies CatalogBrand;
    });

  const byDepartmentSlug = new Map(departments.map((item) => [item.slug, item]));
  const byCategorySlug = new Map(categories.map((item) => [item.slug, item]));
  const byBrandSlug = new Map(brands.map((item) => [item.slug, item]));
  const byProductSlug = new Map(products.map((item) => [item.slug, item]));

  const searchProducts: SearchProduct[] = products.map((product) => ({
    ...product,
    brand: product.brandName,
    href: `/product/${product.slug}`,
    keywords: buildSearchKeywords(product),
    isFeatured: product.featured,
    isNew: product.isNew,
  }));

  const searchBrands: SearchBrand[] = brands.map((brand) => ({
    slug: brand.slug,
    name: brand.name,
    category: brand.departmentSlug === "plumbing" ? "Plumbing" : "Paint",
    tagline: brand.description,
    href: `/brand/${brand.slug}`,
    logo: brand.logoUrl ?? "",
    keywords: [
      brand.name,
      brand.description,
      brand.departmentName,
      brand.categoryName ?? "",
    ].filter(Boolean),
  }));

  const searchCategories: SearchCategory[] = categories.map((category) => ({
    slug: category.slug,
    name: category.name,
    href: `/category/${category.slug}`,
    description: category.description,
    scene: categoryScene(category.name, category.departmentSlug),
    keywords: [category.name, category.description, category.departmentName, category.departmentSlug],
  }));

  return {
    departments,
    categories,
    brands,
    products,
    imagesByProductId,
    variantsByProductId,
    inventoriesByVariantId,
    searchBrands,
    searchCategories,
    searchProducts,
    byDepartmentSlug,
    byCategorySlug,
    byBrandSlug,
    byProductSlug,
  };
}

const loadCatalogSnapshotData = unstable_cache(
  async (): Promise<CatalogSnapshotData> => {
    const client = getSupabasePublicServerClient();

    if (!client) {
      return {
        departments: [],
        categories: [],
        brands: [],
        products: [],
        productImages: [],
        productVariants: [],
        inventories: [],
      };
    }

    const [departmentsResult, categoriesResult, brandsResult, productsResult] = await Promise.all([
      client
        .from("departments")
        .select("id, name, slug, description, is_active, deleted_at, sort_order")
        .is("deleted_at", null)
        .order("sort_order", { ascending: true }),
      client
        .from("categories")
        .select("id, department_id, name, slug, description, image_url, is_active, deleted_at")
        .is("deleted_at", null)
        .order("created_at", { ascending: true }),
      client
        .from("brands")
        .select("id, department_id, category_id, name, slug, description, logo_url, website_url, is_active, is_featured, deleted_at, created_at")
        .is("deleted_at", null)
        .order("created_at", { ascending: true }),
      client
        .from("products")
        .select(
          "id, department_id, category_id, brand_id, slug, sku, name, description, short_description, gst_rate, mrp, selling_price, discount_amount, discount_percent, status, featured, meta_title, meta_description, meta_keywords, canonical_url, og_image_url, specification, attributes, deleted_at, created_at, updated_at",
        )
        .is("deleted_at", null)
        .eq("status", "active")
        .order("updated_at", { ascending: false }),
    ]);

    const productIds = (productsResult.data ?? []).map((row) => row.id as string);
    const variantIds: string[] = [];

    const [imagesResult, variantsResult] = await Promise.all([
      productIds.length > 0
        ? client
            .from("product_images")
            .select("id, product_id, image_url, alt_text, sort_order, is_primary, deleted_at")
            .in("product_id", productIds)
            .is("deleted_at", null)
            .order("sort_order", { ascending: true })
        : Promise.resolve({ data: [] as ProductImageRow[] }),
      productIds.length > 0
        ? client
            .from("product_variants")
            .select("id, product_id, sku, variant_name, option_label, option_value, variant_options, mrp_override, selling_price_override, barcode, weight, is_default, is_active, deleted_at")
            .in("product_id", productIds)
            .is("deleted_at", null)
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [] as ProductVariantRow[] }),
    ]);

    for (const variant of variantsResult.data ?? []) {
      variantIds.push(variant.id as string);
    }

    const inventoriesResult =
      variantIds.length > 0
        ? await client
            .from("inventory")
            .select("id, product_variant_id, current_quantity, reserved_quantity, low_stock_threshold, stock_status, warehouse_location, deleted_at")
            .in("product_variant_id", variantIds)
            .is("deleted_at", null)
            .order("created_at", { ascending: true })
        : { data: [] as InventoryRow[] };

    return {
      departments: (departmentsResult.data ?? []) as DepartmentRow[],
      categories: (categoriesResult.data ?? []) as CategoryRow[],
      brands: (brandsResult.data ?? []) as BrandRow[],
      products: (productsResult.data ?? []) as ProductRow[],
      productImages: (imagesResult.data ?? []) as ProductImageRow[],
      productVariants: (variantsResult.data ?? []) as ProductVariantRow[],
      inventories: (inventoriesResult.data ?? []) as InventoryRow[],
    };
  },
  ["uniqueshopee-live-catalog"],
  { revalidate: 60 },
);

export async function getCatalogSnapshot() {
  return buildSnapshot(await loadCatalogSnapshotData());
}

export async function getLiveProducts() {
  return (await getCatalogSnapshot()).products;
}

export async function getLiveSearchData(): Promise<SearchResults> {
  const snapshot = await getCatalogSnapshot();
  return {
    products: snapshot.searchProducts,
    brands: snapshot.searchBrands,
    categories: snapshot.searchCategories,
  };
}

export async function getLiveHomeData() {
  const snapshot = await getCatalogSnapshot();
  const paints = snapshot.products.filter((product) => product.departmentSlug === "paints");
  const plumbing = snapshot.products.filter((product) => product.departmentSlug === "plumbing");
  const featuredProducts = snapshot.products
    .filter((product) => product.featured)
    .slice(0, 4);
  const homeProducts = [paints[0], plumbing[0], paints[1], plumbing[1]].filter(Boolean) as CatalogProduct[];
  const brandChips = snapshot.brands.slice(0, 7).map((brand) => ({
    name: brand.name,
    href: `/brand/${brand.slug}`,
  }));

  return {
    products: snapshot.products,
    featuredProducts: featuredProducts.length > 0 ? featuredProducts : snapshot.products.slice(0, 4),
    homeProducts: homeProducts.length > 0 ? homeProducts : snapshot.products.slice(0, 4),
    brandChips,
  };
}

export async function getLiveProductBySlug(slug: string) {
  const snapshot = await getCatalogSnapshot();
  const product = snapshot.byProductSlug.get(slug);

  if (!product) {
    return null;
  }

  const brand = snapshot.byBrandSlug.get(product.brandSlug);
  const imageRows = (snapshot.imagesByProductId.get(product.id) ?? [])
    .filter((image) => image.deleted_at === null)
    .sort((left, right) => left.sort_order - right.sort_order);
  const variantRows = (snapshot.variantsByProductId.get(product.id) ?? []).filter((variant) => variant.deleted_at === null);
  const relatedProducts = snapshot.products
    .filter((item) => item.slug !== slug && (item.categorySlug === product.categorySlug || item.brandSlug === product.brandSlug))
    .slice(0, 4);
  const recentlyViewedProducts = snapshot.products.filter((item) => item.slug !== slug).slice(0, 4);
  const bundleProducts = relatedProducts.length > 0 ? relatedProducts.slice(0, 2) : recentlyViewedProducts.slice(0, 2);
  const relatedIds = Array.isArray(product.attributes?.related_product_ids)
    ? (product.attributes?.related_product_ids as string[])
    : relatedProducts.map((item) => item.id);

  return {
    product,
    detail: {
      slug: product.slug,
      brand: brand?.name ?? product.brandName,
      brandAccent: makeBrandAccent(product.departmentSlug),
      brandDescription: brand?.description ?? `${product.brandName} products for modern projects and reliable everyday use.`,
      gallery:
        imageRows.length > 0
          ? imageRows.map((image) => image.image_url)
          : product.gallery.length > 0
            ? product.gallery
            : [product.primaryImageUrl],
      variants:
        variantRows.length > 0
          ? variantRows.map((variant, index) => ({
              label: variant.option_value || variant.variant_name || `Variant ${index + 1}`,
              value: variant.option_value || variant.sku || variant.id,
              group: variant.option_label?.trim() || null,
              isDefault: variant.is_default,
            }))
          : [{ label: "Default", value: "default", group: null, isDefault: true }],
      description:
        product.shortDescription ||
        product.description ||
        `Premium ${product.categoryName.toLowerCase()} designed for ${product.departmentName.toLowerCase()} applications.`,
      highlights: [
        product.featured ? "Featured catalog pick" : "Live catalog item",
        product.inStock ? "In stock and ready to ship" : "Check availability before purchase",
        `SKU: ${product.sku}`,
        `Category: ${product.categoryName}`,
      ],
      specifications: Object.entries(product.specification ?? {}).map(([key, value]) => ({
        label: key,
        value: String(value ?? ""),
      })),
      applications: makeApplications(product.departmentSlug, product.categoryName),
      downloads: [
        { label: "Product datasheet", meta: "PDF · mock" },
        { label: "Application guide", meta: "PDF · mock" },
      ],
      reviews: [],
      faq: makeFaq(product.departmentSlug, product.categoryName),
      delivery: [
        "Free delivery above ₹2,000",
        "Dispatch in 24-48 hours",
        "Careful packaging for transit",
      ],
      gstRate: product.gstRate,
      stockMessage: product.inStock ? "In stock and ready to ship" : "Out of stock",
      stockCount: product.stockCount,
      relatedProductIds: relatedIds,
      recentProductIds: recentlyViewedProducts.map((item) => item.id),
      bundleProductIds: bundleProducts.map((item) => item.id),
    } satisfies ProductDetail,
  };
}

export async function getLiveCategoryBySlug(slug: string) {
  const snapshot = await getCatalogSnapshot();
  const category = snapshot.byCategorySlug.get(slug);

  if (!category) {
    return null;
  }

  const departmentToneValue = departmentTone(category.departmentSlug);
  const relatedCategories = snapshot.categories
    .filter((item) => item.slug !== slug && item.departmentSlug === category.departmentSlug)
    .slice(0, 4)
    .map((item) => ({
      name: item.name,
      slug: item.slug,
      href: `/category/${item.slug}`,
      scene: categoryScene(item.name, item.departmentSlug),
    }));

  const brands: CategoryBrand[] =
    category.brands.length > 0
      ? category.brands.map((brand) => ({
          name: brand.name,
          category: brand.departmentSlug === "plumbing" ? ("Plumbing" as const) : ("Paint" as const),
          description: brand.description,
          href: `/brand/${brand.slug}`,
          logo: brand.logoUrl ?? undefined,
        }))
      : snapshot.brands
          .filter((brand) => brand.departmentSlug === category.departmentSlug)
          .slice(0, 6)
          .map((brand) => ({
            name: brand.name,
            category: brand.departmentSlug === "plumbing" ? ("Plumbing" as const) : ("Paint" as const),
            description: brand.description,
            href: `/brand/${brand.slug}`,
            logo: brand.logoUrl ?? undefined,
          }));

  const catalog = category.products.map((product) => ({
    productId: product.id,
    brand: product.brandName,
    isFeatured: product.featured,
    isNew: product.isNew,
  }));

  return {
    slug: category.slug,
    title: category.name,
    eyebrow: category.departmentSlug === "plumbing" ? "Flow systems" : "Surface solutions",
    description: category.description,
    subtitle:
      category.departmentSlug === "plumbing"
        ? `Find reliable ${category.name.toLowerCase()} and plumbing essentials for modern homes.`
        : `Explore premium ${category.name.toLowerCase()} products designed for modern walls and surfaces.`,
    scene: categoryScene(category.name, category.departmentSlug),
    tone: departmentToneValue,
    productIds: category.products.map((product) => product.id),
    catalog,
    brands,
    relatedCategories,
    buyingGuide: makeBuyingGuide(category.departmentSlug, category.name),
    faq: makeFaq(category.departmentSlug, category.name),
    promotionalBanner:
      category.departmentSlug === "plumbing"
        ? "Build reliable water systems with premium pipes, fittings, and bathroom hardware from top brands."
        : "Refresh your spaces with premium paint systems, curated tools, and trusted brand collections.",
  } satisfies CategoryContent;
}

export async function getLiveBrandBySlug(slug: string) {
  const snapshot = await getCatalogSnapshot();
  const brand = snapshot.byBrandSlug.get(slug);

  if (!brand) {
    return null;
  }

  const theme = brandThemeFromDepartment(brand.departmentSlug);
  const heroScene = categoryScene(brand.categoryName ?? brand.departmentName, brand.departmentSlug);
  const relatedBrands = snapshot.brands
    .filter((item) => item.slug !== slug && item.departmentSlug === brand.departmentSlug)
    .slice(0, 3);
  const featuredProductIds = brand.products.filter((product) => product.featured).slice(0, 2).map((product) => product.id);
  const recentProductIds = brand.products.slice(0, 3).map((product) => product.id);

  return {
    slug: brand.slug,
    name: brand.name,
    logo: brand.logoUrl ?? `/brands/${brand.slug}.svg`,
    tagline: makeBrandTagline(brand),
    heroScene,
    heroImagePlaceholder: `${brand.name} signature experience`,
    description: brand.description,
    founded: new Date(brand.createdAt ?? brand.products[0]?.createdAt ?? Date.now()).getFullYear(),
    headquarters: brand.departmentName === "Plumbing" ? "India" : "India",
    theme,
    categories: snapshot.categories
      .filter((category) => category.departmentSlug === brand.departmentSlug)
      .slice(0, 6)
      .map((category) => ({
        name: category.name,
        description: category.description,
        href: `/category/${category.slug}`,
        scene: categoryScene(category.name, category.departmentSlug),
      })),
    featuredProductIds,
    recentProductIds,
    certifications:
      brand.departmentSlug === "plumbing"
        ? [
            { label: "ISO 9001", note: "Consistent manufacturing quality" },
            { label: "BIS Ready", note: "Standards-aligned installations" },
            { label: "Pressure Tested", note: "Reliable flow performance" },
            { label: "Lead Safe", note: "Safer water-contact materials" },
          ]
        : [
            { label: "ISO 9001", note: "Quality management systems" },
            { label: "GreenPro", note: "Greener product standards" },
            { label: "VOC Safe", note: "Low-emission formulations" },
            { label: "Warranty Backed", note: "Long-term finish support" },
          ],
    popularCollections: snapshot.categories
      .filter((category) => category.departmentSlug === brand.departmentSlug)
      .slice(0, 3)
      .map((category) => ({
        name: category.name,
        description: category.description,
        href: `/category/${category.slug}`,
        scene: categoryScene(category.name, category.departmentSlug),
      })),
    faqs:
      brand.departmentSlug === "plumbing"
        ? [
            {
              question: "How do I choose between PVC and CPVC?",
              answer: "Use PVC for standard drainage and CPVC where temperature and pressure requirements are higher.",
            },
            {
              question: "What matters most when selecting faucets?",
              answer: "Finish quality, cartridge reliability, and compatibility with the sink or basin matter most.",
            },
          ]
        : [
            {
              question: "Which brand collection should I choose for living spaces?",
              answer: "Pick interior finishes with washable, smooth or silk-like surfaces for a premium everyday look.",
            },
            {
              question: "Do I need primer before painting?",
              answer: "Primer is recommended for better adhesion, smoother finish, and longer product life.",
            },
          ],
    buyingGuide: makeBuyingGuide(brand.departmentSlug, brand.categoryName ?? brand.departmentName),
    relatedBrandSlugs: relatedBrands.map((item) => item.slug),
    history: [
      {
        year: String(new Date(brand.createdAt).getFullYear()),
        title: "Listed in catalog",
        description: `${brand.name} joined the live catalog with a focused product assortment.`,
      },
      {
        year: "Recently",
        title: "Expanded collections",
        description: "The catalog grew with more active products and curated category coverage.",
      },
      {
        year: "Today",
        title: "Premium storefront",
        description: "Customers can explore this brand across the live UniqueShopee storefront.",
      },
    ],
    strengths: [
      `${brand.name} is built for consistent project outcomes and repeatable results.`,
      `Trusted by teams working across ${brand.departmentName.toLowerCase()} projects.`,
      brand.departmentSlug === "plumbing"
        ? "Chosen for reliable flow, installation ease, and long service life."
        : "Loved for elegant finishes, smooth application, and strong colour performance.",
    ],
    trustPillars:
      brand.departmentSlug === "plumbing"
        ? [
            { title: "Reliable flow", description: "Built for smooth, consistent performance in daily use." },
            { title: "Installation ready", description: "Designed to work cleanly with common residential setups." },
            { title: "Long service life", description: "Materials and construction focused on durability." },
            { title: "Trusted by contractors", description: "Frequently chosen for professional plumbing projects." },
          ]
        : [
            { title: "Premium quality", description: "Trusted finishes designed for consistent colour and surface performance." },
            { title: "Wide dealer network", description: "Easy availability through a strong project and retail reach." },
            { title: "Warranty support", description: "Assurance that helps professionals and homeowners buy with confidence." },
            { title: "Trusted professionals", description: "Specified by painters, contractors, and interior specialists." },
          ],
  } satisfies BrandContent;
}

export async function getLiveDepartmentBySlug(slug: string) {
  const snapshot = await getCatalogSnapshot();
  const department = snapshot.byDepartmentSlug.get(slug);

  if (!department) {
    return null;
  }

  const tone = departmentTone(slug);

  return {
    slug: department.slug,
    title: department.name,
    description: department.description,
    eyebrow: slug === "plumbing" ? "Plumbing specialist" : "Paint specialist",
    categories: snapshot.categories
      .filter((category) => category.departmentSlug === slug)
      .slice(0, 8)
      .map((category) => ({
        name: category.name,
        description: category.description,
        href: `/category/${category.slug}`,
        initials: initialsFrom(category.name),
        tone,
      })),
    brands: snapshot.brands
      .filter((brand) => brand.departmentSlug === slug)
      .slice(0, 8)
      .map((brand) => ({
        name: brand.name,
        category: slug === "plumbing" ? ("Plumbing" as const) : ("Paint" as const),
        description: brand.description,
        initials: initialsFrom(brand.name),
        href: `/brand/${brand.slug}`,
        tone,
      })),
    featuredProductIds: department.products.slice(0, 4).map((product) => product.id),
  } satisfies DepartmentContent;
}

export function getCatalogSearchResults(snapshot: SearchResults, query: string) {
  const term = normalize(query);

  const scoreMatch = (subjects: string[]) => {
    if (!term) return 0;
    let score = 0;
    for (const subject of subjects) {
      const value = normalize(subject);
      if (!value) continue;
      if (value === term) score += 100;
      else if (value.startsWith(term)) score += 60;
      else if (value.includes(term)) score += 30;
    }
    return score;
  };

  const products = snapshot.products
    .filter((product) => {
      if (!term) return true;
      return scoreMatch([product.name, product.category, product.brand, ...product.keywords]) > 0;
    })
    .map((product) => ({ product, score: scoreMatch([product.name, product.category, product.brand, ...product.keywords]) }))
    .sort((left, right) => {
      if (!term) {
        return Number(right.product.isFeatured) - Number(left.product.isFeatured) || Number(right.product.isNew) - Number(left.product.isNew);
      }
      return right.score - left.score || (right.product.rating ?? 0) - (left.product.rating ?? 0);
    })
    .map((entry) => entry.product);

  const brands = snapshot.brands
    .filter((brand) => {
      if (!term) return true;
      return scoreMatch([brand.name, brand.category, brand.tagline, ...brand.keywords]) > 0;
    })
    .sort((left, right) => {
      if (!term) return left.name.localeCompare(right.name);
      return left.name.localeCompare(right.name);
    });

  const categories = snapshot.categories
    .filter((category) => {
      if (!term) return true;
      return scoreMatch([category.name, category.description, ...category.keywords]) > 0;
    })
    .sort((left, right) => {
      if (!term) return left.name.localeCompare(right.name);
      return left.name.localeCompare(right.name);
    });

  return {
    products,
    brands,
    categories,
  } satisfies SearchResults;
}

export async function getLiveSearchResults(query: string) {
  const snapshot = await getCatalogSnapshot();
  return getCatalogSearchResults(
    {
      products: snapshot.searchProducts,
      brands: snapshot.searchBrands,
      categories: snapshot.searchCategories,
    },
    query,
  );
}

export async function getLiveHomeBrands() {
  const snapshot = await getCatalogSnapshot();
  return snapshot.brands.map((brand) => ({ name: brand.name, href: `/brand/${brand.slug}` }));
}

export type {
  BrandContent,
  BrandCategoryItem,
  BrandCertification,
  BrandCollectionItem,
  BrandFaq,
  BrandHistoryItem,
  BrandPillar,
  BrandTheme,
  CatalogBrand,
  CatalogCategory,
  CatalogDepartment,
  CatalogProduct,
  CategoryBrand,
  CategoryContent,
  DepartmentBrandItem,
  DepartmentCategoryItem,
  DepartmentContent,
  DepartmentTone,
  ProductDetail,
  ProductDownload,
  ProductFaq,
  ProductReview,
  ProductSpecification,
  ProductVariant,
  RelatedCategory,
  SearchBrand,
  SearchCategory,
  SearchProduct,
  SearchResults,
};
