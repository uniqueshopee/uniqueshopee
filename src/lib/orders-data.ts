import type { Product } from "@/types";

export type OrderStatus =
  | "Pending"
  | "Ordered"
  | "Confirmed"
  | "Packed"
  | "Shipped"
  | "Out for Delivery"
  | "Delivered"
  | "Cancelled"
  | "Returned"
  | "Refunded";

export type OrderTab = "all" | "active" | "delivered" | "cancelled" | "returned";
export type OrderSortMode = "latest" | "oldest" | "amount-high" | "amount-low" | "status";
export type OrderMutableStatus = Exclude<OrderStatus, "Ordered" | "Out for Delivery">;

export type OrderTimelineStep = {
  status: Exclude<OrderStatus, "Cancelled" | "Returned" | "Refunded">;
  timestamp: string;
  description: string;
  icon: "pending" | "ordered" | "confirmed" | "packed" | "shipped" | "delivery" | "delivered";
  active: boolean;
};

export type OrderItem = Pick<Product, "id" | "name" | "slug" | "price" | "compareAtPrice" | "image" | "category" | "badge"> & {
  brand: string;
  quantity: number;
  variant: string;
  productId?: string;
  returnable?: boolean;
};

export type OrderRecord = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: "pending" | "paid" | "failed" | "refunded" | "partially_refunded";
  placedAt: string;
  placedAtRaw?: string;
  deliveredAt?: string;
  deliveredAtRaw?: string | null;
  trackingNumber?: string;
  paymentMethod: string;
  paymentReference: string;
  deliveryAddress: {
    name: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  };
  billingAddress: {
    name: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    pincode: string;
  };
  couponApplied?: string;
  notes?: string;
  subtotal: number;
  discount: number;
  couponDiscount: number;
  gst: number;
  shipping: number;
  grandTotal: number;
  itemsCount: number;
  items: OrderItem[];
  timeline: OrderTimelineStep[];
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  Pending: "Pending",
  Ordered: "Ordered",
  Confirmed: "Confirmed",
  Packed: "Packed",
  Shipped: "Shipped",
  "Out for Delivery": "Out for Delivery",
  Delivered: "Delivered",
  Cancelled: "Cancelled",
  Returned: "Returned",
  Refunded: "Refunded",
};

export const ORDER_MUTABLE_STATUS_OPTIONS: OrderMutableStatus[] = [
  "Pending",
  "Confirmed",
  "Packed",
  "Shipped",
  "Delivered",
  "Cancelled",
  "Returned",
  "Refunded",
];

export const ORDER_STATUS_DB_VALUES: Record<OrderMutableStatus, "pending" | "confirmed" | "packed" | "shipped" | "delivered" | "cancelled" | "returned" | "refunded"> = {
  Pending: "pending",
  Confirmed: "confirmed",
  Packed: "packed",
  Shipped: "shipped",
  Delivered: "delivered",
  Cancelled: "cancelled",
  Returned: "returned",
  Refunded: "refunded",
};

export const ORDER_STATUS_TONE: Record<OrderStatus, "accent" | "success" | "warning" | "danger" | "neutral"> = {
  Pending: "neutral",
  Ordered: "accent",
  Confirmed: "accent",
  Packed: "warning",
  Shipped: "accent",
  "Out for Delivery": "warning",
  Delivered: "success",
  Cancelled: "danger",
  Returned: "neutral",
  Refunded: "success",
};

export const ORDERS: OrderRecord[] = [];

export function getOrders() {
  return ORDERS;
}

export function getOrderById(id: string) {
  return ORDERS.find((order) => order.id === id);
}

export function getOrderStaticParams() {
  return ORDERS.map((order) => ({ id: order.id }));
}

export function isOrderActive(status: OrderStatus) {
  return ["Pending", "Ordered", "Confirmed", "Packed", "Shipped", "Out for Delivery"].includes(status);
}

export function canCancelOrder(status: OrderStatus) {
  return ["Pending", "Confirmed", "Packed"].includes(status);
}

export function getOrderTab(status: OrderStatus): Exclude<OrderTab, "all"> {
  if (isOrderActive(status)) {
    return "active";
  }

  if (status === "Delivered") {
    return "delivered";
  }

  if (status === "Cancelled") {
    return "cancelled";
  }

  return "returned";
}
