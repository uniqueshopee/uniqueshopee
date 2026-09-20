import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCatalogSnapshot, getLiveCategoryBySlug } from "@/lib/catalog";
import { createPageMetadata } from "@/lib/seo";

type CategoryPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const snapshot = await getCatalogSnapshot();
  return snapshot.categories.map((category) => ({ slug: category.slug }));
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

  const snapshot = await getCatalogSnapshot();
  const liveCategory = snapshot.byCategorySlug.get(slug);
  if (!liveCategory) {
    notFound();
  }
  const query = new URLSearchParams({ department: liveCategory.departmentSlug, category: liveCategory.slug });

  redirect(`/products?${query.toString()}`);
}
