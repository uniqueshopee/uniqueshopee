"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField, Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminActionButton, AdminSectionCard, AdminStatusBadge, PageHeader } from "@/components/admin/admin-kit";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { ArrowRight, History, RefreshCcw, Search, SlidersHorizontal, Warehouse } from "lucide-react";

type InventoryRecord = {
  id: string;
  product_variant_id: string;
  current_quantity: number | string;
  reserved_quantity: number | string;
  low_stock_threshold: number | string;
  stock_status: string;
  warehouse_location: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at?: string;
};

type ProductRecord = {
  id: string;
  name: string;
  sku: string;
  status: string;
  deleted_at: string | null;
};

type VariantRecord = {
  id: string;
  product_id: string;
  sku: string;
  variant_name: string | null;
  option_label: string | null;
  option_value: string | null;
  is_default: boolean;
  deleted_at: string | null;
};

type InventorySummary = {
  inventory: InventoryRecord;
  product?: ProductRecord;
  variant?: VariantRecord;
  productName: string;
  variantLabel: string;
  sku: string;
  stock: number;
  reserved: number;
  threshold: number;
  derivedStatus: string;
  warehouse: string;
};

type InventoryFormState = {
  currentQuantity: string;
  reservedQuantity: string;
  lowStockThreshold: string;
};

type InventoryStatusFilter = "all" | "healthy" | "low stock" | "out of stock" | "needs review";
type BadgeVariant = "neutral" | "accent" | "success" | "warning" | "danger";

const PAGE_SIZE = 10;

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function deriveInventoryStatus(stock: number, reserved: number, threshold: number) {
  if (stock <= 0) {
    return "out of stock";
  }
  if (reserved > stock) {
    return "needs review";
  }
  if (stock <= threshold) {
    return "low stock";
  }
  return "healthy";
}

function statusTone(status: string) {
  switch (status) {
    case "healthy":
      return "success" as BadgeVariant;
    case "low stock":
      return "warning" as BadgeVariant;
    case "out of stock":
    case "needs review":
      return "danger" as BadgeVariant;
    default:
      return "neutral" as BadgeVariant;
  }
}

function buildInventoryLabel(summary: InventorySummary) {
  if (summary.stock <= 0) return "Out of stock";
  if (summary.stock <= summary.threshold) {
    return summary.stock === 1 ? "Only 1 left" : `Only ${summary.stock} left`;
  }
  return "In stock";
}

function InventoryEmptyState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="rounded-[1.5rem] border-white/80 bg-white/92 p-6 text-center shadow-[var(--shadow-lg)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-background-secondary">
        <Warehouse className="h-6 w-6 text-muted" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-lg font-bold text-text">No inventory rows found</h3>
      <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-muted">
        Inventory will appear here once products and variants have stock rows in Supabase.
      </p>
      <Button type="button" variant="outline" size="md" onClick={onRetry} className="mt-5">
        Retry
      </Button>
    </Card>
  );
}

