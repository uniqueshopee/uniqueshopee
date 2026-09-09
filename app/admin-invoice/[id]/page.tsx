import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { AdminInvoice } from "@/components/admin/admin-invoice";
import { isAdminRole } from "@/lib/auth";
import { loadOrderById } from "@/lib/order-service";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthRoleKey } from "@/lib/supabase/auth";

type AdminInvoiceRouteProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

async function loadAdminInvoice(orderId: string) {
  const client = await getSupabaseServerClient();
  if (!client) {
    notFound();
  }

  const { data: userData } = await client.auth.getUser();
  if (!userData.user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/admin-invoice/${orderId}`)}`);
  }

  const { data: roleData } = await client.rpc("current_user_role_key");
  const roleKey = (typeof roleData === "string" ? roleData : null) as AuthRoleKey | null;
  if (!isAdminRole(roleKey)) {
    redirect("/account");
  }

  const order = await loadOrderById(client, orderId, userData.user.id, { roleKey });
  if (!order) {
    notFound();
  }

  return order;
}

export async function generateMetadata({ params }: AdminInvoiceRouteProps): Promise<Metadata> {
  const order = await loadAdminInvoice((await params).id);
  return {
    title: `Invoice ${order.orderNumber} | UniqueShopee`,
    robots: { index: false, follow: false },
  };
}

export default async function AdminInvoiceRoute({ params }: AdminInvoiceRouteProps) {
  const order = await loadAdminInvoice((await params).id);
  return <AdminInvoice order={order} />;
}
