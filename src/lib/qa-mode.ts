import type { Session, User } from "@supabase/supabase-js";
import type { AuthProfile, AuthRoleKey } from "@/lib/supabase/auth";
import type { CartItem } from "@/types";
import type { OrderItem, OrderRecord } from "@/lib/orders-data";

type QaRole = "customer" | "admin";

export type QaAuthState = {
  session: Session;
  user: User;
  profile: AuthProfile;
  role: AuthRoleKey;
};

export type QaProductCatalog = {
  departments: Array<{ id: string; name: string; slug: string; is_active: boolean; deleted_at: string | null }>;
  categories: Array<{ id: string; department_id: string; name: string; slug: string; is_active: boolean; deleted_at: string | null }>;
  brands: Array<{ id: string; department_id: string; category_id: string | null; name: string; slug: string; logo_url: string | null; is_active: boolean; deleted_at: string | null }>;
  products: Array<{
    id: string;
    department_id: string;
    category_id: string;
    brand_id: string;
    slug: string;
    sku: string;
    name: string;
    description: string | null;
    short_description: string | null;
    gst_rate: number;
    mrp: number;
    selling_price: number;
    discount_amount: number;
    discount_percent: number;
    status: string;
    featured: boolean;
    meta_title: string | null;
    meta_description: string | null;
    meta_keywords: string[] | null;
    canonical_url: string | null;
    og_image_url: string | null;
    specification: Record<string, string> | null;
    attributes: Record<string, string> | null;
    deleted_at: string | null;
    created_at: string;
    updated_at: string;
  }>;
  productImages: Array<{ id: string; product_id: string; image_url: string; alt_text: string | null; sort_order: number; is_primary: boolean; deleted_at: string | null }>;
  productVariants: Array<{
    id: string;
    product_id: string;
    sku: string;
    variant_name: string;
    option_label: string | null;
    option_value: string | null;
    variant_options: Record<string, string> | null;
    mrp_override: number | null;
    selling_price_override: number | null;
    barcode: string | null;
    weight: number | null;
    is_default: boolean;
    is_active: boolean;
    deleted_at: string | null;
  }>;
  inventories: Array<{
    id: string;
    product_variant_id: string;
    current_quantity: number;
    reserved_quantity: number;
    low_stock_threshold: number;
    stock_status: string;
    warehouse_location: string | null;
    deleted_at: string | null;
  }>;
};

export function isQaBypassEnabled() {
  return process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_ENABLE_QA_BYPASS === "true";
}

export function getQaModeRole(pathname?: string | null): QaRole {
  return pathname?.startsWith("/admin") ? "admin" : "customer";
}

function makeQaUser(role: QaRole): { user: User; profile: AuthProfile; session: Session } {
  const baseId = role === "admin" ? "00000000-0000-0000-0000-00000000admn" : "00000000-0000-0000-0000-00000000cust";
  const email = role === "admin" ? "qa.admin@uniqueshopee.dev" : "qa.customer@uniqueshopee.dev";
  const fullName = role === "admin" ? "QA Admin" : "QA Customer";
  const phone = role === "admin" ? "+919000000002" : "+919000000001";
  const roleId = role === "admin" ? "qa-admin-role" : null;

  const user = {
    id: baseId,
    aud: "authenticated",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {
      full_name: fullName,
      first_name: role === "admin" ? "QA" : "QA",
      last_name: role === "admin" ? "Admin" : "Customer",
      phone,
    },
    created_at: new Date("2026-07-30T08:00:00.000Z").toISOString(),
    updated_at: new Date("2026-07-30T08:00:00.000Z").toISOString(),
    email,
    phone,
    role: "authenticated",
  } as unknown as User;

  const profile: AuthProfile = {
    id: baseId,
    role_id: roleId,
    full_name: fullName,
    email,
    phone,
    avatar_url: null,
    customer_code: role === "admin" ? "CUS-QAADMIN" : "CUS-QACUSTOM",
    status: "active",
  };

  const session = {
    access_token: `qa-${role}-access-token`,
    refresh_token: `qa-${role}-refresh-token`,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    provider_token: null,
    provider_refresh_token: null,
    user,
  } as Session;

  return { user, profile, session };
}