function InventoryLoadingState() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="rounded-[1.35rem] border-white/80 bg-white/92 p-4 shadow-[var(--shadow-sm)]">
          <div className="grid gap-3 md:grid-cols-[1.6fr_0.7fr_0.7fr_0.8fr_0.9fr]">
            {Array.from({ length: 5 }).map((__, cell) => (
              <Skeleton key={cell} className="h-10 rounded-[1rem]" />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

export function InventoryAdminLivePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [inventoryRows, setInventoryRows] = useState<InventoryRecord[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [variants, setVariants] = useState<VariantRecord[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<InventoryStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeRow, setActiveRow] = useState<InventorySummary | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<InventoryFormState>({
    currentQuantity: "0",
    reservedQuantity: "0",
    lowStockThreshold: "10",
  });

  const loadInventory = async () => {
    setIsLoading(true);
    setLoadError(null);

    const client = getSupabaseBrowserClient();
    if (!client) {
      setLoadError("Supabase is not configured for this environment.");
      setIsLoading(false);
      return;
    }

      const [inventoryResult, productResult, variantResult] = await Promise.all([
        client
          .from("inventory")
          .select("id, product_variant_id, current_quantity, reserved_quantity, low_stock_threshold, stock_status, warehouse_location, deleted_at, created_at, updated_at")
          .is("deleted_at", null)
          .order("updated_at", { ascending: false }),
      client.from("products").select("id, name, sku, status, deleted_at").is("deleted_at", null).order("updated_at", { ascending: false }),
        client
          .from("product_variants")
          .select("id, product_id, sku, variant_name, option_label, option_value, is_default, deleted_at")
          .is("deleted_at", null)
          .order("created_at", { ascending: true }),
      ]);

    if (inventoryResult.error) setLoadError(inventoryResult.error.message);
    else setInventoryRows((inventoryResult.data ?? []) as InventoryRecord[]);
    if (productResult.error) setLoadError(productResult.error.message);
    else setProducts((productResult.data ?? []) as ProductRecord[]);
    if (variantResult.error) setLoadError(variantResult.error.message);
    else setVariants((variantResult.data ?? []) as VariantRecord[]);

    setIsLoading(false);
  };

  useEffect(() => {
    void loadInventory();
  }, []);

  const summaries = useMemo<InventorySummary[]>(() => {
    const productById = new Map(products.map((product) => [product.id, product]));
    const variantById = new Map(variants.map((variant) => [variant.id, variant]));

    return inventoryRows.map((inventory) => {
      const variant = variantById.get(inventory.product_variant_id);
      const product = variant ? productById.get(variant.product_id) : undefined;
      const stock = toNumber(inventory.current_quantity);
      const reserved = toNumber(inventory.reserved_quantity);
      const threshold = toNumber(inventory.low_stock_threshold, 10);
      const derivedStatus = deriveInventoryStatus(stock, reserved, threshold);

      return {
        inventory,
        product,
        variant,
        productName: product?.name ?? "Unknown product",
        variantLabel: variant?.option_label || variant?.option_value || variant?.variant_name || (variant?.is_default ? "Default" : "Variant"),
        sku: variant?.sku ?? product?.sku ?? inventory.product_variant_id.slice(0, 8),
        stock,
        reserved,
        threshold,
        derivedStatus,
        warehouse: inventory.warehouse_location ?? "Main warehouse",
      };
    });
  }, [inventoryRows, products, variants]);

  const filteredSummaries = useMemo(() => {
    const term = query.trim().toLowerCase();

    return summaries.filter((summary) => {
      const matchesTerm =
        !term ||
        summary.productName.toLowerCase().includes(term) ||
        summary.variantLabel.toLowerCase().includes(term) ||
        summary.sku.toLowerCase().includes(term) ||
        summary.derivedStatus.toLowerCase().includes(term) ||
        summary.warehouse.toLowerCase().includes(term);
      const matchesFilter = statusFilter === "all" || summary.derivedStatus === statusFilter;
      return matchesTerm && matchesFilter;
    });
  }, [query, statusFilter, summaries]);

  const totalPages = Math.max(1, Math.ceil(filteredSummaries.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedSummaries = filteredSummaries.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const selectedCount = selectedIds.length;

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => filteredSummaries.some((row) => row.inventory.id === id)));
  }, [filteredSummaries]);

  const openSingleEditor = (summary: InventorySummary) => {
    setActiveRow(summary);
    setForm({
      currentQuantity: String(summary.stock),
      reservedQuantity: String(summary.reserved),
      lowStockThreshold: String(summary.threshold),
    });
    setBulkOpen(false);
  };

  const persistRows = async (rows: InventorySummary[], nextValues: InventoryFormState) => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      toast({ title: "Supabase unavailable", description: "Inventory changes cannot be saved right now.", variant: "danger" });
      return;
    }

    const stock = Math.max(0, toNumber(nextValues.currentQuantity));
    const reserved = Math.max(0, toNumber(nextValues.reservedQuantity));
    const threshold = Math.max(0, toNumber(nextValues.lowStockThreshold, 10));

    if (reserved > stock) {
      toast({ title: "Validation failed", description: "Reserved quantity cannot exceed stock.", variant: "danger" });
      return;
    }

    setSaving(true);
    try {
      for (const row of rows) {
        const derivedStatus = deriveInventoryStatus(stock, reserved, threshold);
        const { error } = await client
          .from("inventory")
          .update({
            current_quantity: stock,
            reserved_quantity: reserved,
            low_stock_threshold: threshold,
            stock_status: derivedStatus,
          })
          .eq("id", row.inventory.id);
        if (error) throw error;
      }

      toast({
        title: rows.length > 1 ? "Inventory updated" : "Inventory saved",
        description: rows.length > 1 ? `${rows.length} rows were synced with Supabase.` : `${rows[0]?.productName ?? "Inventory row"} updated successfully.`,
        variant: "success",
      });
      setActiveRow(null);
      setBulkOpen(false);
      setSelectedIds([]);
      await loadInventory();
    } catch (error) {
      toast({
        title: "Inventory update failed",
        description: error instanceof Error ? error.message : "Something went wrong while saving inventory.",
        variant: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Inventory" }]}
        title="Inventory"
        subtitle="Track live stock, reserved quantities, low stock thresholds, and stock status from Supabase."
        actions={
          <>
            <AdminActionButton variant="outline" onClick={() => void loadInventory()}>
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </AdminActionButton>
            <AdminActionButton variant="accent" onClick={() => setBulkOpen(true)} disabled={selectedCount === 0}>
              <SlidersHorizontal className="h-4 w-4" />
              Bulk Update {selectedCount > 0 ? `(${selectedCount})` : ""}
            </AdminActionButton>
          </>
        }
      />

      <AdminSectionCard
        title="Live Inventory"
        description="Search the live inventory list, filter by stock status, and update quantities without leaving the admin console."
      >
        <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_14rem]">
          <label className="relative block">
            <span className="sr-only">Search inventory</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search product, SKU, variant, or warehouse..."
              className="h-12 rounded-full border-border/80 bg-white/90 pl-11 shadow-[var(--shadow-sm)]"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Stock filter</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as InventoryStatusFilter)}
              className="h-12 rounded-full border border-border/80 bg-white/90 px-4 text-sm font-semibold text-text shadow-[var(--shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value="all">All status</option>
              <option value="healthy">Healthy</option>
              <option value="low stock">Low stock</option>
              <option value="out of stock">Out of stock</option>
              <option value="needs review">Needs review</option>
            </select>
          </label>
        </div>

        {loadError ? (
          <Card className="rounded-[1.35rem] border-danger/15 bg-danger/5 p-5">
            <p className="text-sm font-semibold text-danger">{loadError}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadInventory()} className="mt-4">
              Retry
            </Button>
          </Card>
        ) : isLoading ? (
          <InventoryLoadingState />
        ) : filteredSummaries.length === 0 ? (
          <InventoryEmptyState onRetry={() => void loadInventory()} />
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[1.2rem] border border-border/70">
              <table className="min-w-full divide-y divide-border/70">
                <thead className="bg-background-secondary/35">
                  <tr className="text-left text-xs font-bold uppercase tracking-[0.18em] text-muted">
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label="Select visible inventory rows"
                        checked={paginatedSummaries.length > 0 && paginatedSummaries.every((row) => selectedIds.includes(row.inventory.id))}
                        onChange={(event) => {
                          const ids = event.target.checked ? paginatedSummaries.map((row) => row.inventory.id) : [];
                          setSelectedIds((current) =>
                            event.target.checked
                              ? Array.from(new Set([...current, ...ids]))
                              : current.filter((id) => !ids.includes(id)),
                          );
                        }}
                        className="h-4 w-4 rounded border-border accent-[color:var(--color-accent)]"
                      />
                    </th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">Reserved</th>
                    <th className="px-4 py-3">Threshold</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70 bg-white/80">
                  {paginatedSummaries.map((row) => {
                    const isSelected = selectedIds.includes(row.inventory.id);
                    const stockLabel = buildInventoryLabel(row);

                    return (
                      <tr key={row.inventory.id} className={cn(isSelected && "bg-accent/5")}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            aria-label={`Select ${row.productName}`}
                            checked={isSelected}
                            onChange={(event) => {
                              setSelectedIds((current) =>
                                event.target.checked
                                  ? [...current, row.inventory.id]
                                  : current.filter((id) => id !== row.inventory.id),
                              );
                            }}
                            className="h-4 w-4 rounded border-border accent-[color:var(--color-accent)]"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-text">{row.productName}</p>
                            <p className="text-xs font-medium text-muted">{row.variantLabel}</p>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{row.warehouse}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-muted">{row.sku}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-text">{row.stock}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-text">{row.reserved}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-text">{row.threshold}</td>
                        <td className="px-4 py-3 space-y-2">
                          <AdminStatusBadge status={row.derivedStatus} />
                          <Badge variant={statusTone(row.derivedStatus)}>{stockLabel}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => openSingleEditor(row)}>
                              Adjust Quantity
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => toast({ title: "Inventory history", description: "No stock history table exists in the current schema yet.", variant: "warning" })}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredSummaries.length > 1 && totalPages > 1 && (
              <div className="flex flex-col gap-3 rounded-[1.35rem] border border-border/70 bg-white/85 px-4 py-4 shadow-[var(--shadow-sm)] sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-muted">
                  Page {safePage} of {totalPages}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={safePage === 1}>
                    Prev
                  </Button>
                  {Array.from({ length: totalPages }).map((_, index) => {
                    const value = index + 1;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setPage(value)}
                        aria-current={value === safePage ? "page" : undefined}
                        className={cn(
                          "flex h-10 min-w-10 items-center justify-center rounded-full border px-3 text-sm font-semibold transition-all",
                          value === safePage ? "border-accent/20 bg-accent/10 text-accent" : "border-border/70 bg-white/80 text-text hover:border-accent/20 hover:bg-white",
                        )}
                      >
                        {value}
                      </button>
                    );
                  })}
                  <Button type="button" variant="outline" size="sm" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={safePage === totalPages}>
                    Next
                  </Button>
                </div>
              </div>
            )}

            <AdminSectionCard title="Inventory History" description="Stock history is not defined in the current schema.">
              <Card className="rounded-[1.2rem] border-dashed border-border/70 bg-background-secondary/25 p-4">
                <p className="text-sm font-bold text-text">No stock history table yet</p>
                <p className="mt-2 text-sm font-medium leading-6 text-muted">
                  The current Supabase schema tracks live quantities, but it does not include a history table for stock audits. Add a dedicated history table later to enable this section.
                </p>
              </Card>
            </AdminSectionCard>
          </div>
        )}
      </AdminSectionCard>

      <Modal
        open={Boolean(activeRow)}
        onOpenChange={(open) => {
          if (!open) setActiveRow(null);
        }}
        title={activeRow ? `Adjust inventory: ${activeRow.productName}` : "Adjust inventory"}
        description="Update stock, reserved quantity, and low stock threshold."
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Current Quantity" htmlFor="inventory-current">
              <Input id="inventory-current" type="number" min="0" value={form.currentQuantity} onChange={(event) => setForm((current) => ({ ...current, currentQuantity: event.target.value }))} />
            </FormField>
            <FormField label="Reserved Quantity" htmlFor="inventory-reserved">
              <Input id="inventory-reserved" type="number" min="0" value={form.reservedQuantity} onChange={(event) => setForm((current) => ({ ...current, reservedQuantity: event.target.value }))} />
            </FormField>
            <FormField label="Low Stock Threshold" htmlFor="inventory-threshold">
              <Input id="inventory-threshold" type="number" min="0" value={form.lowStockThreshold} onChange={(event) => setForm((current) => ({ ...current, lowStockThreshold: event.target.value }))} />
            </FormField>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={() => setActiveRow(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (activeRow) {
                  void persistRows([activeRow], form);
                }
              }}
              disabled={saving}
            >
              Save Inventory
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title="Bulk stock update"
        description="Apply the same stock values to all selected rows."
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Current Quantity" htmlFor="bulk-current">
              <Input id="bulk-current" type="number" min="0" value={form.currentQuantity} onChange={(event) => setForm((current) => ({ ...current, currentQuantity: event.target.value }))} />
            </FormField>
            <FormField label="Reserved Quantity" htmlFor="bulk-reserved">
              <Input id="bulk-reserved" type="number" min="0" value={form.reservedQuantity} onChange={(event) => setForm((current) => ({ ...current, reservedQuantity: event.target.value }))} />
            </FormField>
            <FormField label="Low Stock Threshold" htmlFor="bulk-threshold">
              <Input id="bulk-threshold" type="number" min="0" value={form.lowStockThreshold} onChange={(event) => setForm((current) => ({ ...current, lowStockThreshold: event.target.value }))} />
            </FormField>
          </div>

          <div className="rounded-[1rem] border border-border/70 bg-background-secondary/35 p-4 text-sm font-medium text-muted">
            {selectedCount} selected row{selectedCount === 1 ? "" : "s"} will be updated together.
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={() => setBulkOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                const rows = summaries.filter((summary) => selectedIds.includes(summary.inventory.id));
                if (rows.length > 0) {
                  void persistRows(rows, form);
                }
              }}
              disabled={saving || selectedCount === 0}
            >
              Apply to selected
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
