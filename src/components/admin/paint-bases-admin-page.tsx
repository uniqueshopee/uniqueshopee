"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, FormField } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { AdminActionButton, AdminSectionCard, PageHeader } from "@/components/admin/admin-kit";
import { useAuth } from "@/components/auth/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";

type BaseRow = { id: string; name: string; code: string | null; description: string | null; is_active: boolean; sort_order: number };

export function PaintBasesAdminPage() {
  const { role } = useAuth();
  const canManage = role === "admin" || role === "manager";
  const [rows, setRows] = useState<BaseRow[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", code: "", description: "", isActive: true, sortOrder: "0" });

  const load = async () => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const { data } = await client.from("paint_bases").select("id, name, code, description, is_active, sort_order").is("deleted_at", null).order("sort_order", { ascending: true });
    setRows((data ?? []) as BaseRow[]);
  };
  useEffect(() => { void load(); }, []);

  const save = async () => {
    const client = getSupabaseBrowserClient();
    if (!client || !form.name.trim()) return;
    const { error } = await client.from("paint_bases").upsert({ id: editing ?? undefined, name: form.name.trim(), code: form.code.trim() || null, description: form.description.trim() || null, is_active: form.isActive, sort_order: Number.parseInt(form.sortOrder, 10) || 0, deleted_at: null }, { onConflict: "id" });
    if (error) { toast({ title: "Base not saved", description: error.message, variant: "danger" }); return; }
    setOpen(false); setEditing(null); setForm({ name: "", code: "", description: "", isActive: true, sortOrder: "0" }); await load();
  };

  return <section className="space-y-6"><PageHeader crumbs={[{ label: "Admin", href: "/admin" }, { label: "Paint Bases" }]} title="Paint bases" subtitle="Manage tinting bases referenced by shades and variants." actions={<AdminActionButton variant="accent" onClick={() => { setEditing(null); setForm({ name: "", code: "", description: "", isActive: true, sortOrder: "0" }); setOpen(true); }}>Add base</AdminActionButton>} /><AdminSectionCard title="Base directory" description="Deactivate bases instead of deleting referenced records."><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{rows.map((row) => <div key={row.id} className="rounded-xl border border-border/70 bg-white p-4"><div className="flex items-start justify-between gap-2"><div><p className="font-bold text-text">{row.name}</p><p className="text-xs font-medium text-muted">{row.code || "No code"}</p></div><Badge variant={row.is_active ? "success" : "neutral"}>{row.is_active ? "Active" : "Inactive"}</Badge></div><Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => { setEditing(row.id); setForm({ name: row.name, code: row.code || "", description: row.description || "", isActive: row.is_active, sortOrder: String(row.sort_order) }); setOpen(true); }}>Edit</Button></div>)}</div></AdminSectionCard><Modal open={open} onOpenChange={setOpen} title={editing ? "Edit paint base" : "Add paint base"}><div className="space-y-4"><FormField label="Display name" htmlFor="base-name"><Input id="base-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Deep Base" /></FormField><FormField label="Internal code" htmlFor="base-code"><Input id="base-code" value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} placeholder="DEEP" /></FormField><FormField label="Description" htmlFor="base-description"><Input id="base-description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></FormField><FormField label="Sort order" htmlFor="base-sort"><Input id="base-sort" inputMode="numeric" value={form.sortOrder} onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))} /></FormField><label className="flex items-center gap-2 text-sm font-semibold text-text"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />Active base</label><div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="button" variant="accent" onClick={() => void save()} disabled={!canManage || !form.name.trim()}>Save base</Button></div></div></Modal></section>;
}