export function getQaAuthState(pathname?: string | null): QaAuthState {
  const role = getQaModeRole(pathname);
  const account = makeQaUser(role);
  return { ...account, role };
}

export function getQaAddresses() {
  return [
    {
      id: "qa-address-1",
      name: "Piyush Kumar Singh",
      phone: "+91 93349 81947",
      line1: "House 48, Green View Colony",
      line2: "Near Sai Mandir, Block C",
      city: "Patna",
      state: "Bihar",
      pin: "800001",
      type: "Home" as const,
      isDefault: true,
      landmark: "Opposite City Mall",
      area: "Kankarbagh",
    },
    {
      id: "qa-address-2",
      name: "Piyush Singh Accounts Office",
      phone: "+91 93349 81947",
      line1: "Plot 17, Industrial Support Lane",
      line2: "Second floor, long-form office delivery label for QA",
      city: "Patna",
      state: "Bihar",
      pin: "800020",
      type: "Office" as const,
      isDefault: false,
      landmark: "Above Axis Bank",
      area: "Boring Road",
    },
  ];
}

export function getQaCartItems(): CartItem[] {
  return [
    {
      productId: "qa-prod-paint-1",
      name: "Asian Paints Royale Luxury Emulsion - Ivory Mist, 10 Litre",
      price: 3890,
      compareAtPrice: 4590,
      image: "/images/placeholders/department-paints.svg",
      quantity: 2,
      slug: "asian-paints-royale-luxury-emulsion-ivory-mist-10-litre",
      category: "Interior Paint",
      inStock: true,
      stockCount: 24,
      reservedCount: 3,
      lowStockThreshold: 8,
    },
    {
      productId: "qa-prod-plumb-1",
      name: "Astral CPVC Pipe 20 mm Heavy Duty Long Supply Line",
      price: 540,
      compareAtPrice: 700,
      image: "/images/placeholders/department-plumbing.svg",
      quantity: 4,
      slug: "astral-cpvc-pipe-20-mm-heavy-duty-long-supply-line",
      category: "Pipes",
      inStock: true,
      stockCount: 120,
      reservedCount: 10,
      lowStockThreshold: 15,
    },
    {
      productId: "qa-prod-plumb-2",
      name: "Dr. Fixit Waterproofing Coating 4 Litre Bucket",
      price: 1299,
      compareAtPrice: 1499,
      image: "/images/placeholders/department-plumbing.svg",
      quantity: 1,
      slug: "dr-fixit-waterproofing-coating-4-litre-bucket",
      category: "Sealants",
      inStock: true,
      stockCount: 18,
      reservedCount: 2,
      lowStockThreshold: 5,
    },
  ];
}

export function getQaOrderItems(): OrderItem[] {
  return [
    {
      id: "qa-item-1",
      name: "Asian Paints Royale Luxury Emulsion - Ivory Mist, 10 Litre",
      slug: "asian-paints-royale-luxury-emulsion-ivory-mist-10-litre",
      price: 3890,
      compareAtPrice: 4590,
      image: "/images/placeholders/department-paints.svg",
      category: "Interior Paint",
      badge: "sale",
      brand: "Asian Paints",
      quantity: 2,
      variant: "10 Litre - Finish: Premium Matt",
    },
    {
      id: "qa-item-2",
      name: "Astral CPVC Pipe 20 mm Heavy Duty Long Supply Line",
      slug: "astral-cpvc-pipe-20-mm-heavy-duty-long-supply-line",
      price: 540,
      compareAtPrice: 700,
      image: "/images/placeholders/department-plumbing.svg",
      category: "Pipes",
      badge: undefined,
      brand: "Astral",
      quantity: 4,
      variant: "20 mm - Length: 3 m",
    },
    {
      id: "qa-item-3",
      name: "Dr. Fixit Waterproofing Coating 4 Litre Bucket",
      slug: "dr-fixit-waterproofing-coating-4-litre-bucket",
      price: 1299,
      compareAtPrice: 1499,
      image: "/images/placeholders/department-paints.svg",
      category: "Sealants",
      badge: undefined,
      brand: "Dr. Fixit",
      quantity: 1,
      variant: "Bucket - 4 Litre",
    },
  ];
}

