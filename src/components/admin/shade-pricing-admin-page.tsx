"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Input, FormField } from "@/components/ui/input";
import { AdminSectionCard, PageHeader } from "@/components/admin/admin-kit";
import { useAuth } from "@/components/auth/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import { calculatePricingLine } from "@/lib/pricing-engine";
import { formatPrice } from "@/lib/utils";

type Product = {
  id: string;
  name: string;
  mrp: number | null;
  selling_price: number | null;
  gst_rate: number | null;
};
type Variant = {
  id: string;
  product_id: string;
  variant_name: string;
  shade_name_snapshot: string | null;
  pack_size: string | null;
  finish: string | null;
  base_price: number | null;
  shade_extra_price: number | null;
  adjustment_type: string | null;
  final_price: number | null;
};

type PricingRule = {
  id: string;
  product_id: string;
  product_variant_id: string | null;
  shade_id: string | null;
  colour_family: string | null;
  tone: string | null;
  depth: string | null;
  finish: string | null;
  pack_size: string | null;
  adjustment_type: "none" | "fixed" | "percentage";
  adjustment_value: number | null;
  override_price: number | null;
};

type Shade = {
  id: string;
  shade_name: string;
  shade_code: string;
};

export function ShadePricingAdminPage() {
  const searchParams = useSearchParams();
  const { role } = useAuth();
  const canManage = role === "admin" || role === "manager";
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [shades, setShades] = useState<Shade[]>([]);
  const [productId, setProductId] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    void Promise.all([
      client
        .from("products")
        .select("id, name, mrp, selling_price, gst_rate")
        .eq("status", "active")
        .is("deleted_at", null)
        .order("name"),
      client
        .from("product_variants")
        .select(
          "id, product_id, variant_name, shade_name_snapshot, pack_size, finish, base_price, shade_extra_price, adjustment_type, final_price",
        )
        .is("deleted_at", null)
        .order("created_at"),
      client
        .from("paint_pricing_rules")
        .select("id, product_id, product_variant_id, shade_id, colour_family, tone, depth, finish, pack_size, adjustment_type, adjustment_value, override_price")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false }),
      client
        .from("shades")
        .select("id, shade_name, shade_code")
        .is("deleted_at", null)
        .order("shade_name"),
    ]).then(([productResult, variantResult, ruleResult, shadeResult]) => {
      setProducts((productResult.data ?? []) as Product[]);
      setVariants((variantResult.data ?? []) as Variant[]);
      setRules((ruleResult.data ?? []) as PricingRule[]);
      setShades((shadeResult.data ?? []) as Shade[]);
    });
  }, []);
  const update = async (
    variant: Variant,
    field: "base_price" | "shade_extra_price" | "adjustment_type" | "final_price",
    value: string,
  ) => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    setSaving(variant.id);
    const next =
      field === "adjustment_type" ? value : value.trim() ? Number(value) : null;
    const payload =
      field === "final_price" && next !== null
        ? {
            final_price: next,
            base_price: next,
            shade_extra_price: 0,
            adjustment_type: "none",
          }
        : { [field]: next };
    const { error } = await client
      .from("product_variants")
      .update(payload as never)
      .eq("id", variant.id);
    setSaving(null);
    if (error) {
      toast({
        title: "Pricing not saved",
        description: error.message,
        variant: "danger",
      });
      return;
    }
    setVariants((current) =>
      current.map((row) =>
        row.id === variant.id ? ({ ...row, ...payload } as Variant) : row,
      ),
    );
  };
  const visible = variants.filter(
    (variant) =>
      (!productId || variant.product_id === productId) &&
      (variant.shade_name_snapshot || variant.pack_size || variant.finish),
  );
  const productById = new Map(products.map((product) => [product.id, product]));
  const shadeById = new Map(shades.map((shade) => [shade.id, shade]));
  const selectedShadeId = searchParams.get("shadeId") ?? "";
  const selectedShade = selectedShadeId ? shadeById.get(selectedShadeId) : null;
  const visibleRules = rules.filter(
    (rule) =>
      (!productId || rule.product_id === productId) &&
      (!selectedShadeId || rule.shade_id === selectedShadeId),
  );
  return (
    <section className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Shade Pricing" }]}
        title="Shade pricing"
        subtitle="Configure variant base prices, adjustments, and specific overrides."
      />
      <AdminSectionCard
        title="Pricing matrix"
        description="Product base SP remains separate from the selected shade adjustment. Checkout uses the selected shade rule and the same GST calculation."
      >
        <div className="mb-4 max-w-xl">
          <FormField label="Paint product" htmlFor="pricing-product">
            <select
              id="pricing-product"
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
              className="border-border bg-background text-text h-11 w-full rounded-[var(--radius-md)] border px-3.5 text-sm font-medium"
            >
              <option value="">All products</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        {selectedShade ? (
          <div className="mb-5 rounded-xl border border-accent/20 bg-accent/5 p-4">
            <p className="text-text font-bold">Selected shade pricing</p>
            <p className="text-muted mt-1 text-sm font-medium">
              {selectedShade.shade_name} · {selectedShade.shade_code}
            </p>
            {visibleRules.length > 0 ? (
              <div className="mt-3 space-y-2">
                {visibleRules.map((rule) => (
                  <div key={rule.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 bg-white px-3 py-2 text-sm">
                    <span className="text-muted">
                      {productById.get(rule.product_id)?.name ?? "Product"}
                      {rule.finish ? ` · ${rule.finish}` : ""}
                      {rule.pack_size ? ` · ${rule.pack_size}` : ""}
                    </span>
                    <span className="text-text font-bold">
                      {rule.override_price !== null
                        ? `Override ${formatPrice(rule.override_price)}`
                        : rule.adjustment_type === "percentage"
                          ? `+${rule.adjustment_value ?? 0}%`
                          : rule.adjustment_type === "none"
                            ? "+₹0"
                            : `+${formatPrice(rule.adjustment_value ?? 0)}`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted mt-3 text-sm font-medium">No shade-specific rule is configured. The selected shade currently adds ₹0.</p>
            )}
          </div>
        ) : null}
        <div className="space-y-3">
          {visible.map((variant) => {
            const product = productById.get(variant.product_id);
            const line = calculatePricingLine({
              mrp: product?.mrp ?? 0,
              sellingPrice:
                variant.base_price ?? variant.final_price ?? product?.selling_price ?? 0,
              shadeExtraPrice: variant.shade_extra_price,
              adjustmentType:
                (variant.adjustment_type as "none" | "fixed" | "percentage" | null) ??
                "none",
              gstRate: product?.gst_rate ?? 18,
              quantity: 1,
            });
            return (
              <div
                key={variant.id}
                className="border-border/70 grid gap-3 rounded-xl border bg-white p-4 lg:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))]"
              >
                <div>
                  <p className="text-text font-bold">
                    {variant.shade_name_snapshot || variant.variant_name}
                  </p>
                  <p className="text-muted text-xs font-medium">
                    {variant.finish || "Any finish"} · {variant.pack_size || "Any size"}
                  </p>
                  <p className="text-muted mt-2 text-xs font-semibold">
                    Product base SP {formatPrice(line.sellingPrice)} · Shade adjustment {formatPrice(line.shadeExtra)}
                  </p>
                  <p className="text-text text-xs font-semibold">
                    Taxable {formatPrice(line.taxableLineValue)} · GST{" "}
                    {formatPrice(line.gstAmount)} · Total {formatPrice(line.lineTotal)}
                  </p>
                </div>
                <Input
                  aria-label="Base price"
                  value={String(variant.base_price ?? "")}
                  onChange={(event) =>
                    void update(variant, "base_price", event.target.value)
                  }
                  placeholder="Base ₹"
                  disabled={!canManage || saving === variant.id}
                />
                <Input
                  aria-label="Shade adjustment"
                  value={String(variant.shade_extra_price ?? "")}
                  onChange={(event) =>
                    void update(variant, "shade_extra_price", event.target.value)
                  }
                  placeholder="Adjustment"
                  disabled={!canManage || saving === variant.id}
                />
                <select
                  aria-label="Adjustment type"
                  value={variant.adjustment_type || "fixed"}
                  onChange={(event) =>
                    void update(variant, "adjustment_type", event.target.value)
                  }
                  className="border-border bg-background h-11 rounded-[var(--radius-md)] border px-3 text-sm"
                  disabled={!canManage || saving === variant.id}
                >
                  <option value="fixed">Fixed</option>
                  <option value="percentage">Percent</option>
                  <option value="none">None</option>
                </select>
                <Input
                  aria-label="Specific override"
                  value={String(variant.final_price ?? "")}
                  onChange={(event) =>
                    void update(variant, "final_price", event.target.value)
                  }
                  placeholder="Override ₹"
                  disabled={!canManage || saving === variant.id}
                />
              </div>
            );
          })}
        </div>
        {visible.length === 0 ? (
          <p className="border-border text-muted rounded-xl border border-dashed p-6 text-sm font-medium">
            Choose a product with paint variants to manage pricing.
          </p>
        ) : null}
      </AdminSectionCard>
    </section>
  );
}
