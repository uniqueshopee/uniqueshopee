import type { Product } from "@/types";
import { ProductCard } from "./product-card";
import { EmptyState } from "@/components/feedback/empty-state";

function ProductGrid({ title, products }: { title: string; products: Product[] }) {
  return (
    <section
      aria-labelledby={`grid-${title}`}
      className="relative isolate overflow-hidden border-b border-border surface-gray"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-56 w-56 rounded-full bg-orange-300/5 blur-3xl" />
        <div className="absolute right-12 top-12 h-48 w-48 rounded-full bg-sky-300/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="mb-5 max-w-2xl">
          <div className="mb-3 inline-flex rounded-full border border-accent/15 bg-white/75 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-accent shadow-[var(--shadow-sm)] backdrop-blur-sm eyebrow-font">
            Marketplace picks
          </div>
          <h2 id={`grid-${title}`} className="text-xl font-bold text-text sm:text-2xl">
            {title}
          </h2>
        </div>

        {products.length === 0 ? (
          <EmptyState title="No products here yet" description="Check back soon - new stock is added weekly." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {products.map((product) => (
              <div key={product.id}>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export { ProductGrid };