function buildQaOrderRecord(overrides: Partial<OrderRecord> & { id: string; orderNumber: string }): OrderRecord {
  const items = overrides.items ?? getQaOrderItems();
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = 1320;
  const couponDiscount = 400;
  const gst = Math.round(((subtotal - discount - couponDiscount) * 18) / 100);
  const shipping = 99;
  const grandTotal = Math.max(0, subtotal - discount - couponDiscount + gst + shipping);

  return {
    id: overrides.id,
    orderNumber: overrides.orderNumber,
    status: overrides.status ?? "Delivered",
    paymentStatus: overrides.paymentStatus ?? "paid",
    placedAt: overrides.placedAt ?? "28 Jul 2026, 8:45 pm",
    deliveredAt: overrides.deliveredAt ?? "30 Jul 2026, 11:20 am",
    trackingNumber: overrides.trackingNumber ?? "QA123456789IN",
    paymentMethod: overrides.paymentMethod ?? "Cash on Delivery",
    paymentReference: overrides.paymentReference ?? "QA-PAY-0001",
    deliveryAddress:
      overrides.deliveryAddress ?? {
        name: "Piyush Kumar Singh",
        line1: "House 48, Green View Colony, Near Sai Mandir",
        line2: "Block C, Kankarbagh, Landmark opposite city mall",
        city: "Patna",
        state: "Bihar",
        pincode: "800001",
        phone: "+91 93349 81947",
      },
    billingAddress:
      overrides.billingAddress ?? {
        name: "Piyush Kumar Singh",
        line1: "House 48, Green View Colony, Near Sai Mandir",
        line2: "Block C, Kankarbagh, Landmark opposite city mall",
        city: "Patna",
        state: "Bihar",
        pincode: "800001",
      },
    couponApplied: overrides.couponApplied ?? "WELCOME10",
    notes: overrides.notes ?? "Please call before delivery and leave parcel at the side gate.",
    subtotal,
    discount,
    couponDiscount,
    gst,
    shipping,
    grandTotal,
    itemsCount: items.reduce((sum, item) => sum + item.quantity, 0),
    items,
    timeline:
      overrides.timeline ?? [
        { status: "Pending", timestamp: "28 Jul 2026, 8:45 pm", description: "We received your order and are preparing it.", icon: "pending", active: true },
        { status: "Ordered", timestamp: "28 Jul 2026, 8:46 pm", description: "Your order was placed successfully.", icon: "ordered", active: true },
        { status: "Confirmed", timestamp: "28 Jul 2026, 9:10 pm", description: "We confirmed your order and started packing.", icon: "confirmed", active: true },
        { status: "Packed", timestamp: "29 Jul 2026, 10:15 am", description: "Your items were packed and quality checked.", icon: "packed", active: true },
        { status: "Shipped", timestamp: "29 Jul 2026, 8:00 pm", description: "Your package left the warehouse.", icon: "shipped", active: true },
        { status: "Out for Delivery", timestamp: "30 Jul 2026, 9:00 am", description: "The courier is on the way to your address.", icon: "delivery", active: true },
        { status: "Delivered", timestamp: "30 Jul 2026, 11:20 am", description: "Delivered safely to your address.", icon: "delivered", active: true },
      ],
  };
}

