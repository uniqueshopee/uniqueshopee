import { Skeleton, ProductGridSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="bg-background">
      <section className="relative isolate overflow-hidden border-b border-border surface-warm">
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:py-14">
          <Skeleton className="mb-5 h-4 w-56 rounded-full" />
          <div className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div className="space-y-4">
              <Skeleton className="h-5 w-32 rounded-full" />
              <Skeleton className="h-12 w-72" />
              <Skeleton className="h-6 w-full max-w-xl" />
              <div className="grid gap-3 sm:grid-cols-3">
                <Skeleton className="h-16 rounded-[1.25rem]" />
                <Skeleton className="h-16 rounded-[1.25rem]" />
                <Skeleton className="h-16 rounded-[1.25rem]" />
              </div>
            </div>
            <Skeleton className="h-[28rem] rounded-[2rem]" />
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:py-16">
        <Skeleton className="mb-6 h-6 w-44" />
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Skeleton className="h-[28rem] rounded-[1.5rem]" />
          <div className="space-y-4">
            <Skeleton className="h-48 rounded-[1.5rem]" />
            <Skeleton className="h-48 rounded-[1.5rem]" />
          </div>
        </div>
      </section>

      <section className="surface-splash border-y border-border py-14">
        <div className="mx-auto max-w-7xl px-6">
          <Skeleton className="mb-6 h-6 w-52" />
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-56 rounded-[1.5rem]" />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14 lg:py-20">
        <Skeleton className="mb-6 h-6 w-48" />
        <ProductGridSkeleton count={4} />
      </section>
    </main>
  );
}
