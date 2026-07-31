import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { CategoryLandingPage } from "@/components/category/category-landing-page";
import { JsonLdScript } from "@/components/seo/json-ld";
import { getCatalogSnapshot, getLiveCategoryBySlug } from "@/lib/catalog";
import { breadcrumbJsonLd, createPageMetadata, faqJsonLd, absoluteUrl } from "@/lib/seo";
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
    <>
      <JsonLdScript
        data={breadcrumbJsonLd([
          { name: "Home", item: absoluteUrl("/") },
          { name: "Categories", item: absoluteUrl("/categories") },
          { name: category.title, item: absoluteUrl(`/category/${category.slug}`) },
        ])}
      />
      {category.faq.length > 0 && <JsonLdScript data={faqJsonLd(category.faq)} />}
      <CategoryLandingPage category={category} products={catalog} recentProducts={recentProducts} />
    </>
  );
}
