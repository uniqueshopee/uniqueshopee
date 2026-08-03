import { ProductGridSkeleton, Skeleton } from "@/components/ui/skeleton";

function CartItemSkeleton() {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-white/75 bg-white/92 p-4 shadow-[var(--shadow-sm)]">
      <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
        <Skeleton className="h-32 w-full rounded-[1.2rem] sm:h-36 sm:w-36" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-24 rounded-full" />
          <Skeleton className="h-6 w-72 rounded-full" />
          <Skeleton className="h-4 w-full max-w-md rounded-full" />
          <Skeleton className="h-11 w-full max-w-xs rounded-full" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-28 rounded-full" />
            <Skeleton className="h-9 w-28 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="space-y-4 rounded-[1.5rem] border border-white/75 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
      <Skeleton className="h-5 w-40 rounded-full" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-full rounded-full" />
        <Skeleton className="h-4 w-full rounded-full" />
        <Skeleton className="h-4 w-full rounded-full" />
        <Skeleton className="h-4 w-full rounded-full" />
        <Skeleton className="h-4 w-full rounded-full" />
        <Skeleton className="h-8 w-full rounded-full" />
      </div>
      <Skeleton className="h-12 w-full rounded-full" />
      <Skeleton className="h-12 w-full rounded-full" />
    </div>
  );
}

export default function Loading() {
  return (
    <section className="relative isolate overflow-hidden border-b border-border surface-texture">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-12 h-80 w-80 rounded-full bg-orange-300/6 blur-3xl" />
        <div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-sky-300/6 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:py-14">
        <Skeleton className="mb-6 h-4 w-36 rounded-full" />
        <Skeleton className="mb-6 h-32 w-full rounded-[1.75rem]" />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            <CartItemSkeleton />
            <CartItemSkeleton />

            <div className="space-y-4 rounded-[1.5rem] border border-white/75 bg-white/92 p-5 shadow-[var(--shadow-sm)]">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-12 w-full rounded-full" />
              <Skeleton className="h-4 w-40 rounded-full" />
            </div>

            <div className="space-y-4 rounded-[1.5rem] border border-white/75 bg-white/92 p-5 shadow-[var(--shadow-sm)]">
              <Skeleton className="h-5 w-44 rounded-full" />
              <Skeleton className="h-12 w-full rounded-full" />
              <Skeleton className="h-20 w-full rounded-[1.25rem]" />
            </div>
          </div>

          <SummarySkeleton />
        </div>

        <div className="mt-10 space-y-8">
          <div className="space-y-4 rounded-[1.5rem] border border-white/75 bg-white/92 p-5 shadow-[var(--shadow-sm)]">
            <Skeleton className="h-6 w-56 rounded-full" />
            <Skeleton className="h-5 w-80 rounded-full" />
            <ProductGridSkeleton count={4} />
          </div>
          <div className="space-y-4 rounded-[1.5rem] border border-white/75 bg-white/92 p-5 shadow-[var(--shadow-sm)]">
            <Skeleton className="h-6 w-40 rounded-full" />
            <Skeleton className="h-5 w-72 rounded-full" />
            <ProductGridSkeleton count={4} />
          </div>
        </div>
      </div>
    </section>
  );
}