export const QA_ORDERS: OrderRecord[] = [
  buildQaOrderRecord({
    id: "qa-order-1",
    orderNumber: "US202600023",
    status: "Delivered",
    paymentStatus: "paid",
    trackingNumber: "QA123456789IN",
  }),
  buildQaOrderRecord({
    id: "qa-order-2",
    orderNumber: "US202600024",
    status: "Shipped",
    paymentStatus: "pending",
    trackingNumber: "QA123456780IN",
    deliveredAt: undefined,
    paymentReference: "QA-PAY-0002",
    couponApplied: "PAINT20",
    notes: "Heavy bulk order for QA table layout checks and card wrapping validation.",
    items: [
      {
        id: "qa-item-4",
        name: "Berger Weathercoat Anti Dust Exterior Emulsion - Terracotta Ridge, 20 L",
        slug: "berger-weathercoat-anti-dust-exterior-emulsion-terracotta-ridge-20-l",
        price: 6890,
        compareAtPrice: 7990,
        image: "/images/placeholders/department-paints.svg",
        category: "Exterior Paint",
        badge: "sale",
        brand: "Berger",
        quantity: 3,
        variant: "20 Litre - Deep Matt",
      },
      {
        id: "qa-item-5",
        name: "Finolex CPVC Elbow Connector 25 mm",
        slug: "finolex-cpvc-elbow-connector-25-mm",
        price: 89,
        compareAtPrice: 120,
        image: "/images/placeholders/department-plumbing.svg",
        category: "Fittings",
        badge: undefined,
        brand: "Finolex",
        quantity: 12,
        variant: "25 mm",
      },
    ],
    timeline: [
      { status: "Pending", timestamp: "29 Jul 2026, 10:10 am", description: "We received your order and are preparing it.", icon: "pending", active: true },
      { status: "Ordered", timestamp: "29 Jul 2026, 10:12 am", description: "Your order was placed successfully.", icon: "ordered", active: true },
      { status: "Confirmed", timestamp: "29 Jul 2026, 11:00 am", description: "We confirmed your order and began preparing it.", icon: "confirmed", active: true },
      { status: "Packed", timestamp: "29 Jul 2026, 6:40 pm", description: "Your items were packed and quality checked.", icon: "packed", active: true },
      { status: "Shipped", timestamp: "30 Jul 2026, 8:25 am", description: "Your package left the warehouse.", icon: "shipped", active: true },
      { status: "Out for Delivery", timestamp: "30 Jul 2026, 1:15 pm", description: "The courier is on the way to your address.", icon: "delivery", active: false },
      { status: "Delivered", timestamp: "Pending", description: "Awaiting delivery completion.", icon: "delivered", active: false },
    ],
  }),
];

export function getQaAdminDashboardData() {
  return {
    stats: [
      { label: "Total Revenue", value: "₹12.8L", delta: "+18% vs last month", note: "QA dashboard data", tone: "accent" as const },
      { label: "Orders", value: "248", delta: "32 active", note: "Live-like summary", tone: "success" as const },
      { label: "Customers", value: "1,024", delta: "24 new", note: "Customer records", tone: "neutral" as const },
      { label: "Low Stock", value: "7", delta: "Needs review", note: "Inventory watchlist", tone: "warning" as const },
    ],
    recentOrders: QA_ORDERS.map((order) => ({
      id: order.orderNumber,
      customer: order.deliveryAddress.name,
      status: order.status,
      amount: order.grandTotal,
      date: order.placedAt,
    })),
    topProducts: [
      { name: "Asian Paints Royale Luxury Emulsion", sales: 78, revenue: 303420 },
      { name: "Astral CPVC Pipe 20 mm", sales: 124, revenue: 66960 },
      { name: "Dr. Fixit Waterproofing Coating", sales: 41, revenue: 53200 },
    ],
    topCategories: [
      { name: "Interior Paint", sales: 112, share: 48 },
      { name: "Pipes", sales: 98, share: 31 },
      { name: "Sealants", sales: 31, share: 21 },
    ],
    recentReviews: [
      { customer: "Piyush Singh", product: "Asian Paints Royale Luxury Emulsion", rating: 5, status: "Published" },
      { customer: "Ananya Kumari", product: "Astral CPVC Pipe", rating: 4, status: "Pending" },
      { customer: "Rahul Verma", product: "Dr. Fixit Waterproofing", rating: 5, status: "Hidden" },
    ],
  };
}

export function getQaAdminOrderRows() {
  return QA_ORDERS.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    customer: order.deliveryAddress.name,
    status: order.status,
    paymentStatus: order.paymentStatus,
    amount: order.grandTotal,
    placedAt: order.placedAt,
    trackingNumber: order.trackingNumber ?? "",
  }));
}

export function getQaAdminCustomerRows() {
  return [
    { id: "qa-customer-1", name: "Piyush Kumar Singh", email: "qa.customer@uniqueshopee.dev", orders: 6, joined: "12 Jan 2026", status: "Active" },
    { id: "qa-customer-2", name: "Ananya Kumari Sharma", email: "ananya.qa@uniqueshopee.dev", orders: 3, joined: "24 Mar 2026", status: "Active" },
    { id: "qa-customer-3", name: "Rohit Kumar Verma", email: "rohit.long-name.customer@uniqueshopee.dev", orders: 12, joined: "2 Feb 2026", status: "Inactive" },
  ];
}

