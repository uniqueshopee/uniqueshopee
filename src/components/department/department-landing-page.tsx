import Link from "next/link";
import { ProductShowcase } from "@/components/product/product-showcase";
import type { DepartmentContent } from "@/lib/department-data";
import { DepartmentCategoryCard } from "./department-category-card";
import { DepartmentBrandCard } from "./department-brand-card";
import type { Product } from "@/types";

function DepartmentLandingPage({
  department,
  featuredProducts,
}: {
  department: DepartmentContent;
  featuredProducts: Product[];
}) {
  return (
    <main className="bg-background">
      <section className="relative isolate overflow-hidden border-b border-border surface-warm">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-orange-400/5 blur-3xl" />
          <div className="absolute right-0 top-10 h-56 w-56 rounded-full bg-sky-400/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 py-8 lg:py-10">
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex flex-wrap items-center gap-2 text-sm font-medium text-muted">
              <li>
                <Link href="/" className="transition-colors hover:text-text focus-visible:text-text">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <span aria-current="page" className="text-muted">
                  Departments
                </span>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-text">{department.title}</li>
            </ol>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.28em] text-accent">
                {department.eyebrow}
              </span>
              <h1 className="mt-4 text-3xl font-bold text-text sm:text-4xl lg:text-5xl">
                {department.title}
              </h1>
              <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-muted sm:text-lg">
                {department.description}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-white/70 bg-white/90 p-5 shadow-[var(--shadow-sm)] backdrop-blur-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.25rem] bg-gradient-to-br from-background-secondary to-white p-4">
                  <div className="text-xs font-bold uppercase tracking-[0.24em] text-muted">
                    Featured Categories
                  </div>
                  <div className="mt-2 text-2xl font-bold text-text">{department.categories.length}</div>
                </div>
                <div className="rounded-[1.25rem] bg-gradient-to-br from-background-secondary to-white p-4">
                  <div className="text-xs font-bold uppercase tracking-[0.24em] text-muted">
                    Popular Brands
                  </div>
                  <div className="mt-2 text-2xl font-bold text-text">{department.brands.length}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden border-b border-border surface-gray">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-24 top-0 h-72 w-72 rounded-full bg-sky-400/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 py-14 lg:py-20">
          <div className="mb-8 max-w-2xl lg:mb-10">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-accent">
              Featured categories
            </p>
            <h2 className="mt-3 text-xl font-bold text-text sm:text-2xl">Featured Categories</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {department.categories.map((category) => (
              <DepartmentCategoryCard key={category.name} category={category} />
            ))}
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden border-b border-border surface-splash">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-orange-400/5 blur-3xl" />
          <div className="absolute right-0 bottom-0 h-56 w-56 rounded-full bg-emerald-400/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 py-14 lg:py-20">
          <div className="mb-8 max-w-2xl lg:mb-10">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-accent">
              Popular brands
            </p>
            <h2 className="mt-3 text-xl font-bold text-text sm:text-2xl">Popular Brands</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {department.brands.map((brand) => (
              <DepartmentBrandCard key={brand.name} brand={brand} />
            ))}
          </div>
        </div>
      </section>

      <ProductShowcase
        title="Featured Products"
        subtitle={`Carefully selected products from the ${department.title.toLowerCase()} department.`}
        products={featuredProducts}
        viewAllHref="/products"
        badge="Featured"
        viewAllLabel="View All Products"
      />
    </main>
  );
}

export { DepartmentLandingPage };
