"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, FormField } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/auth-provider";
import { AdminActionButton, AdminSectionCard, AdminStatCard, AdminStatusBadge, PageHeader } from "@/components/admin/admin-kit";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getQaProductCatalog, isQaBypassEnabled } from "@/lib/qa-mode";
import { formatPrice } from "@/lib/utils";
import { Plus, RefreshCcw, Sparkles } from "lucide-react";

type JsonRecord = Record<string, unknown>;

type OfferProductRow = {
  id: string;
  name: string;
  slug: string;
  brandName: string;
  categoryName: string;
  status: string;
  featured: boolean;
  sellingPrice: number;
  mrp: number;
  imageUrl: string | null;
  attributes: JsonRecord | null;
  updatedAt: string;
};

type OfferDraft = {
  exclusiveOffer: boolean;
  percent: string;
};

function toNumber(value: unknown) {
  const next = typeof value === "number" ? value : Number.parseFloat(String(value ?? 0));
  return Number.isFinite(next) ? next : 0;
}

function getBooleanValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function toOfferDraft(row: OfferProductRow): OfferDraft {
  const attributes = row.attributes ?? {};
  const exclusiveOffer = getBooleanValue(attributes.exclusive_offer ?? attributes.exclusiveOffer ?? attributes.offer_exclusive, false);
  const percentValue = attributes.exclusive_offer_percent ?? attributes.exclusiveOfferPercent ?? attributes.offer_percent;

  return {
    exclusiveOffer,
    percent: String(percentValue ?? ""),
  };
}

function ProductPreview({ url, name }: { url: string | null; name: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[1.1rem] border border-border/70 bg-background-secondary/30">
      {url ? (
        <div
          className="h-full w-full bg-cover bg-center"
          style={{ backgroundImage: `url('${url}')` }}
          role="img"
          aria-label={name}
        />
      ) : (
        <Sparkles className="h-6 w-6 text-accent" aria-hidden="true" />
      )}
    </div>
  );
}

