"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Minus, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

type SharedProductCardProps = {
  image: string;
  href: string;
  brand: string;
  title: string;
  subtitle?: string;
  quantity: number;
  price: number;
  compareAtPrice?: number | null;
  shadeName?: string;
  shadeCode?: string;
  shadeFamily?: string;
  shadeHexColor?: string;
  mode: "checkout" | "order";
  onIncrease?: () => void;
  onDecrease?: () => void;
  onRemove?: () => void;
  onBuyAgain?: () => void;
  onReturn?: () => void;
  returnStatus?: string | null;
  returnable?: boolean;
};

function SharedProductCard({
  image,
  href,
  brand,
  title,
  subtitle,
  quantity,
  price,
  compareAtPrice: _compareAtPrice,
  shadeName,
  shadeCode,
  shadeFamily,
  shadeHexColor,
  mode,
  onIncrease,
  onDecrease,
  onRemove,
  onBuyAgain,
  onReturn,
  returnable,
}: SharedProductCardProps) {
  const [shadeOpen, setShadeOpen] = useState(false);
  const hasShade = Boolean(shadeName || shadeCode || shadeFamily || shadeHexColor);

  return (
    <div className="overflow-hidden rounded-[1.1rem] border border-border/70 bg-white/96 shadow-[var(--shadow-sm)]">
      <div
        className={
          mode === "order"
            ? "grid grid-cols-[4.25rem_minmax(0,1fr)] items-center gap-2.5 p-3 sm:grid-cols-[5.25rem_minmax(0,1fr)_auto] sm:gap-3 sm:p-3.5"
            : "grid grid-cols-[4.25rem_minmax(0,1fr)_auto] items-center gap-2.5 p-3 sm:grid-cols-[5.25rem_minmax(0,1fr)_auto] sm:gap-3 sm:p-3.5"
        }
      >
        <Link
          href={href}
          className="block overflow-hidden rounded-[0.9rem] bg-background-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <div className="relative aspect-square w-full">
            <Image src={image} alt={title} fill sizes="(max-width: 640px) 72px, 88px" className="object-cover" />
          </div>
        </Link>

        <div className="min-w-0 space-y-1">
          <p className="truncate text-[9px] font-semibold uppercase tracking-[0.16em] text-muted">{brand}</p>
          {mode === "order" ? (
            <div className="flex flex-wrap gap-1.5">
              {returnable ? (
                <Badge variant="success" className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em]">
                  Returnable
                </Badge>
              ) : (
                <Badge variant="neutral" className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em]">
                  Non-returnable
                </Badge>
              )}
            </div>
          ) : null}
          <Link href={href} className="block">
            <h3 className="line-clamp-2 text-[0.84rem] font-bold leading-4 text-text sm:text-[0.95rem] sm:leading-5">
              {title}
            </h3>
          </Link>
          {subtitle ? <p className="truncate text-[11px] font-medium text-muted sm:text-xs">{subtitle}</p> : null}
          {hasShade ? (
            <div className="relative mt-1">
              <button type="button" className="flex items-center gap-2 rounded-lg bg-background-secondary/60 px-2 py-1.5 text-left" onClick={() => setShadeOpen((current) => !current)} aria-label="View selected shade details" aria-expanded={shadeOpen}>
                <span className="h-5 w-5 shrink-0 rounded-full border-2 border-white shadow-[var(--shadow-sm)]" style={{ backgroundColor: shadeHexColor || "#cbd5e1" }} aria-hidden="true" />
                <span className="min-w-0 truncate text-[10px] font-semibold text-text sm:text-[11px]">Selected shade</span>
              </button>
              {shadeOpen ? (
                <div className="absolute left-0 top-full z-20 mt-1 min-w-44 rounded-xl border border-border/70 bg-white p-2.5 text-[10px] shadow-[var(--shadow-lg)]">
                  <div className="flex items-center gap-2">
                    <span className="h-7 w-7 rounded-full border-2 border-white shadow-[var(--shadow-sm)]" style={{ backgroundColor: shadeHexColor || "#cbd5e1" }} aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="truncate font-bold text-text">{shadeName || "Selected shade"}</p>
                      {shadeCode ? <p className="truncate font-medium text-muted">{shadeCode}</p> : null}
                    </div>
                  </div>
                  {shadeFamily ? <p className="mt-1.5 font-medium text-muted">Colour: {shadeFamily}</p> : null}
                  {shadeHexColor ? <p className="font-medium text-muted">HEX: {shadeHexColor}</p> : null}
                </div>
              ) : null}
            </div>
          ) : null}
          {mode === "checkout" ? (
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted">
              <span className="font-semibold text-text">{formatPrice(price * quantity)}</span>
            </div>
          ) : null}
        </div>

        {mode === "checkout" ? (
          <div className="flex flex-col items-end gap-2">
            <div className="inline-flex h-9 items-center overflow-hidden rounded-full border border-emerald-200 bg-emerald-50 shadow-[var(--shadow-sm)]">
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={onDecrease}
                aria-label={`Decrease quantity for ${title}`}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="min-w-7 px-2 text-center text-sm font-bold text-emerald-700">{quantity}</span>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center text-emerald-700 transition-colors hover:bg-emerald-100"
                onClick={onIncrease}
                aria-label={`Increase quantity for ${title}`}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <span className="text-[1rem] font-black leading-none text-text">{formatPrice(price * quantity)}</span>
            {onRemove ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 rounded-full px-2.5 text-muted"
                onClick={onRemove}
                aria-label={`Remove ${title} from checkout`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="col-span-2 flex flex-row flex-wrap items-center justify-between gap-2 sm:col-span-1 sm:flex-col sm:items-end">
            <span className="text-[0.92rem] font-black leading-none text-text sm:text-[1rem]">{formatPrice(price)}</span>
            <Badge variant="neutral" className="rounded-full px-2.5 py-1 text-[9px] sm:text-[10px]">
              Qty {quantity}
            </Badge>
            {returnable && onReturn ? (
              <Button type="button" variant="outline" size="sm" className="h-8 rounded-full px-3 text-xs" onClick={onReturn}>
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Return
              </Button>
            ) : null}
            <Button type="button" variant="outline" size="sm" className="h-8 rounded-full px-3 text-xs" onClick={onBuyAgain}>
              Buy Again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export { SharedProductCard };
