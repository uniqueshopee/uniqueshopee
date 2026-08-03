import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function SupportTicketLoading() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-4 sm:px-6 sm:py-6">
      <div className="space-y-4">
        <Card className="rounded-[1.4rem] border-white/80 bg-white/92 p-4 shadow-[var(--shadow-sm)]">
          <div className="space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-20 w-full rounded-[1rem]" />
          </div>
        </Card>
        <Card className="rounded-[1.4rem] border-white/80 bg-white/92 p-4 shadow-[var(--shadow-sm)]">
          <Skeleton className="h-24 w-full rounded-[1rem]" />
        </Card>
        <Card className="rounded-[1.4rem] border-white/80 bg-white/92 p-3 shadow-[var(--shadow-sm)]">
          <Skeleton className="h-10 w-full rounded-full" />
        </Card>
      </div>
    </main>
  );
}
