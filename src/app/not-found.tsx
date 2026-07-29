import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background-secondary">
        <PackageSearch className="h-7 w-7 text-muted" aria-hidden="true" />
      </div>
      <h1 className="text-xl font-bold text-text">We couldn't find that page</h1>
      <p className="max-w-md text-sm font-medium text-muted">
        The page may have moved, or the link might be out of date. Try searching, or head back to
        the homepage.
      </p>
      <Button variant="accent" asChild className="mt-2">
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  );
}