function ExclusiveOffersAdminPage() {
  const { role } = useAuth();
  const canManage = role === "admin" || role === "manager";
  const [rows, setRows] = useState<OfferProductRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, OfferDraft>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadRows = async () => {
    setLoading(true);
    setError(null);

    try {
      if (isQaBypassEnabled()) {
        const catalog = getQaProductCatalog();
        const qaRows = catalog.products.map((product) => {
          const brand = catalog.brands.find((item) => item.id === product.brand_id);
          const category = catalog.categories.find((item) => item.id === product.category_id);
          return {
            id: product.id,
            name: product.name,
            slug: product.slug,
            brandName: brand?.name ?? "Brand",
            categoryName: category?.name ?? "Category",
            status: product.status,
            featured: product.featured,
            sellingPrice: product.selling_price,
            mrp: product.mrp,
            imageUrl: product.og_image_url ?? null,
            attributes: product.attributes,
            updatedAt: product.updated_at,
          } satisfies OfferProductRow;
        });
        setRows(qaRows);
        setDrafts(Object.fromEntries(qaRows.map((row) => [row.id, toOfferDraft(row)])));
        return;
      }

      const client = getSupabaseBrowserClient();
      if (!client) {
        setError("Supabase is not configured for this environment.");
        return;
      }

      const [productsResult, brandsResult, categoriesResult] = await Promise.all([
        client
          .from("products")
          .select("id, name, slug, brand_id, category_id, status, featured, selling_price, mrp, og_image_url, attributes, updated_at")
          .is("deleted_at", null)
          .order("updated_at", { ascending: false }),
        client.from("brands").select("id, name").is("deleted_at", null),
        client.from("categories").select("id, name").is("deleted_at", null),
      ]);

      if (productsResult.error) throw productsResult.error;
      if (brandsResult.error) throw brandsResult.error;
      if (categoriesResult.error) throw categoriesResult.error;

      const brandNameById = new Map((brandsResult.data ?? []).map((row) => [row.id, row.name as string]));
      const categoryNameById = new Map((categoriesResult.data ?? []).map((row) => [row.id, row.name as string]));

      const nextRows: OfferProductRow[] = (productsResult.data ?? []).map((product) => ({
        id: String(product.id ?? ""),
        name: String(product.name ?? ""),
        slug: String(product.slug ?? ""),
        brandName: brandNameById.get(String(product.brand_id ?? "")) ?? "Brand",
        categoryName: categoryNameById.get(String(product.category_id ?? "")) ?? "Category",
        status: String(product.status ?? "active"),
        featured: Boolean(product.featured),
        sellingPrice: toNumber(product.selling_price),
        mrp: toNumber(product.mrp),
        imageUrl: product.og_image_url ? String(product.og_image_url) : null,
        attributes: (product.attributes ?? {}) as JsonRecord,
        updatedAt: String(product.updated_at ?? new Date().toISOString()),
      }));

      setRows(nextRows);
      setDrafts(Object.fromEntries(nextRows.map((row) => [row.id, toOfferDraft(row)])));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load exclusive offers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRows();
  }, []);

  const exclusiveRows = useMemo(
    () => rows.filter((row) => drafts[row.id]?.exclusiveOffer ?? toOfferDraft(row).exclusiveOffer),
    [drafts, rows],
  );

  const stats = [
    { label: "Total Products", value: String(rows.length), delta: "Live catalog", note: "Products available for promotion", tone: "accent" as const },
    { label: "Exclusive Offers", value: String(exclusiveRows.length), delta: "Collection ready", note: "Marked exclusive for home page", tone: "success" as const },
    {
      label: "Average Offer",
      value:
        exclusiveRows.length > 0
          ? `${Math.round(exclusiveRows.reduce((sum, row) => sum + Number(drafts[row.id]?.percent || 0), 0) / exclusiveRows.length)}%`
          : "0%",
      delta: "Promo level",
      note: "Average exclusive-offer discount",
      tone: "neutral" as const,
    },
    { label: "Ready To Edit", value: String(rows.filter((row) => row.status === "active").length), delta: "All live rows", note: "Use the product editor for deeper changes", tone: "warning" as const },
  ];

  const updateDraft = (rowId: string, patch: Partial<OfferDraft>) => {
    setDrafts((current) => ({
      ...current,
      [rowId]: {
        exclusiveOffer: current[rowId]?.exclusiveOffer ?? false,
        percent: current[rowId]?.percent ?? "",
        ...patch,
      },
    }));
  };

  const saveOffer = async (row: OfferProductRow, overrideDraft?: OfferDraft) => {
    const draft = overrideDraft ?? drafts[row.id] ?? toOfferDraft(row);
    const percent = draft.percent.trim() ? Number.parseFloat(draft.percent) : 0;

    if (draft.exclusiveOffer && (!Number.isFinite(percent) || percent <= 0 || percent > 100)) {
      toast({ title: "Invalid percent", description: "Enter an exclusive offer percent between 1 and 100.", variant: "warning" });
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      toast({ title: "Supabase unavailable", description: "Cannot save exclusive offers right now.", variant: "danger" });
      return;
    }

    setSavingId(row.id);
    const attributes = {
      ...(row.attributes ?? {}),
      exclusive_offer: draft.exclusiveOffer,
      exclusive_offer_percent: draft.exclusiveOffer ? percent : null,
    };
    const { error: updateError } = await client.from("products").update({ attributes }).eq("id", row.id);
    setSavingId(null);

    if (updateError) {
      toast({ title: "Offer update failed", description: updateError.message, variant: "danger" });
      return;
    }

    toast({
      title: draft.exclusiveOffer ? "Exclusive offer saved" : "Exclusive offer removed",
      description: row.name,
      variant: "success",
    });
    await loadRows();
  };

  return (
    <section className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Offers" }]}
        title="Exclusive Offers"
        subtitle="Mark products as exclusive, set the promo percent, and surface them on the home page."
        actions={
          <div className="flex items-center gap-2">
            <AdminActionButton variant="outline" onClick={() => void loadRows()}>
              <RefreshCcw className="h-4 w-4" />
              Reload
            </AdminActionButton>
            <Button asChild variant="accent" size="md">
              <Link href="/admin/products">
                <Plus className="h-4 w-4" />
                Add Product
              </Link>
            </Button>
          </div>
        }
      />

      <AdminSectionCard
        title="How exclusive offers work"
        description="Use the product editor to create or update the item, then toggle it here so the storefront can pull it into the Exclusive Offer rail."
      >
        <p className="text-sm font-medium leading-6 text-muted">
          The banner area on the storefront can point users here, while the home page reads only the live products marked exclusive.
        </p>
      </AdminSectionCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <AdminStatCard key={stat.label} stat={stat} />
        ))}
      </div>

      {error ? (
        <Card className="rounded-[1.6rem] border-danger/20 bg-danger/5 p-5 shadow-[var(--shadow-sm)]">
          <p className="text-base font-bold text-text">Unable to load exclusive offers</p>
          <p className="mt-1 text-sm font-medium text-muted">{error}</p>
        </Card>
      ) : null}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-72 rounded-[1.4rem]" />
          ))}
        </div>
      ) : rows.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => {
            const draft = drafts[row.id] ?? toOfferDraft(row);
            const saveDisabled = !canManage || savingId === row.id;
            const exclusivePercent = draft.percent ? `${draft.percent}%` : "Set percent";

            return (
              <Card key={row.id} className="overflow-hidden rounded-[1.6rem] border-white/80 bg-white/92 shadow-[var(--shadow-sm)]">
                <div className="aspect-[16/10] bg-background-secondary/30">
                  <ProductPreview url={row.imageUrl} name={row.name} />
                </div>
                <div className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-black text-text">{row.name}</p>
                      <p className="text-xs font-medium text-muted">{row.brandName} · {row.categoryName}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <AdminStatusBadge status={row.status} />
                      {draft.exclusiveOffer ? <Badge variant="danger">Exclusive</Badge> : <Badge variant="neutral">Inactive</Badge>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-[1rem] border border-border/70 bg-background-secondary/25 p-3">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Price</p>
                      <p className="mt-1 font-black text-text">{formatPrice(row.sellingPrice)}</p>
                    </div>
                    <div className="rounded-[1rem] border border-border/70 bg-background-secondary/25 p-3">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">MRP</p>
                      <p className="mt-1 font-black text-text">{formatPrice(row.mrp)}</p>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <label className="flex items-center gap-3 rounded-[1.1rem] border border-rose-200 bg-rose-50/75 px-4 py-3 text-sm font-semibold text-text">
                      <input
                        type="checkbox"
                        checked={draft.exclusiveOffer}
                        onChange={(event) => updateDraft(row.id, { exclusiveOffer: event.target.checked })}
                        className="h-4 w-4 rounded border-border text-rose-500 focus:ring-rose-500"
                        disabled={!canManage}
                      />
                      Exclusive offer
                    </label>

                    <FormField label="Offer Percent" htmlFor={`offer-percent-${row.id}`} hint="Visible on the storefront exclusive offer cards.">
                      <Input
                        id={`offer-percent-${row.id}`}
                        value={draft.exclusiveOffer ? draft.percent : ""}
                        onChange={(event) => updateDraft(row.id, { percent: event.target.value.replace(/[^0-9.]/g, "") })}
                        placeholder="15"
                        disabled={!draft.exclusiveOffer || !canManage}
                      />
                    </FormField>

                    <div className="flex items-center justify-between gap-2 text-xs font-medium text-muted">
                      <span>{exclusivePercent}</span>
                      <span>{new Date(row.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button variant="accent" size="sm" onClick={() => void saveOffer(row)} disabled={saveDisabled}>
                      Save Offer
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const nextDraft = { exclusiveOffer: false, percent: "" };
                        updateDraft(row.id, nextDraft);
                        void saveOffer({ ...row, attributes: { ...(row.attributes ?? {}), exclusive_offer: false, exclusive_offer_percent: null } }, nextDraft);
                      }}
                      disabled={!canManage || savingId === row.id}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-8 text-center shadow-[var(--shadow-sm)]">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Sparkles className="h-9 w-9" aria-hidden="true" />
          </div>
          <h3 className="mt-5 text-2xl font-black text-text">No Exclusive Products Yet</h3>
          <p className="mt-2 text-sm font-medium text-muted">Create a product first, then mark it as exclusive and assign the offer percent here.</p>
          <Button asChild variant="accent" size="md" className="mt-6">
            <Link href="/admin/products">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Product
            </Link>
          </Button>
        </Card>
      )}
    </section>
  );
}

export { ExclusiveOffersAdminPage };
