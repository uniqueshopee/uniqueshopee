"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, RefreshCcw, Trash2, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input, FormField } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AdminSectionCard, PageHeader } from "@/components/admin/admin-kit";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { PINCODE_REGEX } from "@/lib/delivery-service";

type DeliveryPincode = { id: string; pincode: string; is_active: boolean; created_at: string; updated_at: string };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

export function DeliveryPincodesAdminPage() {
  const [rows, setRows] = useState<DeliveryPincode[]>([]);
  const [pincode, setPincode] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadRows = useCallback(async () => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      toast({ title: "Delivery pincodes unavailable", description: "Supabase is not configured.", variant: "danger" });
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await client.from("delivery_pincodes").select("id, pincode, is_active, created_at, updated_at").order("pincode", { ascending: true });
    if (result.error) toast({ title: "Unable to load pincodes", description: result.error.message, variant: "danger" });
    else setRows((result.data ?? []) as DeliveryPincode[]);
    setLoading(false);
  }, []);

  useEffect(() => { void loadRows(); }, [loadRows]);

  const addPincode = async () => {
    const normalized = pincode.trim();
    if (!PINCODE_REGEX.test(normalized)) {
      toast({ title: "Invalid pincode", description: "Enter a valid 6-digit pincode.", variant: "danger" });
      return;
    }
    const client = getSupabaseBrowserClient();
    if (!client) return;
    setSaving(true);
    const result = await client.from("delivery_pincodes").insert({ pincode: normalized, is_active: true });
    setSaving(false);
    if (result.error) {
      toast({ title: "Pincode not added", description: result.error.code === "23505" ? "This pincode already exists." : result.error.message, variant: "danger" });
      return;
    }
    setPincode("");
    toast({ title: "Pincode added", description: `${normalized} is now serviceable.`, variant: "success" });
    await loadRows();
  };

  const toggle = async (row: DeliveryPincode) => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const result = await client.from("delivery_pincodes").update({ is_active: !row.is_active }).eq("id", row.id);
    if (result.error) toast({ title: "Status not updated", description: result.error.message, variant: "danger" });
    else await loadRows();
  };

  const remove = async (row: DeliveryPincode) => {
    if (!window.confirm(`Delete delivery pincode ${row.pincode}?`)) return;
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const result = await client.from("delivery_pincodes").delete().eq("id", row.id);
    if (result.error) toast({ title: "Pincode not deleted", description: result.error.message, variant: "danger" });
    else { toast({ title: "Pincode deleted", description: `${row.pincode} was removed.`, variant: "success" }); await loadRows(); }
  };

  return (
    <section className="space-y-5">
      <PageHeader crumbs={[{ label: "Delivery Pincodes" }]} title="Delivery Pincodes" subtitle="Control which six-digit pincodes can receive delivery." />
      <AdminSectionCard title="Add serviceable pincode" description="Customers can place delivery orders only at active pincodes.">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <FormField label="Pincode" htmlFor="delivery-pincode" hint="Exactly 6 numeric digits">
            <Input id="delivery-pincode" value={pincode} onChange={(event) => setPincode(event.target.value)} maxLength={6} inputMode="numeric" placeholder="800001" />
          </FormField>
          <Button type="button" onClick={() => void addPincode()} loading={saving}><Check className="h-4 w-4" />Add pincode</Button>
        </div>
      </AdminSectionCard>
      <AdminSectionCard title="Managed pincodes" description={`${rows.filter((row) => row.is_active).length} active of ${rows.length} total`} actions={<Button type="button" variant="outline" size="sm" onClick={() => void loadRows()}><RefreshCcw className="h-4 w-4" />Refresh</Button>}>
        {loading ? <p className="py-8 text-center text-sm font-medium text-muted">Loading pincodes…</p> : rows.length === 0 ? <p className="py-8 text-center text-sm font-medium text-muted">No delivery pincodes configured.</p> : <div className="overflow-x-auto rounded-[1.2rem] border border-border/70"><table className="min-w-full divide-y divide-border/70"><thead className="bg-background-secondary/35"><tr><th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-muted">Pincode</th><th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-muted">Status</th><th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-muted">Created</th><th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-muted">Actions</th></tr></thead><tbody className="divide-y divide-border/70 bg-white/70">{rows.map((row) => <tr key={row.id}><td className="px-4 py-3 font-bold text-text">{row.pincode}</td><td className="px-4 py-3"><Badge variant={row.is_active ? "success" : "warning"}>{row.is_active ? "Active" : "Inactive"}</Badge></td><td className="px-4 py-3 text-sm font-medium text-muted">{formatDate(row.created_at)}</td><td className="px-4 py-3"><div className="flex justify-end gap-2"><Button type="button" variant="outline" size="sm" onClick={() => void toggle(row)}>{row.is_active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}{row.is_active ? "Disable" : "Enable"}</Button><Button type="button" variant="danger" size="sm" onClick={() => void remove(row)}><Trash2 className="h-4 w-4" />Delete</Button></div></td></tr>)}</tbody></table></div>}
      </AdminSectionCard>
    </section>
  );
}
