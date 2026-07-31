"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { uploadCloudinaryImage } from "@/lib/cloudinary";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn, formatPrice } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, FormField } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AdminActionButton,
  AdminSectionCard,
  AdminStatCard,
  AdminStatusBadge,
  PageHeader,
} from "@/components/admin/admin-kit";
import { getQaProductCatalog, isQaBypassEnabled } from "@/lib/qa-mode";
import {
  ChevronDown,
  Copy,
  GripVertical,
  LayoutGrid,
  PenSquare,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Trash2,
  Search,
  X,
} from "lucide-react";

type JsonRecord = Record<string, unknown>;

type DepartmentRecord = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

type CategoryRecord = {
  id: string;
  department_id: string;
  name: string;
  slug: string;
  is_active: boolean;
  deleted_at: string | null;
};

type BrandRecord = {
  id: string;
  department_id: string;
  category_id: string | null;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
  deleted_at: string | null;
};

type ProductRecord = {
  id: string;
  department_id: string;
  category_id: string;
  brand_id: string;
  slug: string;
  sku: string;
  name: string;
  description: string | null;
  short_description: string | null;
  gst_rate: number | string;
  mrp: number | string;
  selling_price: number | string;
  discount_amount: number | string;
  discount_percent: number | string;
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

type ProductImageRecord = {
  id: string;
  product_id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  deleted_at: string | null;
};

type ProductVariantRecord = {
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

type InventoryRecord = {
  id: string;
  product_variant_id: string;
  current_quantity: number | string;
  reserved_quantity: number | string;
  low_stock_threshold: number | string;
  stock_status: string;
  warehouse_location: string | null;
  deleted_at: string | null;
};

type ProductImageDraft = {
  id: string;
  url: string;
  alt: string;
  primary: boolean;
};

type ProductVariantDraft = {
  id: string;
  variantName: string;
  optionLabel: string;
  optionValue: string;
  sku: string;
  price: string;
  stock: string;
  imageUrl: string;
  active: boolean;
  primary: boolean;
};

type SpecDraft = {
  id: string;
  key: string;
  value: string;
};

type ProductFormState = {
  name: string;
  slug: string;
  sku: string;
  shortDescription: string;
  description: string;
  departmentId: string;
  categoryId: string;
  brandId: string;
  status: string;
  featured: boolean;
  mrp: string;
  sellingPrice: string;
  gstRate: string;
  hsnCode: string;
  stockQuantity: string;
  reservedQuantity: string;
  lowStockThreshold: string;
  warehouseLocation: string;
  weight: string;
  length: string;
  width: string;
  height: string;
  packageType: string;
  fragile: boolean;
  seoTitle: string;
  metaDescription: string;
  keywords: string;
  canonicalUrl: string;
  images: ProductImageDraft[];
  variants: ProductVariantDraft[];
  specifications: SpecDraft[];
  relatedProductIds: string[];
};

type ProductSummary = {
  record: ProductRecord;
  departmentName: string;
  categoryName: string;
  brandName: string;
  stock: number;
  stockStatus: string;
  primaryImage: string | null;
};

const PRODUCT_PAGE_SIZE = 6;
const productStatuses = ["draft", "active", "inactive", "out_of_stock", "archived"] as const;
const CORE_DEPARTMENTS = [
  { name: "Paints", slug: "paints" },
  { name: "Plumbing", slug: "plumbing" },
] as const;
const CORE_CATEGORY_SEEDS: Record<string, Array<{ name: string; slug: string }>> = {
  paints: [
    { name: "Interior Paint", slug: "interior-paint" },
    { name: "Exterior Paint", slug: "exterior-paint" },
    { name: "Wall Putty", slug: "wall-putty" },
    { name: "Primer", slug: "primer" },
    { name: "Waterproofing", slug: "waterproofing" },
    { name: "Wood Finish", slug: "wood-finish" },
    { name: "Metal Paint", slug: "metal-paint" },
    { name: "Paint Tools", slug: "paint-tools" },
  ],
  plumbing: [
    { name: "Pipes", slug: "pipes" },
    { name: "Fittings", slug: "fittings" },
    { name: "Faucets", slug: "faucets" },
    { name: "Valves", slug: "valves" },
    { name: "Pumps", slug: "pumps" },
    { name: "Bathroom Accessories", slug: "bathroom-accessories" },
    { name: "Water Tanks", slug: "water-tanks" },
    { name: "Sealants", slug: "sealants" },
  ],
};
const DEPARTMENT_FIELD_PRESETS: Record<string, Array<{ key: string; label: string; placeholder: string }>> = {
  paints: [
    { key: "paint_type", label: "Paint Type", placeholder: "Emulsion, enamel, primer" },
    { key: "finish", label: "Finish", placeholder: "Matte, glossy, satin" },
    { key: "colour", label: "Colour", placeholder: "White, ivory, custom shade" },
    { key: "shade_code", label: "Shade Code", placeholder: "PS-1024" },
    { key: "coverage", label: "Coverage", placeholder: "120 sq ft / litre" },
    { key: "dry_time", label: "Dry Time", placeholder: "30 minutes" },
    { key: "surface_type", label: "Surface Type", placeholder: "Interior wall, wood, metal" },
  ],
  plumbing: [
    { key: "material", label: "Material", placeholder: "Brass, PVC, steel" },
    { key: "pipe_size", label: "Pipe Size", placeholder: "1/2 inch" },
    { key: "size", label: "Size", placeholder: "20 mm" },
    { key: "connection_type", label: "Connection Type", placeholder: "Threaded, compression" },
    { key: "pressure_rating", label: "Pressure Rating", placeholder: "12 bar" },
    { key: "finish", label: "Finish", placeholder: "Chrome, matte, polished" },
    { key: "colour", label: "Colour", placeholder: "Silver, black, white" },
  ],
};

const PRODUCT_FORM_INITIAL: ProductFormState = {
  name: "",
  slug: "",
  sku: "",
  shortDescription: "",
  description: "",
  departmentId: "",
  categoryId: "",
  brandId: "",
  status: "active",
  featured: false,
  mrp: "",
  sellingPrice: "",
  gstRate: "18",
  hsnCode: "",
  stockQuantity: "0",
  reservedQuantity: "0",
  lowStockThreshold: "10",
  warehouseLocation: "",
  weight: "",
  length: "",
  width: "",
  height: "",
  packageType: "",
  fragile: false,
  seoTitle: "",
  metaDescription: "",
  keywords: "",
  canonicalUrl: "",
  images: [],
  variants: [],
  specifications: [],
  relatedProductIds: [],
};

function slugifyProduct(value: string) {
  return value
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/['"]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function slugifyCategory(value: string) {
  return slugifyProduct(value);
}

function cleanNumberInput(value: string) {
  return value.replace(/[^0-9.]/g, "");
}

function parseNumber(value: string) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : 0;
}

function generateFallbackSku(value: string) {
  const base = slugifyProduct(value).replace(/-/g, "").slice(0, 8).toUpperCase() || "PROD";
  return `${base}-${Date.now().toString(36).toUpperCase()}`;
}

function formatStatusLabel(status: string, deletedAt?: string | null) {
  if (deletedAt) return "Deleted";
  return status;
}

function stockStatusFromValues(currentQuantity: number, reservedQuantity: number, threshold: number) {
  const available = Math.max(currentQuantity - reservedQuantity, 0);
  if (available <= 0) return "out_of_stock";
  if (available <= threshold) return "low_stock";
  return "in_stock";
}

function makeId() {
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

function createImageDraft(url: string, index: number): ProductImageDraft {
  return {
    id: makeId(),
    url,
    alt: "",
    primary: index === 0,
  };
}

function createVariantDraft(seed?: Partial<ProductVariantDraft>): ProductVariantDraft {
  return {
    id: makeId(),
    variantName: seed?.variantName ?? "Default",
    optionLabel: seed?.optionLabel ?? "",
    optionValue: seed?.optionValue ?? "",
    sku: seed?.sku ?? "",
    price: seed?.price ?? "",
    stock: seed?.stock ?? "",
    imageUrl: seed?.imageUrl ?? "",
    active: seed?.active ?? true,
    primary: seed?.primary ?? false,
  };
}

function createSpecDraft(seed?: Partial<SpecDraft>): SpecDraft {
  return {
    id: makeId(),
    key: seed?.key ?? "",
    value: seed?.value ?? "",
  };
}

function getSpecValue(specifications: SpecDraft[], key: string) {
  return specifications.find((spec) => spec.key === key)?.value ?? "";
}

function upsertSpecValue(specifications: SpecDraft[], key: string, value: string) {
  const index = specifications.findIndex((spec) => spec.key === key);
  if (index >= 0) {
    return specifications.map((spec) => (spec.key === key ? { ...spec, value } : spec));
  }

  return [...specifications, createSpecDraft({ key, value })];
}

function buildEmptyProductForm(): ProductFormState {
  return {
    ...PRODUCT_FORM_INITIAL,
    images: [],
    variants: [],
    specifications: [],
  };
}

type PickerMode = "category" | "brand" | null;

function buildProductFormFromSummary(summary: ProductSummary, images: ProductImageRecord[], variants: ProductVariantRecord[], inventories: InventoryRecord[]) {
  const record = summary.record;
  const productImages = images
    .filter((image) => image.deleted_at === null)
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((image) => ({
      id: image.id,
      url: image.image_url,
      alt: image.alt_text ?? "",
      primary: image.is_primary,
    }));

  const variantDrafts = variants
    .filter((variant) => variant.deleted_at === null)
    .map((variant) => {
      const inventory = inventories.find((item) => item.product_variant_id === variant.id && item.deleted_at === null);
      return {
        id: variant.id,
        variantName: variant.variant_name,
        optionLabel: variant.option_label ?? "",
        optionValue: variant.option_value ?? "",
        sku: variant.sku,
        price: String(variant.selling_price_override ?? ""),
        stock: String(inventory?.current_quantity ?? 0),
        imageUrl: "",
        active: variant.is_active,
        primary: variant.is_default,
      };
    });

  const specs = Object.entries((record.specification ?? {}) as JsonRecord).map(([key, value]) => createSpecDraft({ key, value: String(value ?? "") }));
  const relatedIds = Array.isArray(record.attributes?.related_product_ids)
    ? (record.attributes?.related_product_ids as string[])
    : [];

  const shipping = (record.attributes?.shipping as JsonRecord | undefined) ?? {};

  return {
    name: record.name,
    slug: record.slug,
    sku: record.sku,
    shortDescription: record.short_description ?? "",
    description: record.description ?? "",
    departmentId: record.department_id,
    categoryId: record.category_id,
    brandId: record.brand_id,
    status: record.status,
    featured: record.featured,
    mrp: String(record.mrp),
    sellingPrice: String(record.selling_price),
    gstRate: String(record.gst_rate),
    hsnCode: String(record.attributes?.hsn_code ?? ""),
    stockQuantity: String(inventories[0]?.current_quantity ?? 0),
    reservedQuantity: String(inventories[0]?.reserved_quantity ?? 0),
    lowStockThreshold: String(inventories[0]?.low_stock_threshold ?? 10),
    warehouseLocation: inventories[0]?.warehouse_location ?? "",
    weight: String(shipping.weight ?? ""),
    length: String(shipping.length ?? ""),
    width: String(shipping.width ?? ""),
    height: String(shipping.height ?? ""),
    packageType: String(shipping.package_type ?? ""),
    fragile: Boolean(shipping.fragile),
    seoTitle: record.meta_title ?? "",
    metaDescription: record.meta_description ?? "",
    keywords: Array.isArray(record.meta_keywords) ? record.meta_keywords.join(", ") : "",
    canonicalUrl: record.canonical_url ?? "",
    images: productImages.length > 0 ? productImages : [createImageDraft(record.og_image_url ?? "", 0)].filter((item) => item.url),
    variants: variantDrafts.length > 0 ? variantDrafts : [createVariantDraft({ variantName: "Default", sku: record.sku, price: String(record.selling_price), stock: String(inventories[0]?.current_quantity ?? 0), primary: true })],
    specifications: specs.length > 0 ? specs : [createSpecDraft()],
    relatedProductIds: relatedIds,
  } satisfies ProductFormState;
}

function buildDuplicateProductForm(summary: ProductSummary, images: ProductImageRecord[], variants: ProductVariantRecord[], inventories: InventoryRecord[]) {
  const form = buildProductFormFromSummary(summary, images, variants, inventories);
  return {
    ...form,
    name: `${form.name} Copy`,
    slug: `${form.slug}-copy`,
    sku: `${form.sku}-copy`,
    status: "draft",
    featured: false,
  } satisfies ProductFormState;
}

async function ensureCoreCatalogData(client: NonNullable<ReturnType<typeof getSupabaseBrowserClient>>) {
  const { data: departmentRows, error: departmentError } = await client
    .from("departments")
    .select("id, slug, name")
    .in("slug", CORE_DEPARTMENTS.map((department) => department.slug));
  if (departmentError) throw departmentError;

  const existingDepartmentSlugs = new Set((departmentRows ?? []).map((department) => department.slug));
  const departmentsToSeed = CORE_DEPARTMENTS.filter((department) => !existingDepartmentSlugs.has(department.slug)).map((department, index) => ({
    slug: department.slug,
    name: department.name,
    sort_order: index,
    is_active: true,
  }));

  if (departmentsToSeed.length > 0) {
    const { error } = await client.from("departments").upsert(departmentsToSeed, { onConflict: "slug" });
    if (error) throw error;
  }

  const { data: seededDepartments, error: seededDepartmentError } = await client
    .from("departments")
    .select("id, slug")
    .in("slug", CORE_DEPARTMENTS.map((department) => department.slug));
  if (seededDepartmentError) throw seededDepartmentError;

  const departmentIdBySlug = new Map((seededDepartments ?? []).map((department) => [department.slug, department.id]));
  const categoryPayloads = Object.entries(CORE_CATEGORY_SEEDS).flatMap(([departmentSlug, categoriesForDepartment]) => {
    const departmentId = departmentIdBySlug.get(departmentSlug);
    if (!departmentId) return [];

    return categoriesForDepartment.map((category, index) => ({
      department_id: departmentId,
      slug: category.slug,
      name: category.name,
      description: null,
      image_url: null,
      sort_order: index,
      is_active: true,
    }));
  });

  if (categoryPayloads.length > 0) {
    const { error } = await client.from("categories").upsert(categoryPayloads, { onConflict: "slug" });
    if (error) throw error;
  }
}

function ProductImagePreview({ url, alt, label }: { url: string | null; alt: string; label: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[1rem] border border-border/70 bg-background-secondary/40">
      {url ? (
        <div
          className="h-full w-full bg-cover bg-center"
          style={{ backgroundImage: `url('${url}')` }}
          role="img"
          aria-label={alt || label}
        />
      ) : (
        <LayoutGrid className="h-5 w-5 text-accent" aria-hidden="true" />
      )}
    </div>
  );
}

function ProductsAdminPage() {
  const { role } = useAuth();
  const canManage = role === "admin" || role === "manager";
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [featuredFilter, setFeaturedFilter] = useState<"all" | "featured" | "standard">("all");
  const [relatedSearchTerm, setRelatedSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"updated_at" | "created_at" | "name" | "price" | "stock" | "status">("updated_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragImageId, setDragImageId] = useState<string | null>(null);
  const [dragVariantImageId, setDragVariantImageId] = useState<string | null>(null);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [productImages, setProductImages] = useState<ProductImageRecord[]>([]);
  const [productVariants, setProductVariants] = useState<ProductVariantRecord[]>([]);
  const [inventories, setInventories] = useState<InventoryRecord[]>([]);
  const [form, setForm] = useState<ProductFormState>(buildEmptyProductForm());
  const [formErrors, setFormErrors] = useState<Partial<Record<string, string>>>({});
  const [slugTouched, setSlugTouched] = useState(false);
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
  const [pickerQuery, setPickerQuery] = useState("");
  const [categoryCreationName, setCategoryCreationName] = useState("");
  const [brandCreationName, setBrandCreationName] = useState("");
  const [focusProductName, setFocusProductName] = useState(false);
  const productNameRef = useRef<HTMLInputElement>(null);

  const departmentNameById = useMemo(() => new Map(departments.map((item) => [item.id, item.name])), [departments]);
  const departmentSlugById = useMemo(() => new Map(departments.map((item) => [item.id, item.slug])), [departments]);
  const categoryById = useMemo(() => new Map(categories.map((item) => [item.id, item])), [categories]);
  const brandById = useMemo(() => new Map(brands.map((item) => [item.id, item])), [brands]);
  const selectedDepartmentSlug = departmentSlugById.get(form.departmentId) ?? "";
  const departmentFieldPresets = useMemo(() => DEPARTMENT_FIELD_PRESETS[selectedDepartmentSlug] ?? [], [selectedDepartmentSlug]);

  const availableCategories = useMemo(
    () => categories.filter((category) => category.department_id === form.departmentId && category.deleted_at === null && category.is_active),
    [categories, form.departmentId],
  );
  const availableBrands = useMemo(
    () =>
      brands.filter(
        (brand) =>
          brand.deleted_at === null &&
          brand.is_active &&
          (!form.departmentId || brand.department_id === form.departmentId) &&
          (!form.categoryId || brand.category_id === null || brand.category_id === form.categoryId),
      ),
    [brands, form.categoryId, form.departmentId],
  );
  const filteredCategories = useMemo(() => {
    const term = pickerQuery.trim().toLowerCase();
    if (!term) return availableCategories;
    return availableCategories.filter((category) => [category.name, category.slug].join(" ").toLowerCase().includes(term));
  }, [availableCategories, pickerQuery]);
  const filteredBrands = useMemo(() => {
    const term = pickerQuery.trim().toLowerCase();
    if (!term) return availableBrands;
    return availableBrands.filter((brand) => [brand.name, brand.slug].join(" ").toLowerCase().includes(term));
  }, [availableBrands, pickerQuery]);
  const departmentCategorySuggestions = useMemo(() => CORE_CATEGORY_SEEDS[selectedDepartmentSlug] ?? [], [selectedDepartmentSlug]);
  const relatedSearchProducts = useMemo(
    () => products.filter((product) => !product.deleted_at && product.name.toLowerCase().includes(relatedSearchTerm.toLowerCase())),
    [products, relatedSearchTerm],
  );
  const selectedDepartment = departments.find((department) => department.id === form.departmentId) ?? null;
  const selectedCategory = categories.find((category) => category.id === form.categoryId) ?? null;
  const selectedBrand = brands.find((brand) => brand.id === form.brandId) ?? null;
  const categoryCreationCandidate = pickerQuery.trim() || categoryCreationName.trim();
  const brandCreationCandidate = pickerQuery.trim() || brandCreationName.trim();
  const existingCategoryNames = new Set(availableCategories.map((category) => category.name.trim().toLowerCase()));
  const filteredCategorySuggestions = departmentCategorySuggestions.filter((category) => !existingCategoryNames.has(category.name.trim().toLowerCase()));
  const canCreateBrandNow = pickerMode === "brand" && Boolean(form.departmentId && form.categoryId && brandCreationCandidate);
  const canCreateCategoryNow = pickerMode === "category" && Boolean(form.departmentId && categoryCreationCandidate);

  const productSummaries = useMemo(() => {
    return products.map((product) => {
      const departmentName = departmentNameById.get(product.department_id) ?? "Unknown department";
      const categoryName = categoryById.get(product.category_id)?.name ?? "Unknown category";
      const brandName = brandById.get(product.brand_id)?.name ?? "Unknown brand";
      const primaryImage = productImages
        .filter((image) => image.product_id === product.id && image.deleted_at === null)
        .sort((left, right) => left.sort_order - right.sort_order)
        .find((image) => image.is_primary)?.image_url
        ?? product.og_image_url
        ?? null;
      const inventoryRows = productVariants
        .filter((variant) => variant.product_id === product.id && variant.deleted_at === null)
        .flatMap((variant) => inventories.filter((inventory) => inventory.product_variant_id === variant.id && inventory.deleted_at === null));
      const stock = inventoryRows.reduce((sum, inventory) => sum + parseNumber(String(inventory.current_quantity)), 0);
      const reserved = inventoryRows.reduce((sum, inventory) => sum + parseNumber(String(inventory.reserved_quantity)), 0);
      const threshold = inventoryRows[0] ? parseNumber(String(inventoryRows[0].low_stock_threshold)) : 10;
      const stockStatus = stockStatusFromValues(stock, reserved, threshold);

      return {
        record: product,
        departmentName,
        categoryName,
        brandName,
        stock,
        stockStatus,
        primaryImage,
      } satisfies ProductSummary;
    });
  }, [brandById, departmentNameById, inventories, productImages, productVariants, products, categoryById]);

  const filteredSummaries = useMemo(() => {
    const term = search.trim().toLowerCase();

    const rows = productSummaries.filter((summary) => {
      const isDeleted = Boolean(summary.record.deleted_at);

      if (statusFilter !== "all") {
        if (statusFilter === "deleted" && !isDeleted) return false;
        if (statusFilter !== "deleted" && isDeleted) return false;
        if (statusFilter !== "deleted" && summary.record.status !== statusFilter) return false;
      }
      if (departmentFilter !== "all" && summary.record.department_id !== departmentFilter) return false;
      if (brandFilter !== "all" && summary.record.brand_id !== brandFilter) return false;
      if (categoryFilter !== "all" && summary.record.category_id !== categoryFilter) return false;
      if (featuredFilter === "featured" && !summary.record.featured) return false;
      if (featuredFilter === "standard" && summary.record.featured) return false;
      if (!term) return true;

      return [
        summary.record.name,
        summary.record.slug,
        summary.record.sku,
        summary.brandName,
        summary.categoryName,
        summary.departmentName,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });

    const compareValues = {
      name: (left: ProductSummary, right: ProductSummary) => left.record.name.localeCompare(right.record.name),
      created_at: (left: ProductSummary, right: ProductSummary) => new Date(left.record.created_at).getTime() - new Date(right.record.created_at).getTime(),
      updated_at: (left: ProductSummary, right: ProductSummary) => new Date(left.record.updated_at).getTime() - new Date(right.record.updated_at).getTime(),
      price: (left: ProductSummary, right: ProductSummary) => parseNumber(String(left.record.selling_price)) - parseNumber(String(right.record.selling_price)),
      stock: (left: ProductSummary, right: ProductSummary) => left.stock - right.stock,
      status: (left: ProductSummary, right: ProductSummary) => left.record.status.localeCompare(right.record.status),
    } satisfies Record<typeof sortBy, (left: ProductSummary, right: ProductSummary) => number>;

    return [...rows].sort((left, right) => {
      const result = compareValues[sortBy](left, right);
      return sortDirection === "asc" ? result : -result;
    });
  }, [categoryFilter, departmentFilter, featuredFilter, productSummaries, brandFilter, search, sortBy, sortDirection, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSummaries.length / PRODUCT_PAGE_SIZE));
  const visiblePage = Math.min(page, totalPages);
  const visibleSummaries = filteredSummaries.slice((visiblePage - 1) * PRODUCT_PAGE_SIZE, visiblePage * PRODUCT_PAGE_SIZE);

  const stats = [
    { label: "Total Products", value: String(products.length), delta: `${filteredSummaries.length} visible`, note: "Supabase catalog", tone: "accent" as const },
    { label: "Active", value: String(products.filter((item) => !item.deleted_at && item.status === "active").length), delta: "Live items", note: "Ready to sell", tone: "success" as const },
    { label: "Featured", value: String(products.filter((item) => !item.deleted_at && item.featured).length), delta: "Homepage ready", note: "Promoted products", tone: "neutral" as const },
    { label: "Deleted", value: String(products.filter((item) => Boolean(item.deleted_at)).length), delta: "Restore supported", note: "Soft deleted only", tone: "warning" as const },
  ];

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      if (isQaBypassEnabled()) {
        // DEV ONLY
        // REMOVE OR DISABLE BEFORE PRODUCTION
        const catalog = getQaProductCatalog();
        setDepartments(catalog.departments as DepartmentRecord[]);
        setCategories(catalog.categories as CategoryRecord[]);
        setBrands(catalog.brands as BrandRecord[]);
        setProducts(catalog.products as ProductRecord[]);
        setProductImages(catalog.productImages as ProductImageRecord[]);
        setProductVariants(catalog.productVariants as ProductVariantRecord[]);
        setInventories(catalog.inventories as InventoryRecord[]);
        setIsLoading(false);
        return;
      }

      const client = getSupabaseBrowserClient();
      if (!client) {
        setLoadError("Supabase is not configured for this environment.");
        return;
      }

      const fetchCatalogData = async () => {
        const [departmentsResult, categoriesResult, brandsResult] = await Promise.all([
          client.from("departments").select("id, name, slug, is_active, deleted_at").is("deleted_at", null).order("sort_order", { ascending: true }),
          client.from("categories").select("id, department_id, name, slug, is_active, deleted_at").is("deleted_at", null).order("sort_order", { ascending: true }),
          client.from("brands").select("id, department_id, category_id, name, slug, logo_url, is_active, deleted_at").order("created_at", { ascending: false }),
        ]);

        return { departmentsResult, categoriesResult, brandsResult };
      };

      const [productResult, catalogData] = await Promise.all([
        client
          .from("products")
          .select(
            "id, department_id, category_id, brand_id, slug, sku, name, description, short_description, gst_rate, mrp, selling_price, discount_amount, discount_percent, status, featured, meta_title, meta_description, meta_keywords, canonical_url, og_image_url, specification, attributes, deleted_at, created_at, updated_at",
          )
          .order("updated_at", { ascending: false }),
        fetchCatalogData(),
      ]);

      let { departmentsResult, categoriesResult, brandsResult } = catalogData;

      if ((departmentsResult.data ?? []).length === 0 || (categoriesResult.data ?? []).length === 0) {
        await ensureCoreCatalogData(client);
        const refreshedCatalog = await fetchCatalogData();
        departmentsResult = refreshedCatalog.departmentsResult;
        categoriesResult = refreshedCatalog.categoriesResult;
        brandsResult = refreshedCatalog.brandsResult;
      }

      if (productResult.error) setLoadError(productResult.error.message);
      else setProducts((productResult.data ?? []) as ProductRecord[]);
      if (departmentsResult.error) setLoadError(departmentsResult.error.message);
      else setDepartments((departmentsResult.data ?? []) as DepartmentRecord[]);
      if (categoriesResult.error) setLoadError(categoriesResult.error.message);
      else setCategories((categoriesResult.data ?? []) as CategoryRecord[]);
      if (brandsResult.error) setLoadError(brandsResult.error.message);
      else setBrands((brandsResult.data ?? []) as BrandRecord[]);

      const productIds = (productResult.data ?? []).map((item) => item.id);
      if (productIds.length > 0 && !productResult.error) {
        const [imagesResult, variantsResult] = await Promise.all([
          client.from("product_images").select("id, product_id, image_url, alt_text, sort_order, is_primary, deleted_at").in("product_id", productIds).is("deleted_at", null).order("sort_order", { ascending: true }),
          client.from("product_variants").select("id, product_id, sku, variant_name, option_label, option_value, variant_options, mrp_override, selling_price_override, barcode, weight, is_default, is_active, deleted_at").in("product_id", productIds).is("deleted_at", null).order("created_at", { ascending: true }),
        ]);

        if (imagesResult.error) setLoadError(imagesResult.error.message);
        else setProductImages((imagesResult.data ?? []) as ProductImageRecord[]);

        if (variantsResult.error) setLoadError(variantsResult.error.message);
        else {
          const loadedVariants = (variantsResult.data ?? []) as ProductVariantRecord[];
          setProductVariants(loadedVariants);
          const variantIds = loadedVariants.map((variant) => variant.id);
          if (variantIds.length > 0) {
            const inventoryResult = await client.from("inventory").select("id, product_variant_id, current_quantity, reserved_quantity, low_stock_threshold, stock_status, warehouse_location, deleted_at").in("product_variant_id", variantIds).is("deleted_at", null).order("created_at", { ascending: true });
            if (inventoryResult.error) setLoadError(inventoryResult.error.message);
            else setInventories((inventoryResult.data ?? []) as InventoryRecord[]);
          } else {
            setInventories([]);
          }
        }
      } else {
        setProductImages([]);
        setProductVariants([]);
        setInventories([]);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load products.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, departmentFilter, brandFilter, categoryFilter, featuredFilter, sortBy, sortDirection]);

  useEffect(() => {
    if (form.departmentId && !availableCategories.some((category) => category.id === form.categoryId)) {
      setForm((current) => ({ ...current, categoryId: "" }));
    }
  }, [availableCategories, form.categoryId, form.departmentId]);

  useEffect(() => {
    if (form.categoryId && !availableBrands.some((brand) => brand.id === form.brandId)) {
      setForm((current) => ({ ...current, brandId: "" }));
    }
  }, [availableBrands, form.brandId, form.categoryId]);

  useEffect(() => {
    if (!form.departmentId || departmentFieldPresets.length === 0) return;
    setForm((current) => {
      const hasMeaningfulSpec = current.specifications.some((spec) => spec.key.trim() || spec.value.trim());
      if (hasMeaningfulSpec) return current;
      return {
        ...current,
        specifications: departmentFieldPresets.map((field) => createSpecDraft({ key: field.key, value: "" })),
      };
    });
  }, [departmentFieldPresets, form.departmentId]);

  useEffect(() => {
    if (!focusProductName || !dialogOpen) return;
    const frame = window.requestAnimationFrame(() => productNameRef.current?.focus());
    setFocusProductName(false);
    return () => window.cancelAnimationFrame(frame);
  }, [dialogOpen, focusProductName]);

  const resetForm = () => {
    setEditingProductId(null);
    setForm(buildEmptyProductForm());
    setFormErrors({});
    setSlugTouched(false);
    setUploading(false);
    setDragImageId(null);
    setDragVariantImageId(null);
    setPickerMode(null);
    setPickerQuery("");
    setCategoryCreationName("");
    setBrandCreationName("");
    setFocusProductName(false);
  };

  const openCreateProduct = (seed?: Partial<ProductFormState>) => {
    resetForm();
    setForm((current) => ({
      ...current,
      ...seed,
      images: seed?.images ?? current.images,
      variants: seed?.variants ?? current.variants,
      specifications: seed?.specifications ?? current.specifications,
      relatedProductIds: seed?.relatedProductIds ?? current.relatedProductIds,
    }));
    setDialogOpen(true);
  };

  const openEditProduct = (summary: ProductSummary) => {
    const product = summary.record;
    const images = productImages.filter((item) => item.product_id === product.id);
    const variants = productVariants.filter((item) => item.product_id === product.id);
    const inventoryRows = inventories.filter((item) => variants.some((variant) => variant.id === item.product_variant_id));
    setEditingProductId(product.id);
    setForm(buildProductFormFromSummary(summary, images, variants, inventoryRows));
    setSlugTouched(true);
    setFormErrors({});
    setDialogOpen(true);
  };

  const openDuplicateProduct = (summary: ProductSummary) => {
    const product = summary.record;
    const images = productImages.filter((item) => item.product_id === product.id);
    const variants = productVariants.filter((item) => item.product_id === product.id);
    const inventoryRows = inventories.filter((item) => variants.some((variant) => variant.id === item.product_variant_id));
    setEditingProductId(null);
    setForm(buildDuplicateProductForm(summary, images, variants, inventoryRows));
    setSlugTouched(true);
    setFormErrors({});
    setDialogOpen(true);
  };

  const updateForm = (patch: Partial<ProductFormState>) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const handleNameChange = (value: string) => {
    setForm((current) => ({
      ...current,
      name: value,
      slug: slugTouched ? current.slug : slugifyProduct(value),
      seoTitle: current.seoTitle || value,
    }));
  };

  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    updateForm({ slug: value });
  };

  const handleDepartmentChange = (departmentId: string) => {
    const nextDepartmentSlug = departmentSlugById.get(departmentId) ?? "";
    const nextPresets = DEPARTMENT_FIELD_PRESETS[nextDepartmentSlug] ?? [];
    setForm((current) => {
      const hasMeaningfulSpec = current.specifications.some((spec) => spec.key.trim() || spec.value.trim());
      return {
        ...current,
        departmentId,
        categoryId: "",
        brandId: "",
        specifications: !hasMeaningfulSpec && nextPresets.length > 0 ? nextPresets.map((field) => createSpecDraft({ key: field.key, value: "" })) : current.specifications,
      };
    });
  };

  const handleDepartmentFieldChange = (key: string, value: string) => {
    setForm((current) => ({
      ...current,
      specifications: upsertSpecValue(current.specifications, key, value),
    }));
  };

  const openCategoryPicker = () => {
    if (!form.departmentId) {
      toast({ title: "Select a department first", description: "Department is required before choosing a category.", variant: "warning" });
      return;
    }
    setPickerMode("category");
    setPickerQuery("");
    setCategoryCreationName("");
  };

  const openBrandPicker = () => {
    if (!form.departmentId) {
      toast({ title: "Select a department first", description: "Department is required before choosing a brand.", variant: "warning" });
      return;
    }
    if (!form.categoryId) {
      toast({ title: "Select a category first", description: "Brand selection opens after category selection.", variant: "warning" });
      return;
    }
    setPickerMode("brand");
    setPickerQuery("");
    setBrandCreationName("");
  };

  const closePicker = () => {
    setPickerMode(null);
    setPickerQuery("");
    setCategoryCreationName("");
    setBrandCreationName("");
  };

  const selectCategory = (categoryId: string) => {
    setForm((current) => ({ ...current, categoryId, brandId: "" }));
    closePicker();
    setFocusProductName(true);
  };

  const createCategoryFromPicker = async (categoryName: string) => {
    const normalizedName = categoryName.trim();
    if (!normalizedName || !form.departmentId) return;

    const existingCategory = availableCategories.find((category) => category.name.trim().toLowerCase() === normalizedName.toLowerCase());
    if (existingCategory) {
      selectCategory(existingCategory.id);
      toast({ title: "Category selected", description: `${existingCategory.name} already exists for this department.`, variant: "success" });
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      toast({ title: "Supabase unavailable", description: "Cannot create a category right now.", variant: "danger" });
      return;
    }

    setUploading(true);
    try {
      const slug = slugifyCategory(normalizedName) || `category-${Date.now().toString(36)}`;
      const payload = {
        department_id: form.departmentId,
        slug,
        name: normalizedName,
        description: null,
        image_url: null,
        sort_order: 0,
        is_active: true,
      };
      const { data, error } = await client.from("categories").insert([payload]).select("id, department_id, name, slug, is_active, deleted_at").single();
      if (error) throw error;
      const createdCategory = data as CategoryRecord;
      setCategories((current) => [createdCategory, ...current]);
      setForm((current) => ({ ...current, categoryId: createdCategory.id, brandId: "" }));
      closePicker();
      setFocusProductName(true);
      toast({ title: "Category created", description: `${createdCategory.name} was added instantly.`, variant: "success" });
    } catch (error) {
      toast({ title: "Category creation failed", description: error instanceof Error ? error.message : "Unable to create the category.", variant: "danger" });
    } finally {
      setUploading(false);
    }
  };

  const selectBrand = (brandId: string) => {
    setForm((current) => ({ ...current, brandId }));
    closePicker();
    setFocusProductName(true);
  };

  const createBrandFromPicker = async (brandName: string) => {
    const normalizedName = brandName.trim();
    if (!normalizedName || !form.departmentId) return;
    const existingBrand = availableBrands.find((brand) => brand.name.trim().toLowerCase() === normalizedName.toLowerCase());
    if (existingBrand) {
      selectBrand(existingBrand.id);
      toast({ title: "Brand selected", description: `${existingBrand.name} already exists for this department.`, variant: "success" });
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      toast({ title: "Supabase unavailable", description: "Cannot create a brand right now.", variant: "danger" });
      return;
    }

    setUploading(true);
    try {
      const baseSlug = slugifyProduct(normalizedName) || "brand";
      const slug = `${baseSlug}-${Date.now().toString(36)}`;
      const payload = {
        department_id: form.departmentId,
        category_id: form.categoryId || null,
        name: normalizedName,
        slug,
        logo_url: null,
        is_featured: false,
        is_active: true,
      };
      const { data, error } = await client.from("brands").insert([payload]).select("id, department_id, category_id, name, slug, logo_url, is_active, deleted_at").single();
      if (error) throw error;
      const createdBrand = data as BrandRecord;
      setBrands((current) => [createdBrand, ...current]);
      setForm((current) => ({ ...current, brandId: createdBrand.id }));
      closePicker();
      setFocusProductName(true);
      toast({ title: "Brand created", description: `${createdBrand.name} was added instantly.`, variant: "success" });
    } catch (error) {
      toast({ title: "Brand creation failed", description: error instanceof Error ? error.message : "Unable to create the brand.", variant: "danger" });
    } finally {
      setUploading(false);
    }
  };

  const addImageFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    const nextImages = [...form.images];
    for (const file of Array.from(files)) {
      const result = await uploadCloudinaryImage(file);
      if (result.error) {
        toast({ title: "Image upload failed", description: result.error, variant: "danger" });
        continue;
      }
      nextImages.push(createImageDraft(result.url ?? "", nextImages.length));
    }
    setUploading(false);
    setForm((current) => ({
      ...current,
      images: nextImages.map((image, index) => ({
        ...image,
        primary: index === 0 ? true : image.primary,
      })),
    }));
    if (nextImages.length > 0) {
      toast({ title: "Images uploaded", description: "Cloudinary URLs are ready to save.", variant: "success" });
    }
  };

  const handleImageDrop = async (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    await addImageFiles(event.dataTransfer.files);
  };

  const uploadVariantImage = async (variantId: string, file: File | null) => {
    if (!file) return;
    setUploading(true);
    const result = await uploadCloudinaryImage(file);
    setUploading(false);
    if (result.error) {
      toast({ title: "Image upload failed", description: result.error, variant: "danger" });
      return;
    }
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant) => (variant.id === variantId ? { ...variant, imageUrl: result.url ?? "" } : variant)),
    }));
  };

  const reorderImage = (fromId: string, toId: string) => {
    setForm((current) => {
      const next = [...current.images];
      const fromIndex = next.findIndex((image) => image.id === fromId);
      const toIndex = next.findIndex((image) => image.id === toId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return current;
      const [item] = next.splice(fromIndex, 1);
      if (!item) return current;
      next.splice(toIndex, 0, item);
      return {
        ...current,
        images: next.map((image, index) => ({ ...image, primary: index === 0 || image.primary })),
      };
    });
  };

  const validateForm = () => {
    const errors: Partial<Record<string, string>> = {};
    const normalizedSlug = slugifyProduct(form.slug || form.name);
    const normalizedSku = form.sku.trim() || generateFallbackSku(form.name);
    const mrp = parseNumber(form.mrp);
    const selling = parseNumber(form.sellingPrice);
    const stock = parseNumber(form.stockQuantity);
    const reserved = parseNumber(form.reservedQuantity);
    const threshold = parseNumber(form.lowStockThreshold);

    if (!form.name.trim()) errors.name = "Product name is required";
    if (!form.departmentId) errors.departmentId = "Department is required";
    if (!form.categoryId) errors.categoryId = "Category is required";
    if (!form.brandId) errors.brandId = "Brand is required";
    if (selling <= 0) errors.sellingPrice = "Selling price must be greater than 0";
    if (!form.status.trim()) errors.status = "Product status is required";
    if (form.mrp.trim() && mrp < selling) errors.mrp = "MRP must be greater than or equal to selling price";
    if (form.images.length === 0) errors.images = "At least one product image is required";
    if (stock < 0 || reserved < 0 || threshold < 0) errors.stockQuantity = "Stock values must be zero or higher";
    if (form.canonicalUrl.trim()) {
      try {
        void new URL(form.canonicalUrl.trim());
      } catch {
        errors.canonicalUrl = "Enter a valid URL";
      }
    }
    if (form.departmentId && form.categoryId) {
      const selectedCategory = categoryById.get(form.categoryId);
      if (selectedCategory && selectedCategory.department_id !== form.departmentId) {
        errors.categoryId = "Category must belong to the selected department";
      }
    }

    setFormErrors(errors);
    return { valid: Object.keys(errors).length === 0, normalizedSlug, normalizedSku };
  };

  const hasDuplicateProductSlugOrSku = async (
    client: NonNullable<ReturnType<typeof getSupabaseBrowserClient>>,
    normalizedSlug: string,
    normalizedSku: string,
  ) => {
    const slugQuery = client.from("products").select("id").is("deleted_at", null).eq("slug", normalizedSlug);
    const skuQuery = client.from("products").select("id").is("deleted_at", null).eq("sku", normalizedSku);
    if (editingProductId) {
      slugQuery.neq("id", editingProductId);
      skuQuery.neq("id", editingProductId);
    }
    const [slugResult, skuResult] = await Promise.all([slugQuery.limit(1), skuQuery.limit(1)]);
    if (slugResult.error) throw slugResult.error;
    if (skuResult.error) throw skuResult.error;
    return {
      slugExists: (slugResult.data ?? []).length > 0,
      skuExists: (skuResult.data ?? []).length > 0,
    };
  };

  const buildVariantPayloads = (productId: string, productSku: string) => {
    const variants = form.variants.length > 0 ? form.variants : [createVariantDraft({ sku: productSku, price: form.sellingPrice, stock: form.stockQuantity, primary: true })];
    const normalizedVariants = variants.map((variant, index) => {
      const sku = variant.sku.trim() || `${productSku}-${index + 1}`;
      return {
        draft: {
          ...variant,
          sku,
          primary: index === 0 || variant.primary,
        },
        payload: {
          product_id: productId,
          sku,
          variant_name: variant.variantName.trim() || `Variant ${index + 1}`,
          option_label: variant.optionLabel.trim() || null,
          option_value: variant.optionValue.trim() || null,
          variant_options: {},
          mrp_override: null,
          selling_price_override: variant.price ? parseNumber(variant.price) : parseNumber(form.sellingPrice),
          barcode: null,
          weight: null,
          is_default: index === 0 || variant.primary,
          is_active: variant.active,
        },
      };
    });
    return normalizedVariants;
  };

  const saveProduct = async () => {
    if (!canManage) {
      toast({ title: "Permission denied", description: "Only admins and managers can manage products.", variant: "danger" });
      return;
    }
    if (saving || uploading) return;

    const validation = validateForm();
    if (!validation.valid) {
      toast({ title: "Fix the highlighted fields", description: "Product name, department, category, brand, selling price, images, and status are required.", variant: "warning" });
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      toast({ title: "Supabase unavailable", description: "Add Supabase environment variables to enable product management.", variant: "danger" });
      return;
    }

    setSaving(true);

    try {
      const duplicates = await hasDuplicateProductSlugOrSku(client, validation.normalizedSlug, validation.normalizedSku);
      if (duplicates.slugExists) {
        setFormErrors((current) => ({ ...current, slug: "Slug must be unique" }));
        toast({ title: "Duplicate slug", description: "Choose a different product slug.", variant: "warning" });
        setSaving(false);
        return;
      }
      if (duplicates.skuExists) {
        setFormErrors((current) => ({ ...current, sku: "SKU must be unique" }));
        toast({ title: "Duplicate SKU", description: "Choose a different SKU.", variant: "warning" });
        setSaving(false);
        return;
      }

      const primaryImage = form.images.find((image) => image.primary)?.url ?? form.images[0]?.url ?? null;
      const specification = Object.fromEntries(form.specifications.filter((spec) => spec.key.trim()).map((spec) => [spec.key.trim(), spec.value.trim()]));
      const shipping = {
        weight: form.weight ? parseNumber(form.weight) : null,
        length: form.length ? parseNumber(form.length) : null,
        width: form.width ? parseNumber(form.width) : null,
        height: form.height ? parseNumber(form.height) : null,
        package_type: form.packageType.trim() || null,
        fragile: form.fragile,
      };
      const attributes = {
        hsn_code: form.hsnCode.trim() || null,
        shipping,
        related_product_ids: form.relatedProductIds,
      };
      const discountAmount = Math.max(parseNumber(form.mrp) - parseNumber(form.sellingPrice), 0);

      const payload = {
        department_id: form.departmentId,
        category_id: form.categoryId,
        brand_id: form.brandId,
        slug: validation.normalizedSlug,
        sku: validation.normalizedSku,
        name: form.name.trim(),
        description: form.description.trim() || null,
        short_description: form.shortDescription.trim() || null,
        gst_rate: parseNumber(form.gstRate) || 0,
        mrp: parseNumber(form.mrp),
        selling_price: parseNumber(form.sellingPrice),
        discount_amount: discountAmount,
        discount_percent: parseNumber(form.mrp) > 0 ? Number(((discountAmount / parseNumber(form.mrp)) * 100).toFixed(2)) : 0,
        status: form.status,
        featured: form.featured,
        meta_title: form.seoTitle.trim() || null,
        meta_description: form.metaDescription.trim() || null,
        meta_keywords: form.keywords.split(",").map((item) => item.trim()).filter(Boolean),
        canonical_url: form.canonicalUrl.trim() || null,
        og_image_url: primaryImage,
        specification,
        attributes,
      };

      let productId = editingProductId;
      if (editingProductId) {
        const { error } = await client.from("products").update(payload).eq("id", editingProductId);
        if (error) throw error;
        await Promise.all([
          client.from("product_images").delete().eq("product_id", editingProductId),
          client.from("product_variants").delete().eq("product_id", editingProductId),
        ]);
        const existingVariants = productVariants.filter((variant) => variant.product_id === editingProductId);
        if (existingVariants.length > 0) {
          const variantIds = existingVariants.map((variant) => variant.id);
          await client.from("inventory").delete().in("product_variant_id", variantIds);
        }
      } else {
        const { data, error } = await client.from("products").insert([payload]).select("id").single();
        if (error) throw error;
        productId = (data as { id?: string } | null)?.id ?? null;
      }

      if (!productId) {
        throw new Error("Unable to determine the saved product id.");
      }

      if (form.images.length > 0) {
        const imagePayload = form.images.map((image, index) => ({
          product_id: productId,
          image_url: image.url,
          alt_text: image.alt || form.name.trim(),
          sort_order: index,
          is_primary: index === 0 || image.primary,
        }));
        const { error } = await client.from("product_images").insert(imagePayload);
        if (error) throw error;
      }

      const variantsToInsert = buildVariantPayloads(productId, validation.normalizedSku);
      const { data: createdVariants, error: variantError } = await client.from("product_variants").insert(variantsToInsert.map((item) => item.payload)).select("id, sku");
      if (variantError) throw variantError;

      const inventoryPayload = (createdVariants ?? []).map((variant, index) => {
        const sourceDraft = variantsToInsert[index]?.draft;
        const isPrimaryVariant = Boolean(sourceDraft?.primary) || index === 0;
        return {
          product_variant_id: variant.id,
          current_quantity: isPrimaryVariant ? parseNumber(form.stockQuantity) : parseNumber(sourceDraft?.stock ?? "0"),
          reserved_quantity: isPrimaryVariant ? parseNumber(form.reservedQuantity) : 0,
          low_stock_threshold: parseNumber(form.lowStockThreshold),
          stock_status: stockStatusFromValues(
            isPrimaryVariant ? parseNumber(form.stockQuantity) : parseNumber(sourceDraft?.stock ?? "0"),
            isPrimaryVariant ? parseNumber(form.reservedQuantity) : 0,
            parseNumber(form.lowStockThreshold),
          ),
          warehouse_location: form.warehouseLocation.trim() || null,
        };
      });

      if (inventoryPayload.length > 0) {
        const { error } = await client.from("inventory").insert(inventoryPayload);
        if (error) throw error;
      }

      toast({
        title: editingProductId ? "Product updated" : "Product created",
        description: `${form.name.trim()} is now synced with Supabase.`,
        variant: "success",
      });
      setDialogOpen(false);
      resetForm();
      await loadProducts();
    } catch (error) {
      toast({
        title: editingProductId ? "Update failed" : "Create failed",
        description: error instanceof Error ? error.message : "Something went wrong while saving the product.",
        variant: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  const softDeleteProduct = async () => {
    if (!deleteTargetId) return;
    const client = getSupabaseBrowserClient();
    if (!client) {
      toast({ title: "Supabase unavailable", description: "Cannot delete this product right now.", variant: "danger" });
      return;
    }

    const { error } = await client.from("products").update({ deleted_at: new Date().toISOString(), status: "archived" }).eq("id", deleteTargetId);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "danger" });
      return;
    }
    toast({ title: "Product deleted", description: "The product has been archived safely.", variant: "success" });
    setDeleteTargetId(null);
    await loadProducts();
  };

  const restoreProduct = async (summary: ProductSummary) => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      toast({ title: "Supabase unavailable", description: "Cannot restore this product right now.", variant: "danger" });
      return;
    }

    const { error } = await client.from("products").update({ deleted_at: null, status: "active" }).eq("id", summary.record.id);
    if (error) {
      toast({ title: "Restore failed", description: error.message, variant: "danger" });
      return;
    }
    toast({ title: "Product restored", description: summary.record.name, variant: "success" });
    await loadProducts();
  };

  const toggleActive = async (summary: ProductSummary) => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      toast({ title: "Supabase unavailable", description: "Cannot update product status right now.", variant: "danger" });
      return;
    }
    const nextStatus = summary.record.status === "active" ? "inactive" : "active";
    const { error } = await client.from("products").update({ status: nextStatus }).eq("id", summary.record.id);
    if (error) {
      toast({ title: "Status update failed", description: error.message, variant: "danger" });
      return;
    }
    toast({ title: nextStatus === "active" ? "Product activated" : "Product deactivated", description: summary.record.name, variant: "success" });
    await loadProducts();
  };

  const toggleFeatured = async (summary: ProductSummary) => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      toast({ title: "Supabase unavailable", description: "Cannot update featured state right now.", variant: "danger" });
      return;
    }
    const { error } = await client.from("products").update({ featured: !summary.record.featured }).eq("id", summary.record.id);
    if (error) {
      toast({ title: "Featured update failed", description: error.message, variant: "danger" });
      return;
    }
    toast({ title: summary.record.featured ? "Featured removed" : "Product featured", description: summary.record.name, variant: "success" });
    await loadProducts();
  };

  const duplicateProduct = async (summary: ProductSummary) => {
    openDuplicateProduct(summary);
  };

  const imageDragStart = (id: string) => setDragImageId(id);
  const imageDrop = (targetId: string) => {
    if (!dragImageId || dragImageId === targetId) return;
    reorderImage(dragImageId, targetId);
    setDragImageId(null);
  };

  const variantImageDragStart = (id: string) => setDragVariantImageId(id);
  const variantImageDrop = (variantId: string, targetId: string) => {
    if (!dragVariantImageId || dragVariantImageId === targetId) return;
    setForm((current) => {
      const next = [...current.variants];
      const fromIndex = next.findIndex((item) => item.id === dragVariantImageId);
      const toIndex = next.findIndex((item) => item.id === targetId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return current;
      const [item] = next.splice(fromIndex, 1);
      if (!item) return current;
      next.splice(toIndex, 0, item);
      return { ...current, variants: next };
    });
    setDragVariantImageId(null);
  };

  const addVariant = () => setForm((current) => ({ ...current, variants: [...current.variants, createVariantDraft()] }));
  const addSpec = () => setForm((current) => ({ ...current, specifications: [...current.specifications, createSpecDraft()] }));

  const selectedProductCount = form.relatedProductIds.length;

  return (
    <section className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Products" }]}
        title="Products"
        subtitle="Manage a live product catalog with Supabase, Cloudinary images, variants, inventory, and SEO fields."
        actions={
          <>
            <AdminActionButton onClick={() => toast({ title: "Bulk actions", description: "Bulk product actions will remain frontend-only for now.", variant: "success" })}>
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              Bulk Actions
            </AdminActionButton>
            <Button variant="accent" size="md" onClick={() => openCreateProduct()} disabled={!canManage}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Product
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <AdminStatCard key={stat.label} stat={stat} />
        ))}
      </div>

      <AdminSectionCard
        title="Search & Filters"
        description="Filter products by department, category, brand, status, and featured state."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSortDirection((current) => (current === "asc" ? "desc" : "asc"))}>
              {sortDirection === "asc" ? "Ascending" : "Descending"}
            </Button>
            <Button variant="outline" size="sm" onClick={loadProducts} loading={isLoading}>
              Retry
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 xl:grid-cols-6">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" aria-label="Search products" />
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} className="h-11 rounded-[var(--radius-md)] border border-border bg-background px-3.5 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label="Sort products">
            <option value="updated_at">Recently Updated</option>
            <option value="created_at">Newest</option>
            <option value="name">Name</option>
            <option value="price">Price</option>
            <option value="stock">Stock</option>
            <option value="status">Status</option>
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-11 rounded-[var(--radius-md)] border border-border bg-background px-3.5 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label="Status filter">
            <option value="all">All Status</option>
            {productStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            <option value="deleted">Deleted</option>
          </select>
          <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className="h-11 rounded-[var(--radius-md)] border border-border bg-background px-3.5 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label="Department filter">
            <option value="all">All Departments</option>
            {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
          </select>
          <select value={brandFilter} onChange={(event) => setBrandFilter(event.target.value)} className="h-11 rounded-[var(--radius-md)] border border-border bg-background px-3.5 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label="Brand filter">
            <option value="all">All Brands</option>
            {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
          </select>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="h-11 rounded-[var(--radius-md)] border border-border bg-background px-3.5 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label="Category filter">
            <option value="all">All Categories</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <select value={featuredFilter} onChange={(event) => setFeaturedFilter(event.target.value as typeof featuredFilter)} className="h-11 rounded-[var(--radius-md)] border border-border bg-background px-3.5 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label="Featured filter">
            <option value="all">All</option>
            <option value="featured">Featured</option>
            <option value="standard">Standard</option>
          </select>
        </div>
      </AdminSectionCard>

      {loadError ? (
        <Card className="rounded-[1.6rem] border-danger/20 bg-danger/5 p-5 shadow-[var(--shadow-sm)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-base font-bold text-text">Unable to load products</p>
              <p className="mt-1 text-sm font-medium text-muted">{loadError}</p>
            </div>
            <Button variant="outline" size="md" onClick={loadProducts}>
              Retry
            </Button>
          </div>
        </Card>
      ) : null}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-72 rounded-[1.4rem]" />
          ))}
        </div>
      ) : visibleSummaries.length > 0 ? (
        <>
          <div className="grid gap-4 md:hidden">
            {visibleSummaries.map((summary) => (
              <Card key={summary.record.id} className="overflow-hidden rounded-[1.4rem] border-white/80 bg-white/92 shadow-[var(--shadow-sm)]">
                <div className="aspect-[16/10] bg-background-secondary/40">
                  <ProductImagePreview url={summary.primaryImage} alt={summary.record.name} label={summary.record.name} />
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-black text-text">{summary.record.name}</p>
                      <p className="text-xs font-medium text-muted">{summary.brandName}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <AdminStatusBadge status={formatStatusLabel(summary.record.status, summary.record.deleted_at)} />
                      {summary.record.featured ? <Badge variant="accent">Featured</Badge> : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold text-muted">
                    <Badge variant="neutral">{summary.categoryName}</Badge>
                    <Badge variant="neutral">{summary.departmentName}</Badge>
                    <Badge variant="neutral">{summary.stockStatus.replace(/_/g, " ")}</Badge>
                  </div>
                  <div className="grid gap-2 text-sm text-muted">
                    <div className="flex items-center justify-between"><span>Price</span><span className="font-semibold text-text">{formatPrice(parseNumber(String(summary.record.selling_price)))}</span></div>
                    <div className="flex items-center justify-between"><span>Stock</span><span className="font-semibold text-text">{summary.stock}</span></div>
                    <div className="flex items-center justify-between"><span>Updated</span><span className="font-semibold text-text">{new Date(summary.record.updated_at).toLocaleDateString()}</span></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditProduct(summary)} disabled={!canManage || Boolean(summary.record.deleted_at)}><PenSquare className="h-4 w-4" />Edit</Button>
                    <Button variant="outline" size="sm" onClick={() => void duplicateProduct(summary)} disabled={!canManage}><Copy className="h-4 w-4" />Duplicate</Button>
                    <Button variant={summary.record.deleted_at ? "outline" : "accent"} size="sm" onClick={() => void (summary.record.deleted_at ? restoreProduct(summary) : toggleActive(summary))} disabled={!canManage}><ShieldCheck className="h-4 w-4" />{summary.record.deleted_at ? "Restore" : summary.record.status === "active" ? "Deactivate" : "Activate"}</Button>
                    <Button variant="danger" size="sm" onClick={() => setDeleteTargetId(summary.record.id)} disabled={!canManage || Boolean(summary.record.deleted_at)}><Trash2 className="h-4 w-4" />Delete</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-[1.4rem] border border-border/70 bg-white/90 shadow-[var(--shadow-sm)] md:block">
            <table className="min-w-full divide-y divide-border/70">
              <thead className="bg-background-secondary/35">
                <tr className="text-left text-xs font-bold uppercase tracking-[0.18em] text-muted">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Brand</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Featured</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70 bg-white/80">
                {visibleSummaries.map((summary) => (
                  <tr key={summary.record.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[1rem] border border-border/70 bg-background-secondary/40">
                          <ProductImagePreview url={summary.primaryImage} alt={summary.record.name} label={summary.record.name} />
                        </div>
                        <div>
                          <p className="font-semibold text-text">{summary.record.name}</p>
                          <p className="text-xs text-muted">SKU: {summary.record.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">{summary.brandName}</td>
                    <td className="px-4 py-3 text-sm text-muted">{summary.categoryName}</td>
                    <td className="px-4 py-3 text-sm text-muted">{summary.departmentName}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-text">{formatPrice(parseNumber(String(summary.record.selling_price)))}</td>
                    <td className="px-4 py-3 text-sm font-medium text-text">{summary.stock}</td>
                    <td className="px-4 py-3"><AdminStatusBadge status={formatStatusLabel(summary.record.status, summary.record.deleted_at)} /></td>
                    <td className="px-4 py-3">{summary.record.featured ? <Badge variant="accent">Featured</Badge> : <Badge variant="neutral">No</Badge>}</td>
                    <td className="px-4 py-3 text-sm text-muted">{new Date(summary.record.updated_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditProduct(summary)} disabled={!canManage || Boolean(summary.record.deleted_at)}><PenSquare className="h-4 w-4" />Edit</Button>
                        <Button variant="outline" size="sm" onClick={() => void duplicateProduct(summary)} disabled={!canManage}><Copy className="h-4 w-4" />Duplicate</Button>
                        <Button variant={summary.record.deleted_at ? "outline" : "accent"} size="sm" onClick={() => void (summary.record.deleted_at ? restoreProduct(summary) : toggleActive(summary))} disabled={!canManage}><ShieldCheck className="h-4 w-4" />{summary.record.deleted_at ? "Restore" : summary.record.status === "active" ? "Deactivate" : "Activate"}</Button>
                        <Button variant="danger" size="sm" onClick={() => setDeleteTargetId(summary.record.id)} disabled={!canManage || Boolean(summary.record.deleted_at)}><Trash2 className="h-4 w-4" />Delete</Button>
                        <Button variant="outline" size="sm" onClick={() => void toggleFeatured(summary)} disabled={!canManage}><Store className="h-4 w-4" />{summary.record.featured ? "Unfeature" : "Feature"}</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 rounded-[1.4rem] border border-border/70 bg-white/90 p-4 shadow-[var(--shadow-sm)] sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-muted">
              Showing {visibleSummaries.length} of {filteredSummaries.length} products
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={visiblePage === 1}>Prev</Button>
              <Badge variant="neutral">Page {visiblePage} of {totalPages}</Badge>
              <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={visiblePage >= totalPages}>Next</Button>
            </div>
          </div>
        </>
      ) : (
        <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-8 text-center shadow-[var(--shadow-sm)]">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 text-accent">
            <LayoutGrid className="h-9 w-9" aria-hidden="true" />
          </div>
          <h3 className="mt-5 text-2xl font-black text-text">No Products Yet</h3>
          <p className="mt-2 text-sm font-medium text-muted">Create the first product to start managing catalog data in Supabase.</p>
          <Button variant="accent" size="md" className="mt-6" onClick={() => openCreateProduct()} disabled={!canManage}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Product
          </Button>
        </Card>
      )}

      <Modal
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
        title={editingProductId ? "Edit Product" : "Create Product"}
        description="Product data is saved in Supabase with Cloudinary image URLs."
        className="max-w-6xl"
      >
        <div className="max-h-[80dvh] space-y-6 overflow-y-auto pr-1">
          <div className="rounded-[1.4rem] border border-white/80 bg-white/92 p-4 shadow-[var(--shadow-sm)]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Section 1</p>
            <h3 className="mt-1 text-lg font-black text-text">Quick Setup</h3>
            <p className="mt-1 text-sm font-medium text-muted">Create a product in under 30 seconds with only the essentials.</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="space-y-4">
              <FormField label="Product Name" htmlFor="product-name" error={formErrors.name}>
                <Input ref={productNameRef} id="product-name" value={form.name} onChange={(event) => handleNameChange(event.target.value)} placeholder="Product name" autoComplete="off" />
              </FormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Department" htmlFor="product-department" error={formErrors.departmentId}>
                  <select id="product-department" value={form.departmentId} onChange={(event) => handleDepartmentChange(event.target.value)} className="h-11 w-full rounded-[var(--radius-md)] border border-border bg-background px-3.5 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                    <option value="">Select department</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Category" htmlFor="product-category" error={formErrors.categoryId}>
                  <Button type="button" variant="outline" className="h-11 w-full justify-between px-3.5" onClick={openCategoryPicker} disabled={!form.departmentId}>
                    <span className="truncate text-left">
                      {selectedCategory?.name ?? (form.departmentId ? "Select category" : "Select Department First")}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </Button>
                </FormField>
                <FormField label="Brand" htmlFor="product-brand" error={formErrors.brandId}>
                  <Button type="button" variant="outline" className="h-11 w-full justify-between px-3.5" onClick={openBrandPicker} disabled={!form.departmentId || !form.categoryId}>
                    <span className="truncate text-left">
                      {selectedBrand?.name ?? (form.categoryId ? "Select brand" : "Select Category First")}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </Button>
                </FormField>
                <FormField label="Selling Price" htmlFor="product-selling-price" error={formErrors.sellingPrice}>
                  <Input id="product-selling-price" value={form.sellingPrice} onChange={(event) => updateForm({ sellingPrice: cleanNumberInput(event.target.value) })} placeholder="0" />
                </FormField>
                <FormField label="MRP" htmlFor="product-mrp" hint="Optional">
                  <Input id="product-mrp" value={form.mrp} onChange={(event) => updateForm({ mrp: cleanNumberInput(event.target.value) })} placeholder="0" />
                </FormField>
                <FormField label="Stock Quantity" htmlFor="product-stock" error={formErrors.stockQuantity}>
                  <Input id="product-stock" value={form.stockQuantity} onChange={(event) => updateForm({ stockQuantity: cleanNumberInput(event.target.value) })} placeholder="0" />
                </FormField>
              </div>
            </div>

            <div className="space-y-4">
              <FormField label="Product Status" htmlFor="product-status" error={formErrors.status}>
                <select id="product-status" value={form.status} onChange={(event) => updateForm({ status: event.target.value })} className="h-11 w-full rounded-[var(--radius-md)] border border-border bg-background px-3.5 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  {productStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </FormField>
              <label className="flex items-center gap-3 rounded-[1.2rem] border border-border/70 bg-white/80 px-4 py-3 text-sm font-semibold text-text">
                <input type="checkbox" checked={form.featured} onChange={(event) => updateForm({ featured: event.target.checked })} className="h-4 w-4 rounded border-border text-accent focus:ring-accent" />
                Featured product
              </label>
              <Card className="rounded-[1.35rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,247,237,0.85),rgba(255,255,255,0.95))] p-4 shadow-[var(--shadow-sm)]">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Live Preview</p>
                <div className="mt-3 overflow-hidden rounded-[1.2rem] border border-border/70 bg-white/95">
                  <div className="aspect-[4/3] bg-background-secondary/40">
                    <ProductImagePreview
                      url={form.images.find((image) => image.primary)?.url ?? form.images[0]?.url ?? null}
                      alt={form.name || "Product preview"}
                      label={form.name || "Product preview"}
                    />
                  </div>
                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-lg font-black text-text">{form.name || "Product name preview"}</p>
                        <p className="text-xs font-medium text-muted">{selectedBrand?.name ?? "Brand"} - {selectedCategory?.name ?? "Category"}</p>
                      </div>
                      <Badge variant={form.status === "active" ? "accent" : "neutral"}>{form.status}</Badge>
                    </div>
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Selling Price</p>
                        <p className="text-2xl font-black text-text">{form.sellingPrice ? formatPrice(parseNumber(form.sellingPrice)) : "Rs 0"}</p>
                      </div>
                      <p className="text-xs font-semibold text-muted">{form.stockQuantity || "0"} in stock</p>
                    </div>
                    <p className="line-clamp-3 text-sm font-medium leading-6 text-muted">{form.shortDescription || "Product preview appears here before saving."}</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <div className="rounded-[1.4rem] border border-white/80 bg-white/92 p-4 shadow-[var(--shadow-sm)]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Section 2</p>
            <h3 className="mt-1 text-lg font-black text-text">Product Images</h3>
            <p className="mt-1 text-sm font-medium text-muted">Drag and drop images, reorder them, and choose a primary image.</p>
          </div>
          <div className="space-y-4">
            <label
              className="group block cursor-pointer rounded-[1.5rem] border-2 border-dashed border-border/80 bg-white/85 p-5 shadow-[var(--shadow-sm)] transition-colors hover:border-accent/30 hover:bg-white"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => void handleImageDrop(event)}
            >
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(event) => void addImageFiles(event.target.files)} aria-label="Upload product images" />
              <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <Plus className="h-7 w-7" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-base font-bold text-text">{uploading ? "Uploading images..." : "Drop images here or click to upload"}</p>
                  <p className="mt-1 text-sm font-medium text-muted">Multiple images, thumbnail preview, primary image, reorder, and delete.</p>
                </div>
                <Badge variant="neutral">{form.images.length > 0 ? `${form.images.length} image${form.images.length === 1 ? "" : "s"} selected` : "At least one image required"}</Badge>
              </div>
            </label>
            {formErrors.images ? <p className="text-xs font-medium text-danger">{formErrors.images}</p> : null}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {form.images.map((image, index) => (
                <div key={image.id} draggable onDragStart={() => imageDragStart(image.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => imageDrop(image.id)} className={cn("rounded-[1.2rem] border border-border/70 bg-white/85 p-3 shadow-[var(--shadow-sm)]", image.primary && "ring-2 ring-accent")}>
                  <div className="aspect-[4/3] overflow-hidden rounded-[1rem]">
                    <ProductImagePreview url={image.url} alt={image.alt || form.name} label={form.name} />
                  </div>
                  <div className="mt-3 space-y-2">
                    <Input value={image.alt} onChange={(event) => setForm((current) => ({ ...current, images: current.images.map((item) => (item.id === image.id ? { ...item, alt: event.target.value } : item)) }))} placeholder="Alt text" />
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-text">
                        <input type="radio" checked={image.primary} onChange={() => setForm((current) => ({ ...current, images: current.images.map((item) => ({ ...item, primary: item.id === image.id })) }))} />
                        Primary
                      </label>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setForm((current) => ({ ...current, images: current.images.filter((item) => item.id !== image.id) }))}>
                          <X className="h-4 w-4" />
                        </Button>
                        <GripVertical className="h-4 w-4 text-muted" aria-hidden="true" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {index > 0 ? <Button variant="outline" size="sm" onClick={() => reorderImage(image.id, form.images[index - 1]!.id)}>Up</Button> : null}
                      {index < form.images.length - 1 ? <Button variant="outline" size="sm" onClick={() => reorderImage(image.id, form.images[index + 1]!.id)}>Down</Button> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <details className="rounded-[1.4rem] border border-white/80 bg-white/92 p-4 shadow-[var(--shadow-sm)]">
            <summary className="cursor-pointer list-none text-xs font-bold uppercase tracking-[0.18em] text-muted outline-none">
              Advanced Options
            </summary>
            <div className="mt-5 space-y-6">
              <AdminSectionCard title="Department-Specific Fields" description="Optional fields that change based on the selected department.">
                {departmentFieldPresets.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {departmentFieldPresets.map((field) => (
                      <FormField key={field.key} label={field.label} htmlFor={`department-field-${field.key}`}>
                        <Input
                          id={`department-field-${field.key}`}
                          value={getSpecValue(form.specifications, field.key) || getSpecValue(form.specifications, field.label)}
                          onChange={(event) => handleDepartmentFieldChange(field.key, event.target.value)}
                          placeholder={field.placeholder}
                        />
                      </FormField>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-medium text-muted">Select a department to reveal optional fields for that product type.</p>
                )}
              </AdminSectionCard>

              <AdminSectionCard title="Optional Details" description="Slug, SKU, descriptions, tax and inventory helpers.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Slug" htmlFor="product-slug" hint="Optional. Auto-generated from the product name if left blank." error={formErrors.slug}>
                    <Input id="product-slug" value={form.slug} onChange={(event) => handleSlugChange(event.target.value)} placeholder="product-slug" />
                  </FormField>
                  <FormField label="SKU" htmlFor="product-sku" hint="Optional. A unique SKU is generated if you leave this empty." error={formErrors.sku}>
                    <Input id="product-sku" value={form.sku} onChange={(event) => updateForm({ sku: event.target.value })} placeholder="SKU" />
                  </FormField>
                  <FormField label="GST %" htmlFor="product-gst">
                    <Input id="product-gst" value={form.gstRate} onChange={(event) => updateForm({ gstRate: cleanNumberInput(event.target.value) })} placeholder="18" />
                  </FormField>
                  <FormField label="HSN Code" htmlFor="product-hsn">
                    <Input id="product-hsn" value={form.hsnCode} onChange={(event) => updateForm({ hsnCode: event.target.value })} placeholder="HSN" />
                  </FormField>
                  <FormField label="Warehouse" htmlFor="product-warehouse">
                    <Input id="product-warehouse" value={form.warehouseLocation} onChange={(event) => updateForm({ warehouseLocation: event.target.value })} placeholder="Warehouse placeholder" />
                  </FormField>
                  <FormField label="Reserved Quantity" htmlFor="product-reserved">
                    <Input id="product-reserved" value={form.reservedQuantity} onChange={(event) => updateForm({ reservedQuantity: cleanNumberInput(event.target.value) })} placeholder="0" />
                  </FormField>
                  <FormField label="Low Stock Threshold" htmlFor="product-threshold">
                    <Input id="product-threshold" value={form.lowStockThreshold} onChange={(event) => updateForm({ lowStockThreshold: cleanNumberInput(event.target.value) })} placeholder="10" />
                  </FormField>
                  <FormField label="Discount %" htmlFor="product-discount">
                    <Input id="product-discount" value={form.mrp && form.sellingPrice ? String(Math.max(((parseNumber(form.mrp) - parseNumber(form.sellingPrice)) / Math.max(parseNumber(form.mrp), 1)) * 100, 0).toFixed(2)) : "0"} readOnly />
                  </FormField>
                </div>
                <div className="mt-4 grid gap-4">
                  <FormField label="Short Description" htmlFor="product-short-description">
                    <textarea id="product-short-description" value={form.shortDescription} onChange={(event) => updateForm({ shortDescription: event.target.value })} rows={3} className="min-h-24 w-full rounded-[var(--radius-md)] border border-border bg-background px-3.5 py-3 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" />
                  </FormField>
                  <FormField label="Full Description" htmlFor="product-description">
                    <textarea id="product-description" value={form.description} onChange={(event) => updateForm({ description: event.target.value })} rows={6} className="min-h-32 w-full rounded-[var(--radius-md)] border border-border bg-background px-3.5 py-3 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" />
                  </FormField>
                </div>
              </AdminSectionCard>

              <AdminSectionCard title="Variants" description="Optional variant setup for products that need it.">
                <div className="space-y-4">
                  {form.variants.map((variant, index) => (
                    <div key={variant.id} draggable onDragStart={() => variantImageDragStart(variant.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => variantImageDrop(variant.id, variant.id)} className="rounded-[1.2rem] border border-border/70 bg-white/85 p-4 shadow-[var(--shadow-sm)]">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted" aria-hidden="true" />
                          <p className="font-semibold text-text">Variant {index + 1}</p>
                        </div>
                        <label className="flex items-center gap-2 text-xs font-semibold text-text">
                          <input type="checkbox" checked={variant.primary} onChange={(event) => setForm((current) => ({ ...current, variants: current.variants.map((item) => ({ ...item, primary: item.id === variant.id ? event.target.checked : item.primary && !event.target.checked })) }))} />
                          Default
                        </label>
                      </div>
                      <div className="grid gap-3 lg:grid-cols-3">
                        <Input value={variant.variantName} onChange={(event) => setForm((current) => ({ ...current, variants: current.variants.map((item) => (item.id === variant.id ? { ...item, variantName: event.target.value } : item)) }))} placeholder="Variant name" />
                        <Input value={variant.optionLabel} onChange={(event) => setForm((current) => ({ ...current, variants: current.variants.map((item) => (item.id === variant.id ? { ...item, optionLabel: event.target.value } : item)) }))} placeholder="Option label" />
                        <Input value={variant.optionValue} onChange={(event) => setForm((current) => ({ ...current, variants: current.variants.map((item) => (item.id === variant.id ? { ...item, optionValue: event.target.value } : item)) }))} placeholder="Option value" />
                        <Input value={variant.sku} onChange={(event) => setForm((current) => ({ ...current, variants: current.variants.map((item) => (item.id === variant.id ? { ...item, sku: event.target.value } : item)) }))} placeholder="Variant SKU" />
                        <Input value={variant.price} onChange={(event) => setForm((current) => ({ ...current, variants: current.variants.map((item) => (item.id === variant.id ? { ...item, price: cleanNumberInput(event.target.value) } : item)) }))} placeholder="Price" />
                        <Input value={variant.stock} onChange={(event) => setForm((current) => ({ ...current, variants: current.variants.map((item) => (item.id === variant.id ? { ...item, stock: cleanNumberInput(event.target.value) } : item)) }))} placeholder="Stock" />
                      </div>
                      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                        <Input value={variant.imageUrl} onChange={(event) => setForm((current) => ({ ...current, variants: current.variants.map((item) => (item.id === variant.id ? { ...item, imageUrl: event.target.value } : item)) }))} placeholder="Variant image URL" />
                        <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-border/80 bg-white/85 px-4 py-2 text-sm font-semibold text-text transition-colors hover:border-accent/25 hover:bg-white">
                          <span>Upload</span>
                          <input type="file" accept="image/*" className="sr-only" onChange={(event) => void uploadVariantImage(variant.id, event.target.files?.[0] ?? null)} />
                        </label>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs font-semibold text-text">
                          <input type="checkbox" checked={variant.active} onChange={(event) => setForm((current) => ({ ...current, variants: current.variants.map((item) => (item.id === variant.id ? { ...item, active: event.target.checked } : item)) }))} />
                          Active
                        </label>
                        <Button variant="danger" size="sm" onClick={() => setForm((current) => ({ ...current, variants: current.variants.filter((item) => item.id !== variant.id) }))}>
                          <Trash2 className="h-4 w-4" />
                          Remove Variant
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addVariant}>
                    <Plus className="h-4 w-4" />Add Variant
                  </Button>
                </div>
              </AdminSectionCard>

              <AdminSectionCard title="Specifications" description="Unlimited custom attributes. Leave blank optional fields empty.">
                <div className="space-y-3">
                  {form.specifications.map((spec) => (
                    <div key={spec.id} className="grid gap-3 lg:grid-cols-[minmax(0,0.4fr)_minmax(0,1fr)_auto]">
                      <Input value={spec.key} onChange={(event) => setForm((current) => ({ ...current, specifications: current.specifications.map((item) => (item.id === spec.id ? { ...item, key: event.target.value } : item)) }))} placeholder="Key" />
                      <Input value={spec.value} onChange={(event) => setForm((current) => ({ ...current, specifications: current.specifications.map((item) => (item.id === spec.id ? { ...item, value: event.target.value } : item)) }))} placeholder="Value" />
                      <Button variant="danger" size="sm" onClick={() => setForm((current) => ({ ...current, specifications: current.specifications.filter((item) => item.id !== spec.id) }))}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addSpec}>
                    <Plus className="h-4 w-4" />Add Spec
                  </Button>
                </div>
              </AdminSectionCard>

              <AdminSectionCard title="Shipping" description="Optional shipping values.">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <FormField label="Weight" htmlFor="product-weight"><Input id="product-weight" value={form.weight} onChange={(event) => updateForm({ weight: cleanNumberInput(event.target.value) })} placeholder="0" /></FormField>
                  <FormField label="Length" htmlFor="product-length"><Input id="product-length" value={form.length} onChange={(event) => updateForm({ length: cleanNumberInput(event.target.value) })} placeholder="0" /></FormField>
                  <FormField label="Width" htmlFor="product-width"><Input id="product-width" value={form.width} onChange={(event) => updateForm({ width: cleanNumberInput(event.target.value) })} placeholder="0" /></FormField>
                  <FormField label="Height" htmlFor="product-height"><Input id="product-height" value={form.height} onChange={(event) => updateForm({ height: cleanNumberInput(event.target.value) })} placeholder="0" /></FormField>
                  <FormField label="Package Type" htmlFor="product-package-type"><Input id="product-package-type" value={form.packageType} onChange={(event) => updateForm({ packageType: event.target.value })} placeholder="Box, Can, Bag" /></FormField>
                  <label className="flex items-center gap-3 rounded-[1.2rem] border border-border/70 bg-white/80 px-4 py-3 text-sm font-semibold text-text">
                    <input type="checkbox" checked={form.fragile} onChange={(event) => updateForm({ fragile: event.target.checked })} />
                    Fragile
                  </label>
                </div>
              </AdminSectionCard>

              <AdminSectionCard title="SEO" description="Search-friendly metadata and indexing controls.">
                <div className="grid gap-4">
                  <FormField label="SEO Title" htmlFor="product-seo-title"><Input id="product-seo-title" value={form.seoTitle} onChange={(event) => updateForm({ seoTitle: event.target.value })} placeholder="SEO title" /></FormField>
                  <FormField label="Meta Description" htmlFor="product-meta-description"><Input id="product-meta-description" value={form.metaDescription} onChange={(event) => updateForm({ metaDescription: event.target.value })} placeholder="Meta description" /></FormField>
                  <FormField label="Keywords" htmlFor="product-keywords"><Input id="product-keywords" value={form.keywords} onChange={(event) => updateForm({ keywords: event.target.value })} placeholder="keyword 1, keyword 2" /></FormField>
                  <FormField label="Canonical URL" htmlFor="product-canonical-url" error={formErrors.canonicalUrl}><Input id="product-canonical-url" value={form.canonicalUrl} onChange={(event) => updateForm({ canonicalUrl: event.target.value })} placeholder="https://example.com/product" /></FormField>
                </div>
              </AdminSectionCard>

              <AdminSectionCard title="Related Products" description="Optional cross-sell / upsell items.">
                <div className="space-y-4">
                  <Input value={relatedSearchTerm} onChange={(event) => setRelatedSearchTerm(event.target.value)} placeholder="Search existing products" aria-label="Search existing products" />
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {relatedSearchProducts.slice(0, 12).map((product) => (
                      <label key={product.id} className="flex items-start gap-3 rounded-[1.2rem] border border-border/70 bg-white/80 px-4 py-3 text-sm font-medium text-text">
                        <input
                          type="checkbox"
                          checked={form.relatedProductIds.includes(product.id)}
                          onChange={(event) => setForm((current) => ({
                            ...current,
                            relatedProductIds: event.target.checked ? [...current.relatedProductIds, product.id] : current.relatedProductIds.filter((id) => id !== product.id),
                          }))}
                          className="mt-1"
                        />
                        <span className="flex-1">
                          <span className="block font-semibold text-text">{product.name}</span>
                          <span className="block text-xs text-muted">{product.sku}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="text-sm font-medium text-muted">{selectedProductCount} related products selected.</p>
                </div>
              </AdminSectionCard>
            </div>
          </details>

          <div className="sticky bottom-0 -mx-1 mt-4 border-t border-border/70 bg-background/95 px-1 py-4 backdrop-blur-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="outline" size="md" className="w-full sm:w-auto" onClick={() => { setDialogOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button variant="accent" size="md" loading={saving} onClick={() => void saveProduct()} disabled={!canManage || uploading} className="w-full sm:w-auto">
                {uploading ? "Uploading..." : editingProductId ? "Update Product" : "Save Product"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={pickerMode === "category"}
        onOpenChange={(open) => {
          if (!open) closePicker();
        }}
        title="Choose Category"
        description={selectedDepartment ? `Select a category for ${selectedDepartment.name}.` : "Select a department first."}
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <Input
              value={pickerQuery}
              onChange={(event) => {
                setPickerQuery(event.target.value);
                setCategoryCreationName(event.target.value);
              }}
              placeholder="Search categories"
              className="h-12 pl-10"
              autoFocus
            />
          </div>
          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {filteredCategories.length > 0 ? (
              filteredCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => selectCategory(category.id)}
                  className="flex w-full items-center justify-between rounded-[1.1rem] border border-border/70 bg-white/85 px-4 py-3 text-left text-sm font-semibold text-text hover:border-accent/30 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <span>
                    <span className="block">{category.name}</span>
                    <span className="block text-xs font-medium text-muted">{category.slug}</span>
                  </span>
                  <ChevronDown className="h-4 w-4 -rotate-90 text-muted" aria-hidden="true" />
                </button>
              ))
            ) : (
              <Card className="rounded-[1.2rem] border border-dashed border-border/70 bg-background-secondary/30 p-4 text-sm font-medium text-muted">
                No categories found for this department.
              </Card>
            )}
          </div>
          {filteredCategorySuggestions.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Suggested categories</p>
              <div className="flex flex-wrap gap-2">
                {filteredCategorySuggestions.slice(0, 6).map((category) => (
                  <button
                    key={category.slug}
                    type="button"
                    onClick={() => void createCategoryFromPicker(category.name)}
                    className="rounded-full border border-border/70 bg-background-secondary/35 px-3 py-2 text-xs font-semibold text-text hover:border-accent/30 hover:bg-white"
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <Button
            type="button"
            variant="accent"
            className="w-full"
            onClick={() => void createCategoryFromPicker(categoryCreationCandidate)}
            disabled={!canCreateCategoryNow || uploading}
          >
            <Plus className="h-4 w-4" />
            {`Create New Category "${categoryCreationCandidate || "Category Name"}"`}
          </Button>
        </div>
      </Modal>

      <Modal
        open={pickerMode === "brand"}
        onOpenChange={(open) => {
          if (!open) closePicker();
        }}
        title="Choose Brand"
        description={selectedCategory ? `Search or create a brand for ${selectedCategory.name}.` : "Select a category first."}
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <Input
              value={pickerQuery}
              onChange={(event) => {
                setPickerQuery(event.target.value);
                setBrandCreationName(event.target.value);
              }}
              placeholder="Search brands"
              className="h-12 pl-10"
              autoFocus
            />
          </div>
          <div className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
            {filteredBrands.length > 0 ? (
              filteredBrands.map((brand) => (
                <button
                  key={brand.id}
                  type="button"
                  onClick={() => selectBrand(brand.id)}
                  className="flex w-full items-center justify-between rounded-[1.1rem] border border-border/70 bg-white/85 px-4 py-3 text-left text-sm font-semibold text-text hover:border-accent/30 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <span>
                    <span className="block">{brand.name}</span>
                    <span className="block text-xs font-medium text-muted">{brand.slug}</span>
                  </span>
                  <ChevronDown className="h-4 w-4 -rotate-90 text-muted" aria-hidden="true" />
                </button>
              ))
            ) : (
              <Card className="rounded-[1.2rem] border border-dashed border-border/70 bg-background-secondary/30 p-4 text-sm font-medium text-muted">
                No brands found. Create one instantly below.
              </Card>
            )}
          </div>
          <Button
            type="button"
            variant="accent"
            className="w-full"
            onClick={() => void createBrandFromPicker(brandCreationCandidate)}
            disabled={!canCreateBrandNow || uploading}
          >
            <Plus className="h-4 w-4" />
            {`Create New Brand "${brandCreationCandidate || "Brand Name"}"`}
          </Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTargetId)}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetId(null);
        }}
        title="Delete Product"
        description="This will archive the product using soft delete."
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm font-medium text-muted">Are you sure you want to delete this product?</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" size="md" onClick={() => setDeleteTargetId(null)}>Cancel</Button>
            <Button variant="danger" size="md" onClick={() => void softDeleteProduct()} disabled={!canManage}>Delete Product</Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

export { ProductsAdminPage };


