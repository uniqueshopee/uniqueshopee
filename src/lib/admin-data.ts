export type AdminStat = {
  label: string;
  value: string;
  delta: string;
  note: string;
  tone: "accent" | "success" | "warning" | "neutral";
};

export type RecentOrder = {
  id: string;
  customer: string;
  status: string;
  amount: number;
  timeline: string;
  date: string;
};

export type ProductRow = {
  id: string;
  name: string;
  brand: string;
  category: string;
  status: string;
  stock: string;
  price: number;
};

export type CategoryRow = {
  id: string;
  name: string;
  products: number;
  status: string;
};

export type BrandRow = {
  id: string;
  name: string;
  products: number;
  status: string;
};

export type CustomerRow = {
  id: string;
  name: string;
  email: string;
  orders: number;
  joined: string;
  status: string;
};

export type ReviewRow = {
  id: string;
  product: string;
  customer: string;
  rating: number;
  status: string;
};

export type CouponRow = {
  id: string;
  code: string;
  status: string;
  expiry: string;
  discount: string;
};

export type BannerRow = {
  id: string;
  title: string;
  placement: string;
  status: string;
};

export type InventoryRow = {
  id: string;
  product: string;
  sku: string;
  stock: number;
  status: string;
};

export type ReportMetric = {
  label: string;
  value: string;
  note: string;
};

export type SettingField = {
  label: string;
  value: string;
  hint: string;
};

export type SettingGroup = {
  title: string;
  description: string;
  fields: SettingField[];
};

export const ADMIN_STATS: AdminStat[] = [];
export const RECENT_ORDERS: RecentOrder[] = [];
export const TOP_PRODUCTS: Array<{ name: string; sales: number; revenue: string }> = [];
export const TOP_CATEGORIES: Array<{ name: string; sales: number; share: string }> = [];
export const RECENT_REVIEWS: ReviewRow[] = [];
export const PRODUCT_ROWS: ProductRow[] = [];
export const CATEGORY_ROWS: CategoryRow[] = [];
export const BRAND_ROWS: BrandRow[] = [];
export const CUSTOMER_ROWS: CustomerRow[] = [];
export const REVIEW_ROWS: ReviewRow[] = [];
export const COUPON_ROWS: CouponRow[] = [];
export const BANNER_ROWS: BannerRow[] = [];
export const INVENTORY_ROWS: InventoryRow[] = [];
export const REPORT_METRICS: ReportMetric[] = [];
export const SETTINGS_GROUPS: SettingGroup[] = [];
