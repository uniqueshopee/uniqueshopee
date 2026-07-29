import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { CategoryLandingPage } from "@/components/category/category-landing-page";
import { getCatalogSnapshot, getLiveCategoryBySlug } from "@/lib/catalog";
import type { Product } from "@/types";

type CategoryPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  return getCatalogSnapshot().then((snapshot) => snapshot.categories.map((category) => ({ slug: category.slug })));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getLiveCategoryBySlug(slug);

  if (!category) {
    return {
      title: "Category not found | UniqueShopee",
    };
  }

  return {
    title: `${category.title} Category | UniqueShopee`,
    description: category.description,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = await getLiveCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  if (slug === "paints") {
    redirect("/products");
  }

  const snapshot = await getCatalogSnapshot();
  const catalog = snapshot.products
    .filter((product) => category.productIds.includes(product.id))
    .map((product) => ({
      ...product,
      brand: product.brandName,
      isFeatured: product.featured,
      isNew: product.isNew,
    }));
  const recentProducts: Product[] = catalog.length > 0 ? catalog.slice(0, 4) : snapshot.products.slice(0, 4);

  return (
    <CategoryLandingPage
      category={category}
      products={catalog}
      recentProducts={recentProducts}
    />
  );
}
