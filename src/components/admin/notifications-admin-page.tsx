"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, FormField } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

type Customer = { id: string; name: string; email: string };

function NotificationsAdminPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [target, setTarget] = useState("specific");
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("System");
  const [actionLabel, setActionLabel] = useState("");
  const [actionUrl, setActionUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/admin/notifications").then(async (response) => {
      const payload = await response.json() as { customers?: Customer[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to load customers.");
      setCustomers(payload.customers ?? []);
    }).catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Unable to load customers.")).finally(() => setLoading(false));
  }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setSubmitting(true);
    try {
      const response = await fetch("/api/admin/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, message, type, target, userId, actionLabel, actionUrl }) });
      const payload = await response.json() as { created?: number; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to create notification.");
      toast({ title: "Notification sent", description: `Created for ${payload.created ?? 0} customer${payload.created === 1 ? "" : "s"}.`, variant: "success" });
      setTitle(""); setMessage(""); setActionLabel(""); setActionUrl("");
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create notification.");
    } finally { setSubmitting(false); }
  };

  return <section className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Admin Panel</p><h1 className="text-3xl font-black text-text">Notifications</h1><p className="mt-2 text-sm font-medium text-muted">Send an in-app notification to one customer or all active customers.</p></div><Card className="max-w-3xl rounded-[1.4rem] p-5 sm:p-6"><form className="space-y-5" onSubmit={submit}><div className="grid gap-4 sm:grid-cols-2"><FormField label="Recipient"><select value={target} onChange={(event) => setTarget(event.target.value)} className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm"><option value="specific">Specific User</option><option value="all_customers">All Customers</option></select></FormField>{target === "specific" ? <FormField label="Customer"><select required value={userId} onChange={(event) => setUserId(event.target.value)} disabled={loading} className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm"><option value="">{loading ? "Loading customers…" : "Select customer"}</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} — {customer.email}</option>)}</select></FormField> : <div className="rounded-xl bg-background-secondary p-3 text-sm font-medium text-muted">The server will exclude admin, manager, and staff accounts.</div>}</div><FormField label="Title"><Input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Diwali Offer 🎉" /></FormField><FormField label="Message"><textarea required maxLength={4000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write the notification message…" className="min-h-32 w-full rounded-xl border border-border bg-white px-3 py-3 text-sm text-text outline-none focus:ring-2 focus:ring-accent" /></FormField><div className="grid gap-4 sm:grid-cols-2"><FormField label="Notification type"><select value={type} onChange={(event) => setType(event.target.value)} className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm"><option>System</option><option>Order Update</option><option>Promotion</option><option>Wishlist</option><option>Account</option></select></FormField><div className="text-sm text-muted sm:pt-8">Category is derived automatically by the customer notification UI.</div></div><div className="grid gap-4 sm:grid-cols-2"><FormField label="Action label"><Input maxLength={80} value={actionLabel} onChange={(event) => setActionLabel(event.target.value)} placeholder="Shop Now" /></FormField><FormField label="Action URL"><Input maxLength={500} value={actionUrl} onChange={(event) => setActionUrl(event.target.value)} placeholder="/products" /></FormField></div>{error && <div role="alert" className="rounded-xl border border-danger/20 bg-danger/10 p-3 text-sm font-semibold text-danger">{error}</div>}<Button type="submit" variant="accent" size="lg" disabled={submitting || loading}>{submitting ? "Sending…" : "Create Notification"}</Button></form></Card></section>;
}

export { NotificationsAdminPage };
