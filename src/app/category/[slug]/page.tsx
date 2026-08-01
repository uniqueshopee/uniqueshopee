import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getLiveCategoryBySlug } from "@/lib/catalog";
import { createPageMetadata } from "@/lib/seo";

const FALLBACK_CATEGORY_SLUGS = [
  "paints",
  "interior-paint",
  "exterior-paint",
  "primer",
  "wall-putty",
  "waterproofing",
  "paint-accessories",
  "plumbing",
  "pvc-pipes",
  "cpvc-pipes",
  "fittings",
  "faucets",
  "valves",
  "water-tanks",
];

const PLUMBING_CATEGORY_SLUGS = new Set([
  "plumbing",
  "pvc-pipes",
  "cpvc-pipes",
  "fittings",
  "faucets",
  "valves",
  "water-tanks",
]);

type CategoryPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  return FALLBACK_CATEGORY_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getLiveCategoryBySlug(slug);

  if (!category) {
    return {
      title: "Category not found | UniqueShopee",
    };
  }

  return createPageMetadata({
    title: `${category.title} Category | UniqueShopee`,
    description: category.description,
    pathname: `/category/${slug}`,
  });
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = await getLiveCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const department = PLUMBING_CATEGORY_SLUGS.has(slug) ? "plumbing" : "paints";
  const query = new URLSearchParams({ department });
  if (category.title !== (department === "paints" ? "Paints" : "Plumbing")) {
    query.set("category", category.title);
  }

  redirect(`/products?${query.toString()}`);
}
