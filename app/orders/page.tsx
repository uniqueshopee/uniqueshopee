import type { Metadata } from "next";
import { OrdersListPage } from "@/components/orders/orders-kit";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadOrdersForViewer } from "@/lib/order-service";
import { getOrders as getMockOrders } from "@/lib/orders-data";
import { isQaBypassEnabled } from "@/lib/qa-mode";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "My Orders | UniqueShopee",
    description: "Track your UniqueShopee orders, delivery timelines, invoices, returns, and support tools.",
  };
}

export default async function OrdersRoute() {
  if (isQaBypassEnabled()) {
    return <OrdersListPage orders={getMockOrders()} />;
  }

  const client = await getSupabaseServerClient();

  if (!client) {
    return <OrdersListPage orders={getMockOrders()} />;
  }

  const [
    { data: userData },
    { data: roleData },
  ] = await Promise.all([
    client.auth.getUser(),
    client.rpc("current_user_role_key"),
  ]);

  const userId = userData.user?.id ?? null;
  const roleKey = typeof roleData === "string" ? roleData : null;
  const orders = await loadOrdersForViewer(client, userId, { roleKey: roleKey as "customer" | "admin" | "manager" | "staff" | null });

  return <OrdersListPage orders={orders} />;
}
