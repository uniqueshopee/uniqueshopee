import { ProductGridSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="bg-background">
      <section className="relative isolate overflow-hidden border-b border-border surface-warm">
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:py-14">
          <Skeleton className="mb-5 h-4 w-40 rounded-full" />
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4">
              <Skeleton className="h-5 w-32 rounded-full" />
              <Skeleton className="h-12 w-72" />
              <Skeleton className="h-6 w-full max-w-xl" />
              <div className="flex flex-wrap gap-3">
                <Skeleton className="h-16 w-28 rounded-[1.25rem]" />
                <Skeleton className="h-16 w-32 rounded-[1.25rem]" />
                <Skeleton className="h-16 w-28 rounded-[1.25rem]" />
              </div>
            </div>
            <Skeleton className="h-80 rounded-[2rem]" />
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:py-16">
        <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
          <Skeleton className="h-12 rounded-full" />
          <Skeleton className="h-12 rounded-full" />
          <Skeleton className="h-12 rounded-full" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <div className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              <Skeleton className="h-6 w-24" />
              <div className="space-y-4 rounded-[1.35rem] border border-border/70 bg-white/85 p-4 shadow-[var(--shadow-sm)]">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-28 rounded-[1.2rem]" />
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-16 rounded-[1.35rem]" />
            <ProductGridSkeleton count={4} />
          </div>
        </div>
      </section>
    </main>
  );
}
