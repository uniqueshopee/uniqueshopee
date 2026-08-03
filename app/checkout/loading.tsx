import { Skeleton, ProductGridSkeleton } from "@/components/ui/skeleton";

function SummarySkeleton() {
  return (
    <div className="space-y-4 rounded-[1.5rem] border border-white/75 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
      <Skeleton className="h-5 w-40 rounded-full" />
      <Skeleton className="h-12 w-full rounded-[1.15rem]" />
      <Skeleton className="h-12 w-full rounded-[1.15rem]" />
      <Skeleton className="h-36 w-full rounded-[1.35rem]" />
    </div>
  );
}

function StepSkeleton() {
  return (
    <div className="space-y-5 rounded-[1.75rem] border border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
      <Skeleton className="h-6 w-28 rounded-full" />
      <Skeleton className="h-9 w-72 rounded-full" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-32 rounded-[1.35rem]" />
        <Skeleton className="h-32 rounded-[1.35rem]" />
      </div>
      <Skeleton className="h-44 rounded-[1.5rem]" />
      <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-4">
        <Skeleton className="h-12 w-28 rounded-full" />
        <Skeleton className="h-12 w-36 rounded-full" />
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
        <Skeleton className="mb-6 h-4 w-40 rounded-full" />
        <Skeleton className="mb-6 h-32 w-full rounded-[1.75rem]" />
        <Skeleton className="mb-6 h-28 w-full rounded-[1.6rem]" />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            <StepSkeleton />
          </div>
          <SummarySkeleton />
        </div>

        <div className="mt-10 space-y-8">
          <div className="space-y-4 rounded-[1.5rem] border border-white/75 bg-white/92 p-5 shadow-[var(--shadow-sm)]">
            <Skeleton className="h-6 w-60 rounded-full" />
            <Skeleton className="h-5 w-80 rounded-full" />
            <ProductGridSkeleton count={4} />
          </div>
          <div className="space-y-4 rounded-[1.5rem] border border-white/75 bg-white/92 p-5 shadow-[var(--shadow-sm)]">
            <Skeleton className="h-6 w-44 rounded-full" />
            <Skeleton className="h-5 w-72 rounded-full" />
            <ProductGridSkeleton count={4} />
          </div>
        </div>
      </div>
    </section>
  );
}
