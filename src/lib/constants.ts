import type { Category, Department, NavLink } from "@/types";

export const SITE_NAME = "UniqueShopee";

export const CATEGORIES: Category[] = [
  { id: "paints", name: "Paints", slug: "paints", href: "/category/paints" },
  { id: "power-tools", name: "Power Tools", slug: "power-tools", href: "/category/power-tools" },
  { id: "hand-tools", name: "Hand Tools", slug: "hand-tools", href: "/category/hand-tools" },
  { id: "fasteners", name: "Fasteners", slug: "fasteners", href: "/category/fasteners" },
  { id: "plumbing", name: "Plumbing", slug: "plumbing", href: "/category/plumbing" },
  { id: "electrical", name: "Electrical", slug: "electrical", href: "/category/electrical" },
];

export const DEPARTMENTS: Department[] = [
  {
    id: "paints",
    title: "Paints",
    items: [
      "Interior Paint",
      "Exterior Paint",
      "Primers",
      "Wall Putty",
      "Waterproofing",
      "Wood Finishes",
      "Metal Paint",
      "Paint Tools",
    ],
    ctaLabel: "Explore Paints",
    href: "/category/paints",
  },
  {
    id: "plumbing",
    title: "Plumbing",
    items: [
      "PVC Pipes",
      "CPVC Pipes",
      "Fittings",
      "Faucets",
      "Valves",
      "Pumps",
      "Bathroom Accessories",
      "Water Storage",
    ],
    ctaLabel: "Explore Plumbing",
    href: "/category/plumbing",
  },
];

export const MOBILE_BOTTOM_NAV: (NavLink & { icon: "home" | "grid" | "heart" | "cart" | "user" })[] = [
  { label: "Home", href: "/", icon: "home" },
  { label: "Products", href: "/products", icon: "grid" },
  { label: "Wishlist", href: "/wishlist", icon: "heart" },
  { label: "Cart", href: "/cart", icon: "cart" },
  { label: "Account", href: "/account", icon: "user" },
];

export const FOOTER_LINKS: { title: string; links: NavLink[] }[] = [
  {
    title: "Shop",
    links: [
      { label: "Paints", href: "/category/paints" },
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