export function getQaAdminReviewRows() {
  return [
    { id: "qa-review-1", product: "Asian Paints Royale Luxury Emulsion", customer: "Piyush Kumar Singh", rating: 5, status: "Published", comment: "Premium finish and easy application.", createdAt: "27 Jul 2026" },
    { id: "qa-review-2", product: "Astral CPVC Pipe 20 mm", customer: "Ananya Kumari Sharma", rating: 4, status: "Pending", comment: "Good quality but packaging could be better.", createdAt: "28 Jul 2026" },
    { id: "qa-review-3", product: "Dr. Fixit Waterproofing Coating", customer: "Rohit Kumar Verma", rating: 5, status: "Hidden", comment: "Solved the seepage issue quickly.", createdAt: "29 Jul 2026" },
  ];
}

export function getQaAdminCouponRows() {
  return [
    { id: "qa-coupon-1", code: "WELCOME10", discount: "10% off", status: "Active", expiry: "31 Aug 2026", minimumOrder: "₹0", maximumDiscount: "₹500", usageLimit: "Unlimited", perUserLimit: "1", title: "Welcome Offer", description: "First-order savings", couponType: "percentage", value: 10, appliesTo: "{}" },
    { id: "qa-coupon-2", code: "PAINT20", discount: "20% off", status: "Active", expiry: "15 Sep 2026", minimumOrder: "₹999", maximumDiscount: "₹1000", usageLimit: "500", perUserLimit: "1", title: "Paint Festival", description: "Large paint savings", couponType: "percentage", value: 20, appliesTo: "{}" },
    { id: "qa-coupon-3", code: "BULK99", discount: "₹99 off", status: "Expired", expiry: "10 Jul 2026", minimumOrder: "₹1999", maximumDiscount: "₹99", usageLimit: "200", perUserLimit: "2", title: "Bulk Deal", description: "Small fixed discount", couponType: "flat", value: 99, appliesTo: "{}" },
  ];
}

export function getQaAdminBannerRows() {
  return [
    { id: "qa-banner-1", title: "Festival Paint Mega Sale", subtitle: "Up to 20% off on premium paints", placement: "Home Hero", status: "Active", imageUrl: "/images/placeholders/department-paints.svg", linkUrl: "/" },
    { id: "qa-banner-2", title: "Plumbing Essentials", subtitle: "Fast-moving plumbing inventory", placement: "Category Strip", status: "Active", imageUrl: "/images/placeholders/department-plumbing.svg", linkUrl: "/category/plumbing" },
    { id: "qa-banner-3", title: "Trade Pro Bulk Order", subtitle: "Long banner copy for QA wrapping", placement: "Checkout Promo", status: "Scheduled", imageUrl: "/images/placeholders/department-paints.svg", linkUrl: "/checkout" },
  ];
}

export function getQaAdminSettingsRows() {
  return [
    { id: "qa-setting-1", key: "store_name", value: "UniqueShopee QA", description: "Temporary QA storefront label", isPublic: true },
    { id: "qa-setting-2", key: "free_shipping_threshold", value: "5000", description: "Used for checkout preview", isPublic: true },
    { id: "qa-setting-3", key: "support_email", value: "support@uniqueshopee.dev", description: "Support destination for QA", isPublic: true },
  ];
}

