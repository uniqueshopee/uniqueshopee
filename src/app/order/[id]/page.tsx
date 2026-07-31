import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderDetailPage } from "@/components/orders/orders-kit";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadOrderById } from "@/lib/order-service";
import { getOrderById as getMockOrderById } from "@/lib/orders-data";
import { QA_ORDERS, isQaBypassEnabled } from "@/lib/qa-mode";

type OrderPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

async function loadViewerOrder(orderId: string) {
  if (isQaBypassEnabled()) {
    return { order: QA_ORDERS.find((order) => order.id === orderId || order.orderNumber === orderId) ?? QA_ORDERS[0] ?? null, roleKey: null };
  }

  const client = await getSupabaseServerClient();

  if (!client) {
    return { order: getMockOrderById(orderId) ?? null, roleKey: null };
  }

  const [{ data: userData }, { data: roleData }] = await Promise.all([client.auth.getUser(), client.rpc("current_user_role_key")]);

  const userId = userData.user?.id ?? null;
  const roleKey = typeof roleData === "string" ? roleData : null;
  const order = await loadOrderById(client, orderId, userId, { roleKey: roleKey as "customer" | "admin" | "manager" | "staff" | null });
  return { order, roleKey: roleKey as "customer" | "admin" | "manager" | "staff" | null };
}

export async function generateMetadata({ params }: OrderPageProps): Promise<Metadata> {
  const { id } = await params;
  const { order } = await loadViewerOrder(id);

  if (!order) {
    return {
      title: "Order not found | UniqueShopee",
    };
  }

  return {
    title: `${order.orderNumber} | UniqueShopee Orders`,
    description: `Review order ${order.orderNumber}, delivery timeline, billing summary, and support details.`,
  };
}

export default async function OrderDetailRoute({ params }: OrderPageProps) {
  const { id } = await params;
  const { order, roleKey } = await loadViewerOrder(id);

  if (!order) {
    notFound();
  }

  return <OrderDetailPage order={order} roleKey={roleKey} />;
}
