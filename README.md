# Forge & Finish — Frontend Foundation

A production-ready frontend scaffold for a paint & hardware e-commerce platform.
Frontend only — no backend, no database. All product data is static demo data in
`src/lib/constants.ts`, wired through Zustand stores so cart/wishlist state is real
and interactive.

## Stack

- Next.js 15 (App Router) + TypeScript (strict)
- Tailwind CSS v4 (CSS-variable design tokens, see `src/app/globals.css`)
- shadcn/ui conventions (Radix primitives + `cva` + `cn`)
- Framer Motion for transitions/micro-interactions
- Lucide React for icons
- Zustand for cart/wishlist state
- React Hook Form + Zod (wired for forms — see `FormField` in `components/ui/input.tsx`)
- Embla Carousel (dependency included, ready for a product carousel)

## Getting started

```bash
npm install
npm run dev
```

Open the local development URL shown in your terminal after running `npm run dev`.

## Folder structure

```
src/
  app/                        Routes (App Router)
    layout.tsx                 Root layout: fonts, Navbar, Footer, BottomNav, Toaster
    page.tsx                   Homepage
    loading.tsx                 Route-level loading skeleton
    error.tsx                   Route-level error boundary
    not-found.tsx               404 page
    globals.css                  Design tokens + base styles

  components/
    layout/
      navbar/                    Navbar, DesktopNav, MobileNav, BottomNav, SearchBar
      footer/                    Footer
    product/                     ProductCard, ProductGrid, CategoryGrid, Hero
    feedback/                    EmptyState, ErrorState, Toaster
    ui/                          Button, Card, Input, Badge, Modal, Skeleton
                                  — the shadcn-style reusable primitives everything
                                    else is built from

  store/                       Zustand stores (cart, wishlist)
  hooks/                       use-toast, use-media-query
  lib/                         utils (cn, formatPrice), constants (nav/category/demo data)
  types/                       Shared domain types (Product, Category, CartItem…)
```

## Design tokens

All color, radius, shadow and motion values live as CSS variables in
`src/app/globals.css` and are mapped into Tailwind's theme via `@theme inline`, so
components use ordinary utilities (`bg-primary`, `text-muted`, `border-border`,
`rounded-lg`) rather than hard-coded hex values. Swapping `.dark` on `<html>`
re-points every token — no component code checks the mode directly.

| Token | Value |
|---|---|
| `--color-primary` | `#0F172A` |
| `--color-accent` | `#2563EB` |
| `--color-success` | `#16A34A` |
| `--color-warning` | `#F59E0B` |
| `--color-danger` | `#DC2626` |
| `--color-background` | `#FFFFFF` |
| `--color-background-secondary` | `#F8FAFC` |
| `--color-border` | `#E2E8F0` |
| `--color-text` | `#0F172A` |
| `--color-muted` | `#64748B` |

Typeface: **Inter** everywhere — bold/large headings, medium body, semibold buttons.

## Notes for whoever picks this up

- Product images point at `picsum.photos` placeholders — swap for real assets or a
  CMS/CDN and they'll resize correctly (`next/image` is already configured for any
  HTTPS host in `next.config.ts`; tighten `remotePatterns` before shipping).
- Cart/wishlist state is client-only (Zustand, in-memory). Add persistence
  (`zustand/middleware` → `persist`) or wire to a backend when one exists.
- Toast/Modal are unstyled-logic-first: Radix handles focus trap, Escape-to-close,
  and ARIA; Tailwind + Framer Motion handle the look and feel only.
- Run `npm run lint` / `npm run format` before committing — ESLint (flat config,
  Next + TypeScript rules) and Prettier (with the Tailwind class-sorting plugin)
  are both pre-configured.
