"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  className?: string;
  autoFocus?: boolean;
  onSubmit?: (query: string) => void;
}

function SearchBar({ className, autoFocus, onSubmit }: SearchBarProps) {
  const router = useRouter();

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const query = new FormData(e.currentTarget).get("q");
        if (typeof query === "string") {
          const trimmedQuery = query.trim();
          router.push(trimmedQuery ? `/search?q=${encodeURIComponent(trimmedQuery)}` : "/search");
          onSubmit?.(trimmedQuery);
        }
      }}
      className={cn("relative w-full", className)}
    >
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden="true"
      />
      <label htmlFor="site-search" className="sr-only">
        Search products
      </label>
      <input
        id="site-search"
        name="q"
        type="search"
        autoFocus={autoFocus}
        placeholder="Search paints, plumbing & home improvement..."
        className={cn(
          "h-12 w-full rounded-full border border-border/80 bg-white/90 pl-10 pr-4 shadow-[var(--shadow-sm)]",
          "text-sm font-medium text-text placeholder:text-muted placeholder:font-normal",
          "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:bg-white",
        )}
      />
    </form>
  );
}

export { SearchBar };
