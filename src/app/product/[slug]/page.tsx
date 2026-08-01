import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ProductDetailPage } from "@/components/product/product-detail-page";
import { JsonLdScript } from "@/components/seo/json-ld";
import { getCatalogSnapshot, getLiveProductBySlug } from "@/lib/catalog";
import { absoluteUrl, breadcrumbJsonLd, createPageMetadata, faqJsonLd, productJsonLd } from "@/lib/seo";

type ProductPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  return getCatalogSnapshot().then((snapshot) => snapshot.products.map((product) => ({ slug: product.slug })));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getLiveProductBySlug(slug);

  if (!data) {
    return {
      title: "Product not found | UniqueShopee",
    };
  }

  return createPageMetadata({
    title: `${data.product.name} | UniqueShopee`,
    description: data.detail.description,
    pathname: `/product/${slug}`,
  });
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const data = await getLiveProductBySlug(slug);

  if (!data) {
    notFound();
  }

  if (slug !== data.product.slug) {
    redirect(`/product/${data.product.slug}`);
  }

  const snapshot = await getCatalogSnapshot();
  const relatedProducts = data.detail.relatedProductIds
    .map((productId) => snapshot.products.find((item) => item.id === productId))
    .filter((item): item is (typeof snapshot.products)[number] => item !== undefined && item.slug !== slug);

  return (
    <>
      <JsonLdScript
        data={breadcrumbJsonLd([
          { name: "Home", item: absoluteUrl("/") },
          { name: "Products", item: absoluteUrl("/products") },
          { name: data.product.name, item: absoluteUrl(`/product/${data.product.slug}`) },
        ])}
      />
      <JsonLdScript data={productJsonLd({ product: data.product, detail: data.detail, pathname: `/product/${data.product.slug}` })} />
      {data.detail.faq.length > 0 && <JsonLdScript data={faqJsonLd(data.detail.faq)} />}
      <ProductDetailPage product={data.product} detail={data.detail} relatedProducts={relatedProducts} />
    </>
  );
}
