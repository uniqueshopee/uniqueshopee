export interface Product {
  id: string;
  name: string;
  slug: string;
  sku?: string;
  price: number;
  compareAtPrice?: number;
  image: string;
  category: string;
  rating?: number;
  reviewCount?: number;
  inStock: boolean;
  stockCount?: number;
  reservedCount?: number;
  lowStockThreshold?: number;
  badge?: "new" | "bestseller" | "sale" | "exclusive";
  exclusiveOffer?: boolean;
  exclusiveOfferPercent?: number;
  supportsShades?: boolean;
  brandId?: string;
  departmentSlug?: string;
  categorySlug?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  href: string;
  children?: Category[];
}

export interface CartItem {
  productId: string;
  variantId?: string;
  shadeId?: string;
  shadeCode?: string;
  shadeName?: string;
  shadeFamily?: string;
  shadeSubFamily?: string;
  shadeHexColor?: string;
  packSize?: string;
  unit?: string;
  finish?: string;
  name: string;
  price: number;
  basePrice?: number;
  shadeExtraPrice?: number;
  gstRate?: number;
  finalUnitPrice?: number;
  sku?: string;
  image: string;
  quantity: number;
  slug?: string;
  category?: string;
  brand?: string;
  variant?: string;
  compareAtPrice?: number;
  inStock?: boolean;
  stockCount?: number;
  reservedCount?: number;
  lowStockThreshold?: number;
}

export interface NavLink {
  label: string;
  href: string;
  disabled?: boolean;
}

export interface Department {
  id: "paints" | "plumbing";
  title: string;
  items: string[];
  ctaLabel: string;
  href: string;
}
