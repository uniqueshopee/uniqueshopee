import { ProductGridSkeleton, Skeleton } from "@/components/ui/skeleton";

function HeaderSkeleton() {
  return (
    <div className="space-y-4 rounded-[1.75rem] border border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
      <Skeleton className="h-4 w-36 rounded-full" />
      <div className="space-y-3">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-12 w-full max-w-2xl rounded-[1.5rem]" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-12 w-44 rounded-full" />
        <Skeleton className="h-12 w-28 rounded-full" />
      </div>
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
        <HeaderSkeleton />

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <ProductGridSkeleton count={4} />
        </div>

        <div className="mt-10 space-y-8">
          <div className="space-y-4 rounded-[1.5rem] border border-white/80 bg-white/92 p-5 shadow-[var(--shadow-sm)]">
            <Skeleton className="h-6 w-40 rounded-full" />
            <Skeleton className="h-5 w-72" />
            <ProductGridSkeleton count={4} />
          </div>
          <div className="space-y-4 rounded-[1.5rem] border border-white/80 bg-white/92 p-5 shadow-[var(--shadow-sm)]">
            <Skeleton className="h-6 w-44 rounded-full" />
            <Skeleton className="h-5 w-80" />
            <ProductGridSkeleton count={4} />
          </div>
        </div>
      </div>
    </section>
  );
}
