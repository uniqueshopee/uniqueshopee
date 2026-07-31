import type { Metadata } from "next";
import type { Product } from "@/types";
import type { ProductDetail } from "@/lib/catalog";
import { readEnvironmentValue } from "@/lib/environment";
import { SITE_NAME } from "@/lib/constants";

const DEFAULT_SITE_URL = "https://uniqueshopee.com";
const DEFAULT_OG_IMAGE_PATH = "/images/seo/og-default.svg";
const DEFAULT_LOGO_PATH = "/images/seo/logo.svg";

type BreadcrumbItem = {
  name: string;
  item: string;
};

export function getSiteUrl() {
  const configuredUrl = readEnvironmentValue("NEXT_PUBLIC_SITE_URL");

  if (!configuredUrl) {
    return DEFAULT_SITE_URL;
  }

  try {
    const parsed = new URL(configuredUrl);
    const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);

    if (process.env.NODE_ENV === "production" && isLocalhost) {
      return DEFAULT_SITE_URL;
    }

    return parsed.origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export function absoluteUrl(pathname = "/") {
  return new URL(pathname, getSiteUrl()).toString();
}

export function getDefaultOpenGraphImage() {
  return absoluteUrl(DEFAULT_OG_IMAGE_PATH);
}

export function getOrganizationLogoUrl() {
  return absoluteUrl(DEFAULT_LOGO_PATH);
}

export function createPageMetadata({
  title,
  description,
  pathname,
  imageUrl = getDefaultOpenGraphImage(),
  type = "website",
}: {
  title: string;
  description: string;
  pathname: string;
  imageUrl?: string;
  type?: "website" | "article";
}): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: pathname,
    },
    openGraph: {
      title,
      description,
      url: pathname,
      siteName: SITE_NAME,
      type,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: getSiteUrl(),
    logo: getOrganizationLogoUrl(),
  };
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.item,
    })),
  };
}

export function faqJsonLd(items: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function productJsonLd({
  product,
  detail,
  pathname,
}: {
  product: Product;
  detail: ProductDetail;
  pathname: string;
}) {
  const imageCandidates = [product.image, ...(detail.gallery ?? [])].filter(
    (value) => typeof value === "string" && /^https?:\/\//i.test(value),
  );
  const image = imageCandidates[0] ?? getDefaultOpenGraphImage();
  const offers = {
    "@type": "Offer",
    priceCurrency: "INR",
    price: product.price,
    availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    url: absoluteUrl(pathname),
  };

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: detail.description,
    sku: product.sku ?? product.id,
    image: [image],
    brand: {
      "@type": "Brand",
      name: detail.brand,
    },
    offers,
    aggregateRating:
      typeof product.rating === "number" && product.rating > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: product.reviewCount ?? 0,
          }
        : undefined,
  };
}

export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
