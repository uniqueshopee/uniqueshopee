import type { Category, Department, NavLink } from "@/types";

export const SITE_NAME = "UniqueShopee";

export const CATEGORIES: Category[] = [
  ...[
    ["interior", "Interior"], ["exterior", "Exterior"], ["enamel", "Enamel"],
    ["waterproofing", "Waterproofing"], ["painting-tools", "Painting Tools"],
    ["plumbing", "Plumbing"], ["fittings", "Fittings"], ["hardware-fittings", "Hardware Fittings"],
    ["building-materials-safety", "Building Materials & Safety"], ["hand-tools", "Hand Tools"],
    ["power-tools", "Power Tools"], ["wire-cable", "Wire & Cable"], ["switch-sockets", "Switch & Sockets"],
    ["lighting", "Lighting"], ["home-improvements", "Home Improvements"], ["others", "Others"],
  ].map(([slug, name]) => ({ id: slug, name, slug, href: `/category/${slug}` } as Category)),
];

export const DEPARTMENTS: Department[] = [
  {
    id: "paint",
    title: "Paint",
    items: ["Interior", "Exterior", "Enamel", "Waterproofing", "Painting Tools"],
    ctaLabel: "Explore Paint",
    href: "/department/paint",
  },
  {
    id: "hardware",
    title: "Hardware",
    items: ["Plumbing", "Fittings", "Hardware Fittings", "Building Materials & Safety", "Hand Tools", "Power Tools"],
    ctaLabel: "Explore Hardware",
    href: "/department/hardware",
  },
  {
    id: "electric",
    title: "Electric",
    items: ["Wire & Cable", "Switch & Sockets", "Lighting"],
    ctaLabel: "Explore Electric",
    href: "/department/electric",
  },
  {
    id: "home-improvement",
    title: "Home Improvement",
    items: ["Home Improvements"],
    ctaLabel: "Explore Home Improvement",
    href: "/department/home-improvement",
  },
  {
    id: "others",
    title: "Others",
    items: ["Others"],
    ctaLabel: "Explore Others",
    href: "/department/others",
  },
];

export const MOBILE_BOTTOM_NAV: (NavLink & { icon: "home" | "grid" | "cart" | "order" | "user" })[] = [
  { label: "Home", href: "/", icon: "home" },
  { label: "Category", href: "/products", icon: "grid" },
  { label: "Cart", href: "/cart", icon: "cart" },
  { label: "Orders", href: "/orders", icon: "order" },
  { label: "Account", href: "/account", icon: "user" },
];

export const FOOTER_LINKS: { title: string; links: NavLink[] }[] = [
  {
    title: "Shop",
    links: [
      { label: "Paint", href: "/department/paint" },
      { label: "Offers", href: "/coupons" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Track Order", href: "/orders" },
      { label: "Returns & Refunds", href: "/help" },
      { label: "Contact Us", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms & Conditions", href: "/terms" },
      { label: "Warranty", href: "/help" },
    ],
  },
];
