"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, MessageCircleMore, Phone } from "lucide-react";
import { SITE_NAME, FOOTER_LINKS } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CONTACT_DETAILS } from "@/lib/support-data";

const SOCIALS = [
  { label: "WhatsApp", href: `https://wa.me/${CONTACT_DETAILS.customerCare.replace(/\D/g, "")}`, icon: MessageCircleMore, external: true },
  { label: "Call", href: `tel:${CONTACT_DETAILS.customerCare.replace(/\D/g, "")}`, icon: Phone },
  { label: "Mail", href: `mailto:${CONTACT_DETAILS.supportEmail}`, icon: Mail },
];

function Footer() {
  const pathname = usePathname();
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const hideOnCartMobile = pathname === "/cart";
  const hideOnCheckout = pathname === "/checkout";

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer
      className={cn(
        "border-t border-border bg-white/80 pb-[calc(8rem+env(safe-area-inset-bottom))] lg:pb-0",
        (hideOnCartMobile || hideOnCheckout) && "hidden lg:block",
      )}
    >
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2 lg:col-span-2">
            <span className="text-lg font-bold text-primary">{SITE_NAME}</span>
            <p className="mt-3 max-w-xs text-sm font-medium text-muted">
              Premium online store for Paints, Plumbing Products and Home Improvement.
            </p>

            <form
              className="mt-5 flex max-w-sm gap-2"
              onSubmit={(e) => e.preventDefault()}
              aria-label="Subscribe to newsletter"
            >
              <Input type="email" placeholder="you@email.com" aria-label="Email address" required />
              <Button type="submit" variant="primary" size="md" className="shrink-0">
                Subscribe
              </Button>
            </form>

            <div className="mt-5 flex gap-2">
              {SOCIALS.map(({ label, href, icon: Icon, external }) => (
                <Link
                  key={label}
                  aria-label={label}
                  href={href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noreferrer" : undefined}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text transition-all hover:-translate-y-0.5 hover:border-accent/20 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>

          {FOOTER_LINKS.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h4 className="text-sm font-bold text-text">{group.title}</h4>
              <ul className="mt-3 flex flex-col gap-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    {link.disabled ? (
                      <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        className="cursor-not-allowed text-sm font-medium text-muted/70 transition-colors"
                      >
                        {link.label}
                      </button>
                    ) : (
                      <Link href={link.href} className="text-sm font-medium text-muted transition-colors hover:text-accent">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="border-t border-border/70">
        <div className="mx-auto flex max-w-7xl flex-col-reverse items-center justify-between gap-3 px-4 py-5 sm:flex-row sm:px-6">
          <p className="text-xs font-medium text-muted">
            (c) {currentYear ?? ""} {SITE_NAME}. All rights reserved.
          </p>
          <p className="text-xs font-medium text-muted">
            Genuine brands, competitive prices and fast delivery.
          </p>
        </div>
      </div>
    </footer>
  );
}

export { Footer };
