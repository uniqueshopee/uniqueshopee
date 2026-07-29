import type { Product } from "@/types";
import { getLiveDepartmentBySlug } from "@/lib/catalog";

export type DepartmentTone = {
  fill: string;
  ring: string;
  accentRgb: string;
  wash: string;
};

export type DepartmentCategoryItem = {
  name: string;
  description: string;
  href: string;
  initials: string;
  tone: DepartmentTone;
};

export type DepartmentBrandItem = {
  name: string;
  category: "Paint" | "Plumbing";
  description: string;
  initials: string;
  href: string;
  tone: DepartmentTone;
};

export type DepartmentContent = {
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
  categories: DepartmentCategoryItem[];
  brands: DepartmentBrandItem[];
  featuredProductIds: Product["id"][];
};

export function getDepartmentBySlug(slug: string) {
  return getLiveDepartmentBySlug(slug);
}

export function getDepartmentStaticParams() {
  return Promise.resolve([] as Array<{ slug: string }>);
}
