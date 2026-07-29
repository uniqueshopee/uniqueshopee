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
  badge?: "new" | "bestseller" | "sale";
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
  name: string;
  price: number;
  image: string;
  quantity: number;
  slug?: string;
  category?: string;
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
