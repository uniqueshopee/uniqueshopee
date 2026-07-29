import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetailPage } from "@/components/product/product-detail-page";
import { getCatalogSnapshot, getLiveProductBySlug } from "@/lib/catalog";

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

  return {
    title: `${data.product.name} | UniqueShopee`,
    description: data.detail.description,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const data = await getLiveProductBySlug(slug);

  if (!data) {
    notFound();
  }

  const snapshot = await getCatalogSnapshot();
  const relatedProducts = data.detail.relatedProductIds
    .map((productId) => snapshot.products.find((item) => item.id === productId))
    .filter((item): item is (typeof snapshot.products)[number] => item !== undefined && item.slug !== slug);

  return (
    <ProductDetailPage
      product={data.product}
      detail={data.detail}
      relatedProducts={relatedProducts}
    />
  );
}
