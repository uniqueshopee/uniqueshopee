import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandLandingPage } from "@/components/brand/brand-landing-page";
import { JsonLdScript } from "@/components/seo/json-ld";
import { getCatalogSnapshot, getLiveBrandBySlug } from "@/lib/catalog";
import { absoluteUrl, breadcrumbJsonLd, createPageMetadata, faqJsonLd } from "@/lib/seo";

type BrandPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  return getCatalogSnapshot().then((snapshot) => snapshot.brands.map((brand) => ({ slug: brand.slug })));
}

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getLiveBrandBySlug(slug);

  if (!brand) {
    return {
      title: "Brand not found | UniqueShopee",
    };
  }

  return createPageMetadata({
    title: `${brand.name} | UniqueShopee`,
    description: brand.description,
    pathname: `/brand/${slug}`,
  });
}

export default async function BrandPage({ params }: BrandPageProps) {
  const { slug } = await params;
  const brand = await getLiveBrandBySlug(slug);

  if (!brand) {
    notFound();
  }

  const snapshot = await getCatalogSnapshot();
  const featuredProducts = snapshot.products.filter((product) => brand.featuredProductIds.includes(product.id));
  const recentProducts = snapshot.products.filter((product) => brand.recentProductIds.includes(product.id));
  type LiveBrand = Awaited<ReturnType<typeof getLiveBrandBySlug>>;
  const relatedBrands = (await Promise.all(brand.relatedBrandSlugs.map((relatedSlug) => getLiveBrandBySlug(relatedSlug)))).filter(
    (item): item is Exclude<LiveBrand, null> => Boolean(item),
  );

  return (
    <>
      <JsonLdScript
        data={breadcrumbJsonLd([
          { name: "Home", item: absoluteUrl("/") },
          { name: "Products", item: absoluteUrl("/products") },
          { name: brand.name, item: absoluteUrl(`/brand/${brand.slug}`) },
        ])}
      />
      {brand.faqs.length > 0 && <JsonLdScript data={faqJsonLd(brand.faqs)} />}
      <BrandLandingPage
        brand={brand}
        featuredProducts={featuredProducts}
        recentProducts={recentProducts.length > 0 ? recentProducts : snapshot.products.slice(0, 4)}
        relatedBrands={relatedBrands}
      />
    </>
  );
}
