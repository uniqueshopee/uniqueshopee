import { Skeleton, ProductGridSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <section className="relative isolate overflow-hidden border-b border-border surface-texture">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 top-4 h-72 w-72 rounded-full bg-orange-400/8 blur-3xl" />
        <div className="absolute right-0 top-16 h-64 w-64 rounded-full bg-sky-400/8 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:py-8">
        <Skeleton className="h-72 rounded-[2rem]" />
        <Skeleton className="mt-6 h-52 rounded-[1.6rem]" />
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Skeleton className="h-[30rem] rounded-[1.6rem]" />
          <Skeleton className="h-[30rem] rounded-[1.6rem]" />
        </div>
        <div className="mt-6 space-y-4 rounded-[1.5rem] border border-white/80 bg-white/92 p-4 shadow-[var(--shadow-sm)]">
          <Skeleton className="h-6 w-48 rounded-full" />
          <Skeleton className="h-5 w-72 rounded-full" />
          <ProductGridSkeleton count={4} />
        </div>
      </div>
    </section>
  );
}