export function getQaProductCatalog(): QaProductCatalog {
  return {
    departments: [
      { id: "qa-dept-paints", name: "Paints", slug: "paints", is_active: true, deleted_at: null },
      { id: "qa-dept-plumbing", name: "Plumbing", slug: "plumbing", is_active: true, deleted_at: null },
    ],
    categories: [
      { id: "qa-cat-interior", department_id: "qa-dept-paints", name: "Interior Paint", slug: "interior-paint", is_active: true, deleted_at: null },
      { id: "qa-cat-exterior", department_id: "qa-dept-paints", name: "Exterior Paint", slug: "exterior-paint", is_active: true, deleted_at: null },
      { id: "qa-cat-pipes", department_id: "qa-dept-plumbing", name: "Pipes", slug: "pipes", is_active: true, deleted_at: null },
      { id: "qa-cat-sealants", department_id: "qa-dept-plumbing", name: "Sealants", slug: "sealants", is_active: true, deleted_at: null },
    ],
    brands: [
      { id: "qa-brand-asian", department_id: "qa-dept-paints", category_id: "qa-cat-interior", name: "Asian Paints", slug: "asian-paints", logo_url: "/brands/asian-paints.svg", is_active: true, deleted_at: null },
      { id: "qa-brand-berger", department_id: "qa-dept-paints", category_id: "qa-cat-exterior", name: "Berger", slug: "berger", logo_url: "/brands/berger.svg", is_active: true, deleted_at: null },
      { id: "qa-brand-astral", department_id: "qa-dept-plumbing", category_id: "qa-cat-pipes", name: "Astral", slug: "astral", logo_url: "/brands/astral.svg", is_active: true, deleted_at: null },
      { id: "qa-brand-fixit", department_id: "qa-dept-plumbing", category_id: "qa-cat-sealants", name: "Dr. Fixit", slug: "dr-fixit", logo_url: "/brands/dr-fixit.svg", is_active: true, deleted_at: null },
    ],
    products: [
      {
        id: "qa-prod-paint-1",
        department_id: "qa-dept-paints",
        category_id: "qa-cat-interior",
        brand_id: "qa-brand-asian",
        slug: "asian-paints-royale-luxury-emulsion-ivory-mist-10-litre",
        sku: "AP-RLE-10L-IVM",
        name: "Asian Paints Royale Luxury Emulsion - Ivory Mist, 10 Litre",
        description: "Premium washable emulsion for long-lasting premium interiors.",
        short_description: "Luxury interior finish.",
        gst_rate: 18,
        mrp: 4590,
        selling_price: 3890,
        discount_amount: 700,
        discount_percent: 15,
        status: "active",
        featured: true,
        meta_title: "Royale Luxury Emulsion",
        meta_description: "Premium interior emulsion for smooth walls.",
        meta_keywords: ["paint", "interior", "luxury"],
        canonical_url: null,
        og_image_url: "/images/placeholders/department-paints.svg",
        specification: { finish: "Premium Matt", coverage: "120 sq ft/litre" },
        attributes: { shade: "Ivory Mist" },
        deleted_at: null,
        created_at: "2026-07-01T10:00:00.000Z",
        updated_at: "2026-07-29T10:00:00.000Z",
      },
      {
        id: "qa-prod-plumb-1",
        department_id: "qa-dept-plumbing",
        category_id: "qa-cat-pipes",
        brand_id: "qa-brand-astral",
        slug: "astral-cpvc-pipe-20-mm-heavy-duty-long-supply-line",
        sku: "AST-CPVC-20",
        name: "Astral CPVC Pipe 20 mm Heavy Duty Long Supply Line",
        description: "Durable CPVC pipe suitable for domestic water distribution.",
        short_description: "Heavy duty supply line.",
        gst_rate: 18,
        mrp: 700,
        selling_price: 540,
        discount_amount: 160,
        discount_percent: 23,
        status: "active",
        featured: false,
        meta_title: "Astral CPVC Pipe",
        meta_description: "Reliable plumbing supply line.",
        meta_keywords: ["pipe", "cpvc", "plumbing"],
        canonical_url: null,
        og_image_url: "/images/placeholders/department-plumbing.svg",
        specification: { material: "CPVC", size: "20 mm" },
        attributes: { length: "3 m" },
        deleted_at: null,
        created_at: "2026-06-18T10:00:00.000Z",
        updated_at: "2026-07-28T08:00:00.000Z",
      },
      {
        id: "qa-prod-plumb-2",
        department_id: "qa-dept-plumbing",
        category_id: "qa-cat-sealants",
        brand_id: "qa-brand-fixit",
        slug: "dr-fixit-waterproofing-coating-4-litre-bucket",
        sku: "DF-WP-4L",
        name: "Dr. Fixit Waterproofing Coating 4 Litre Bucket",
        description: "High-performance waterproofing bucket for terrace protection.",
        short_description: "Waterproofing bucket.",
        gst_rate: 18,
        mrp: 1499,
        selling_price: 1299,
        discount_amount: 200,
        discount_percent: 13,
        status: "active",
        featured: true,
        meta_title: "Dr. Fixit Waterproofing",
        meta_description: "Protects walls and terraces from seepage.",
        meta_keywords: ["waterproofing", "sealant"],
        canonical_url: null,
        og_image_url: "/images/placeholders/department-paints.svg",
        specification: { coverage: "75 sq ft/litre", finish: "Liquid coat" },
        attributes: { pack: "Bucket" },
        deleted_at: null,
        created_at: "2026-06-20T10:00:00.000Z",
        updated_at: "2026-07-27T08:00:00.000Z",
      },
    ],
    productImages: [
      { id: "qa-image-1", product_id: "qa-prod-paint-1", image_url: "/images/placeholders/department-paints.svg", alt_text: "Asian Paints Royale Luxury Emulsion", sort_order: 0, is_primary: true, deleted_at: null },
      { id: "qa-image-2", product_id: "qa-prod-plumb-1", image_url: "/images/placeholders/department-plumbing.svg", alt_text: "Astral CPVC Pipe", sort_order: 0, is_primary: true, deleted_at: null },
      { id: "qa-image-3", product_id: "qa-prod-plumb-2", image_url: "/images/placeholders/department-paints.svg", alt_text: "Dr. Fixit Waterproofing Coating", sort_order: 0, is_primary: true, deleted_at: null },
    ],
    productVariants: [
      { id: "qa-variant-1", product_id: "qa-prod-paint-1", sku: "AP-RLE-10L-IVM", variant_name: "Standard", option_label: "Pack", option_value: "10 Litre", variant_options: { pack: "10 Litre" }, mrp_override: 4590, selling_price_override: 3890, barcode: null, weight: 10, is_default: true, is_active: true, deleted_at: null },
      { id: "qa-variant-2", product_id: "qa-prod-plumb-1", sku: "AST-CPVC-20-3M", variant_name: "Standard", option_label: "Length", option_value: "3 m", variant_options: { length: "3 m" }, mrp_override: 700, selling_price_override: 540, barcode: null, weight: 3, is_default: true, is_active: true, deleted_at: null },
      { id: "qa-variant-3", product_id: "qa-prod-plumb-2", sku: "DF-WP-4L", variant_name: "Standard", option_label: "Pack", option_value: "4 Litre", variant_options: { pack: "4 Litre" }, mrp_override: 1499, selling_price_override: 1299, barcode: null, weight: 4, is_default: true, is_active: true, deleted_at: null },
    ],
    inventories: [
      { id: "qa-inv-1", product_variant_id: "qa-variant-1", current_quantity: 24, reserved_quantity: 3, low_stock_threshold: 8, stock_status: "healthy", warehouse_location: "Main warehouse", deleted_at: null },
      { id: "qa-inv-2", product_variant_id: "qa-variant-2", current_quantity: 120, reserved_quantity: 10, low_stock_threshold: 15, stock_status: "healthy", warehouse_location: "North warehouse", deleted_at: null },
      { id: "qa-inv-3", product_variant_id: "qa-variant-3", current_quantity: 18, reserved_quantity: 2, low_stock_threshold: 5, stock_status: "healthy", warehouse_location: "West warehouse", deleted_at: null },
    ],
  };
}

export function getQaCheckoutPricingSummary(couponCode?: string | null) {
  const subtotal = getQaCartItems().reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountTotal = 1320;
  const couponDiscount = couponCode?.trim().toUpperCase() === "WELCOME10" ? 400 : 0;
  const taxableAmount = Math.max(0, subtotal - discountTotal - couponDiscount);
  const taxTotal = Math.round((taxableAmount * 18) / 100);
  const shippingTotal = subtotal >= 5000 ? 0 : 99;
  const totalAmount = Math.max(0, taxableAmount + taxTotal + shippingTotal);

  return {
    error: null as string | null,
    pricing: {
      couponId: couponDiscount > 0 ? "qa-coupon-1" : null,
      couponCode: couponDiscount > 0 ? "WELCOME10" : null,
      subtotal,
      discountTotal,
      couponDiscount,
      taxableAmount,
      taxTotal,
      shippingTotal,
      totalAmount,
      itemCount: getQaCartItems().reduce((sum, item) => sum + item.quantity, 0),
    },
  };
}
