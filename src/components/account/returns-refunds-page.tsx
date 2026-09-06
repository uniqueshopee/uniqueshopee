"use client";

import { useEffect, useState } from "react";
import { MessageSquareText, Phone } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { loadOrdersForViewer, type OrderAccessRole } from "@/lib/order-service";
import { loadOrderReturnRequests, type OrderReturnRequest } from "@/lib/return-service";
import type { OrderRecord } from "@/lib/orders-data";
import { CONTACT_DETAILS } from "@/lib/support-data";
import { formatPrice } from "@/lib/utils";

type ReturnOrderEntry = {
  order: OrderRecord;
  requests: OrderReturnRequest[];
};

const SUPPORT_PHONE_DIGITS = CONTACT_DETAILS.customerCare.replace(/\D/g, "");
const WHATSAPP_URL = SUPPORT_PHONE_DIGITS ? `https://wa.me/${SUPPORT_PHONE_DIGITS}` : "https://wa.me/";
const CALL_URL = SUPPORT_PHONE_DIGITS ? `tel:${SUPPORT_PHONE_DIGITS}` : `tel:${CONTACT_DETAILS.customerCare.replace(/\s+/g, "")}`;

function formatOrderDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function buildItemSummary(order: OrderRecord) {
  const visibleItems = order.items.slice(0, 2).map((item) => item.name);
  if (visibleItems.length === 0) {
    return "No item details available";
  }

  return visibleItems.join(", ");
}

function formatReturnStatus(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function ReturnsRefundsPage() {
  const { user, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<ReturnOrderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      if (authLoading) {
        return;
      }

      if (!user?.id) {
        if (active) {
          setEntries([]);
          setLoading(false);
          setError(null);
        }
        return;
      }

      const client = getSupabaseBrowserClient();
      if (!client) {
        if (active) {
          setEntries([]);
          setLoading(false);
          setError("Supabase is not configured.");
        }
        return;
      }

      if (active) {
        setLoading(true);
        setError(null);
      }

      try {
        const orders = await loadOrdersForViewer(client, user.id);
        const orderedEntries = await Promise.all(
          orders.map(async (order) => {
            const requests = await loadOrderReturnRequests(client, order.id, user.id, { roleKey: null as OrderAccessRole | null });
            return { order, requests };
          }),
        );

        const returnEntries = orderedEntries
          .filter(({ order, requests }) => requests.length > 0 || order.status === "Returned" || order.status === "Refunded")
          .sort((left, right) => {
            const leftTime = new Date(left.requests[0]?.createdAt ?? left.order.placedAtRaw ?? left.order.placedAt).getTime();
            const rightTime = new Date(right.requests[0]?.createdAt ?? right.order.placedAtRaw ?? right.order.placedAt).getTime();
            return rightTime - leftTime;
          });

        if (active) {
          setEntries(returnEntries);
          setLoading(false);
        }
      } catch {
        if (active) {
          setEntries([]);
          setLoading(false);
          setError("Unable to load return orders.");
        }
      }
    };

    void loadData();

    return () => {
      active = false;
    };
  }, [authLoading, user?.id]);

  return (
    <section className="mx-auto max-w-4xl px-4 py-4 sm:px-6 sm:py-6">
      <div className="space-y-4">
        {loading || authLoading ? (
          <div className="grid gap-3">
            <Skeleton className="h-28 rounded-[1.4rem]" />
            <Skeleton className="h-28 rounded-[1.4rem]" />
          </div>
        ) : error ? (
          <Card className="rounded-[1.4rem] border-white/80 bg-white/92 p-4 shadow-[var(--shadow-sm)]">
            <p className="text-sm font-medium text-muted">{error}</p>
          </Card>
        ) : entries.length === 0 ? (
          <Card className="rounded-[1.4rem] border-white/80 bg-white/92 p-4 shadow-[var(--shadow-sm)]">
            <p className="text-sm font-medium text-muted">No return orders yet.</p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {entries.map(({ order, requests }) => {
              const isRefunded = order.status === "Refunded";
              const isReturned = order.status === "Returned";

              return (
                <Card key={order.id} className="rounded-[1.4rem] border-white/80 bg-white/92 p-4 shadow-[var(--shadow-sm)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold text-text">{order.orderNumber}</h2>
                        <Badge variant={isRefunded ? "success" : isReturned ? "neutral" : "accent"}>{order.status}</Badge>
                      </div>
                      <p className="mt-1 text-xs font-medium text-muted">{formatOrderDate(order.placedAtRaw ?? order.placedAt)}</p>
                    </div>

                    <p className="shrink-0 text-sm font-black text-text">{formatPrice(order.grandTotal)}</p>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-text">{buildItemSummary(order)}</span>
                    {order.items.length > 2 ? <span className="text-xs font-medium text-muted">+{order.items.length - 2} more</span> : null}
                  </div>

                  {requests.length > 0 ? requests.map((request) => (
                    <div key={request.id} className="mt-3 rounded-[1rem] border border-border/70 bg-background-secondary/30 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="max-w-full break-all text-xs font-semibold text-text">Return ID: {request.id}</p>
                        <Badge variant={request.status === "RETURN_REJECTED" ? "danger" : request.status === "REFUNDED" ? "success" : "accent"}>
                          {formatReturnStatus(request.status)}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm font-medium leading-6 text-muted">{request.reason}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-muted">
                        <span className="rounded-full border border-border/70 bg-white/85 px-3 py-1">Product: {request.productName}</span>
                        <span className="rounded-full border border-border/70 bg-white/85 px-3 py-1">Quantity: {request.requestedQuantity ?? 0}</span>
                        <span className="rounded-full border border-border/70 bg-white/85 px-3 py-1">Requested: {request.createdAt}</span>
                        {request.pickupOption ? <span className="rounded-full border border-border/70 bg-white/85 px-3 py-1">Pickup: {request.pickupOption}</span> : null}
                        {request.pickupLocation ? <span className="rounded-full border border-border/70 bg-white/85 px-3 py-1">Location: {request.pickupLocation}</span> : null}
                      </div>
                    </div>
                  )) : (
                    <p className="mt-2 text-sm font-medium leading-6 text-muted">Return request {formatReturnStatus(order.status)}.</p>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        <Card className="rounded-[1.4rem] border-white/80 bg-white/92 p-3 shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">
                <MessageSquareText className="h-4 w-4" aria-hidden="true" />
                WhatsApp
              </a>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <a href={CALL_URL}>
                <Phone className="h-4 w-4" aria-hidden="true" />
                Call
              </a>
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
}

export { ReturnsRefundsPage };
