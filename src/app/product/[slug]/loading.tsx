import { Skeleton, ProductGridSkeleton } from "@/components/ui/skeleton";

function SectionSkeleton() {
  return (
    <div className="rounded-[2rem] border border-white/75 bg-white/92 p-4 shadow-[var(--shadow-lg)]">
      <Skeleton className="aspect-square rounded-[1.7rem]" />
    </div>
  );
}

export default function Loading() {
  return (
    <main className="bg-background">
      <section className="relative isolate overflow-hidden border-b border-border surface-warm">
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:py-14">
          <Skeleton className="mb-5 h-4 w-56 rounded-full" />
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4">
              <SectionSkeleton />
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="aspect-square rounded-[1.2rem]" />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-[1.5rem] border border-white/75 bg-white/92 p-6 shadow-[var(--shadow-lg)]">
                <div className="space-y-4">
                  <Skeleton className="h-14 w-40" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Skeleton className="h-12 rounded-full" />
                    <Skeleton className="h-12 rounded-full" />
                  </div>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-24 rounded-[1.5rem]" />
                <Skeleton className="h-24 rounded-[1.5rem]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-6 py-14 lg:py-20">
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-[1.5rem]" />
          <Skeleton className="h-72 rounded-[1.5rem]" />
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Skeleton className="h-80 rounded-[1.5rem]" />
          <Skeleton className="h-80 rounded-[1.5rem]" />
        </div>
      </section>

      <section className="surface-gray border-y border-border py-14">
        <div className="mx-auto max-w-7xl px-6">
          <Skeleton className="mb-6 h-6 w-56" />
          <ProductGridSkeleton count={4} />
        </div>
      </section>
    </main>
  );
}
