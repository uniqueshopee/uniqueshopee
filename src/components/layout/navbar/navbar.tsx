"use client";

import { useEffect, useState } from "react";
import { DesktopNav } from "./desktop-nav";
import { MobileNav } from "./mobile-nav";
import { cn } from "@/lib/utils";

function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-border/70 bg-white/90 backdrop-blur-xl transition-shadow duration-200",
        scrolled ? "shadow-[var(--shadow-sm)]" : "shadow-none",
      )}
    >
      <DesktopNav />
      <div className="relative border-t border-border/50 lg:border-t-0">
        <MobileNav />
      </div>
    </header>
  );
}

export { Navbar };
