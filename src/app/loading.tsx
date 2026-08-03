import { Skeleton, ProductGridSkeleton } from "@/components/ui/skeleton";

function HeroSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.12fr)_minmax(18rem,0.88fr)]">
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-[1.5rem] border border-white/80 bg-white/92 px-4 py-3 shadow-[var(--shadow-sm)]">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32 rounded-full" />
            <Skeleton className="h-3.5 w-52 rounded-full" />
          </div>
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>

        <div className="space-y-4 rounded-[2rem] border border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
          <Skeleton className="h-6 w-40 rounded-full" />
          <Skeleton className="h-10 w-full rounded-full" />
          <Skeleton className="h-4 w-3/4 rounded-full" />
          <Skeleton className="h-4 w-2/3 rounded-full" />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Skeleton className="h-12 w-full rounded-full sm:w-40" />
            <Skeleton className="h-12 w-full rounded-full sm:w-44" />
            <Skeleton className="h-12 w-full rounded-full sm:w-32" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Skeleton className="h-16 rounded-[1.2rem]" />
            <Skeleton className="h-16 rounded-[1.2rem]" />
            <Skeleton className="h-16 rounded-[1.2rem]" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-28 rounded-[1.4rem]" />
          <Skeleton className="h-28 rounded-[1.4rem]" />
          <Skeleton className="h-28 rounded-[1.4rem]" />
          <Skeleton className="h-28 rounded-[1.4rem]" />
        </div>
      </div>

      <div className="grid gap-4">
        <Skeleton className="h-52 rounded-[2rem]" />
        <Skeleton className="h-40 rounded-[2rem]" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <section className="relative isolate overflow-hidden border-b border-border surface-texture">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 top-4 h-72 w-72 rounded-full bg-slate-400/8 blur-3xl" />
        <div className="absolute right-0 top-16 h-64 w-64 rounded-full bg-slate-300/8 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:py-8">
        <HeroSkeleton />

        <div className="mt-8 space-y-6">
          <div className="rounded-[1.5rem] border border-white/80 bg-white/92 p-4 shadow-[var(--shadow-sm)]">
            <Skeleton className="h-4 w-28 rounded-full" />
            <Skeleton className="mt-3 h-6 w-48 rounded-full" />
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-20 rounded-[1.35rem]" />
              ))}
            </div>
          </div>

          <Skeleton className="h-72 rounded-[1.75rem]" />
          <Skeleton className="h-64 rounded-[1.75rem]" />
          <Skeleton className="h-72 rounded-[1.75rem]" />
          <ProductGridSkeleton count={4} />
        </div>
      </div>
    </section>
  );
}
