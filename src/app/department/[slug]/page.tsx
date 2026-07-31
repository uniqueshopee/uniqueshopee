import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DepartmentLandingPage } from "@/components/department/department-landing-page";
import { JsonLdScript } from "@/components/seo/json-ld";
import { getCatalogSnapshot, getLiveDepartmentBySlug } from "@/lib/catalog";
import { absoluteUrl, breadcrumbJsonLd, createPageMetadata } from "@/lib/seo";

type DepartmentPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  return getCatalogSnapshot().then((snapshot) => snapshot.departments.map((department) => ({ slug: department.slug })));
}

export async function generateMetadata({ params }: DepartmentPageProps): Promise<Metadata> {
  const { slug } = await params;
  const department = await getLiveDepartmentBySlug(slug);

  if (!department) {
    return {
      title: "Department not found | UniqueShopee",
    };
  }

  return createPageMetadata({
    title: `${department.title} Department | UniqueShopee`,
    description: department.description,
    pathname: `/department/${slug}`,
  });
}

export default async function DepartmentPage({ params }: DepartmentPageProps) {
  const { slug } = await params;
  const department = await getLiveDepartmentBySlug(slug);

  if (!department) {
    notFound();
  }

  const snapshot = await getCatalogSnapshot();
  const featuredProducts = snapshot.products.filter((product) => department.featuredProductIds.includes(product.id));

  return (
    <>
      <JsonLdScript
        data={breadcrumbJsonLd([
          { name: "Home", item: absoluteUrl("/") },
          { name: department.title, item: absoluteUrl(`/department/${department.slug}`) },
        ])}
      />
      <DepartmentLandingPage department={department} featuredProducts={featuredProducts} />
    </>
  );
}
