import { ProductGridSkeleton, Skeleton } from "@/components/ui/skeleton";

function FilterSkeleton() {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 space-y-4">
        <Skeleton className="h-6 w-24" />
        <div className="space-y-4 rounded-[1.35rem] border border-border/70 bg-white/85 p-4 shadow-[var(--shadow-sm)]">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="space-y-3 rounded-[1.25rem] border border-border/60 bg-white/75 p-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-full" />
              <Skeleton className="h-10 w-full rounded-full" />
              <Skeleton className="h-10 w-5/6 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default function Loading() {
  return (
    <section className="relative isolate overflow-hidden border-b border-border surface-texture">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-12 h-80 w-80 rounded-full bg-slate-300/5 blur-3xl" />
        <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-slate-200/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:py-14">
        <Skeleton className="mb-5 h-4 w-40 rounded-full" />
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <Skeleton className="h-5 w-40 rounded-full" />
            <Skeleton className="h-11 w-72" />
            <Skeleton className="h-6 w-full max-w-xl" />
          </div>
          <Skeleton className="h-16 w-full rounded-[1.35rem] lg:w-56" />
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
          <Skeleton className="h-12 rounded-full" />
          <Skeleton className="h-12 rounded-full" />
          <Skeleton className="h-12 rounded-full" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <FilterSkeleton />
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <ProductGridSkeleton count={6} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
