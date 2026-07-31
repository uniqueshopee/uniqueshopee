# UniqueShopee SEO Audit

## Scope

Focused on:

- Homepage
- Categories
- Brands
- Product pages
- Department pages

## Implemented

- Added `robots.txt` via `src/app/robots.ts`
- Added `sitemap.xml` generation via `src/app/sitemap.ts`
- Added sitewide metadata defaults in `src/app/layout.tsx`
- Added canonical URLs, Open Graph tags, Twitter cards, and indexable metadata to public catalog routes
- Added Organization schema sitewide
- Added Product schema, Breadcrumb schema, and FAQ schema where applicable
- Added dedicated SEO share assets in `public/images/seo/`

## Public Pages Verified

- Homepage: metadata, canonical, OG, Twitter, Organization schema
- Products listing: metadata and canonical
- Categories hub: metadata and canonical
- Category detail pages: metadata, canonical, breadcrumb schema, FAQ schema
- Brand detail pages: metadata, canonical, breadcrumb schema, FAQ schema
- Department detail pages: metadata, canonical, breadcrumb schema
- Product detail pages: metadata, canonical, breadcrumb schema, Product schema, FAQ schema

## Indexing Notes

- No `noindex` or `nofollow` directives were found in `src`
- Public catalog pages are allowed to be indexed
- Private/authenticated routes are excluded from the sitemap and blocked in `robots.txt`
- Search pages are canonicalized to `/search` to reduce duplicate query-string indexing

## Google Readiness

Status: Ready

- `NEXT_PUBLIC_SITE_URL` now defaults safely to `https://uniqueshopee.com`
- Canonical URLs, sitemap URLs, and social metadata are generated from the production-safe site URL helper

## Verification

- `cmd /c npm run lint`
- `cmd /c npm run build`

Both passed successfully.
