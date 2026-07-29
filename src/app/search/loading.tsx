import { ProductGridSkeleton, Skeleton } from "@/components/ui/skeleton";

function FilterSkeleton() {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 space-y-4">
        <Skeleton className="h-6 w-24" />
        <div className="space-y-4 rounded-[1.5rem] border border-white/75 bg-white/92 p-4 shadow-[var(--shadow-sm)]">
          <Skeleton className="h-11 w-full rounded-full" />
          <Skeleton className="h-11 w-full rounded-full" />
          <Skeleton className="h-11 w-full rounded-full" />
          <Skeleton className="h-11 w-full rounded-full" />
          <Skeleton className="h-11 w-full rounded-full" />
        </div>
      </div>
    </aside>
  );
}

export default function Loading() {
  return (
    <section className="relative isolate overflow-hidden border-b border-border surface-texture">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-12 h-72 w-72 rounded-full bg-orange-300/6 blur-3xl" />
        <div className="absolute right-0 top-16 h-80 w-80 rounded-full bg-sky-300/6 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:py-14">
        <Skeleton className="mb-6 h-4 w-36 rounded-full" />

        <div className="mb-6 space-y-3">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-12 w-full max-w-3xl rounded-[1.5rem]" />
          <Skeleton className="h-5 w-full max-w-2xl" />
        </div>

        <Skeleton className="mb-8 h-24 w-full rounded-[1.75rem]" />

        <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <FilterSkeleton />
          <div className="space-y-4">
            <Skeleton className="h-20 w-full rounded-[1.5rem]" />
            <ProductGridSkeleton count={4} />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
