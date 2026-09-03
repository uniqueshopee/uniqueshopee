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
  department_id: string;
  name: string;
  mrp: number | null;
  selling_price: number | null;
  gst_rate: number | null;
};
type Variant = {
  id: string;
  product_id: string;
  variant_name: string;
  shade_id: string | null;
  shade_name_snapshot: string | null;
  pack_size: string | null;
  finish: string | null;
  base_price: number | null;
  selling_price_override: number | null;
  shade_extra_price: number | null;
  adjustment_type: string | null;
  final_price: number | null;
};

type AssignedShade = {
  id: string;
  shade_name: string;
  shade_code: string;
  color_family: string | null;
  hex_color: string | null;
  is_active: boolean | null;
  deleted_at: string | null;
};

type ProductShade = {
  product_id: string;
  shade_id: string;
  finish: string | null;
  is_available: boolean | null;
  shades: AssignedShade | AssignedShade[] | null;
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
  is_active: boolean;
};

export function ShadePricingAdminPage() {
  const searchParams = useSearchParams();
  const { role } = useAuth();
  const canManage = role === "admin" || role === "manager";
  const [products, setProducts] = useState<Product[]>([]);
  const [paintDepartmentIds, setPaintDepartmentIds] = useState<Set<string>>(new Set());
  const [variants, setVariants] = useState<Variant[]>([]);
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [productShades, setProductShades] = useState<ProductShade[]>([]);
  const [productShadeLoadError, setProductShadeLoadError] = useState("");
  const [productId, setProductId] = useState("");
  const [selectedShadeId, setSelectedShadeId] = useState(searchParams.get("shadeId") ?? "");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [selectedColour, setSelectedColour] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<"none" | "fixed" | "percentage">("fixed");
  const [adjustmentValue, setAdjustmentValue] = useState("");
  const [ruleActive, setRuleActive] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      setProductShadeLoadError("Unable to load assigned colours for this product.");
      return;
    }
    void Promise.all([
      client
        .from("departments")
        .select("id")
        .eq("slug", "paints")
        .is("deleted_at", null),
      client
        .from("products")
        .select("id, department_id, name, mrp, selling_price, gst_rate")
        .eq("status", "active")
        .is("deleted_at", null)
        .order("name"),
      client
        .from("product_variants")
        .select(
          "id, product_id, variant_name, shade_id, shade_name_snapshot, pack_size, finish, base_price, selling_price_override, shade_extra_price, adjustment_type, final_price",
        )
        .is("deleted_at", null)
        .order("created_at"),
      client
        .from("paint_pricing_rules")
        .select("id, product_id, product_variant_id, shade_id, colour_family, tone, depth, finish, pack_size, adjustment_type, adjustment_value, override_price, is_active")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false }),
    ]).then(([departmentResult, productResult, variantResult, ruleResult]) => {
      setPaintDepartmentIds(
        new Set(((departmentResult.data ?? []) as Array<{ id: string }>).map((row) => row.id)),
      );
      setProducts((productResult.data ?? []) as Product[]);
      setVariants((variantResult.data ?? []) as Variant[]);
      setRules((ruleResult.data ?? []) as PricingRule[]);
    });
  }, []);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client || !productId) {
      setProductShades([]);
      setProductShadeLoadError("");
      return;
    }
    let active = true;
    setProductShades([]);
    setProductShadeLoadError("");
    void (async () => {
      const loadedProductShades: ProductShade[] = [];
      for (let offset = 0; ; offset += 1000) {
        const result = await client
          .from("product_shades")
          .select("product_id, shade_id, finish, is_available, shades!inner(id, shade_name, shade_code, color_family, hex_color, is_active, deleted_at)")
          .eq("product_id", productId)
          .eq("is_available", true)
          .is("deleted_at", null)
          .range(offset, offset + 999);
        if (!active) return;
        const page = (result.data ?? []) as unknown as ProductShade[];
        if (result.error) {
          setProductShadeLoadError("Unable to load assigned colours for this product.");
          setProductShades([]);
          if (process.env.NODE_ENV !== "production") {
            console.debug("[ShadePricingAdmin] product shade query failed", {
              query: "product_shades with shades!inner relationship",
              productId,
              error: result.error.message,
              returnedRowCount: page.length,
            });
          }
          return;
        }
        loadedProductShades.push(...page);
        if (!result.data || result.data.length < 1000) break;
      }
      if (!active) return;
      setProductShades(loadedProductShades);
      if (process.env.NODE_ENV !== "production") {
        console.debug("[ShadePricingAdmin] product shade query succeeded", {
          query: "product_shades with shades!inner relationship",
          productId,
          returnedRowCount: loadedProductShades.length,
        });
      }
    })();
    return () => {
      active = false;
    };
  }, [productId]);

  useEffect(() => {
    if (!selectedShadeId || !productId) return;
    const existing = rules.find(
      (rule) =>
        rule.product_id === productId &&
        rule.shade_id === selectedShadeId &&
        rule.product_variant_id === (selectedVariantId || null),
    ) ?? rules.find(
      (rule) => rule.product_id === productId && rule.shade_id === selectedShadeId,
    );
    if (!existing) {
      setAdjustmentType("fixed");
      setAdjustmentValue("");
      setRuleActive(true);
      return;
    }
    setAdjustmentType(existing.adjustment_type);
    setAdjustmentValue(String(existing.adjustment_value ?? ""));
    setRuleActive(existing.is_active);
  }, [productId, rules, selectedShadeId, selectedVariantId]);

  const saveShadeRule = async () => {
    if (!canManage || !productId || !selectedVariantId || !selectedColour || !selectedShadeId) return;
    if (!productShades.some((mapping) => mapping.product_id === productId && mapping.shade_id === selectedShadeId && (!mapping.finish || !selectedVariant?.finish || mapping.finish.trim().toLowerCase() === selectedVariant.finish.trim().toLowerCase()))) {
      toast({ title: "Pricing not saved", description: "Choose a shade assigned to this product.", variant: "danger" });
      return;
    }
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const variant = variants.find((row) => row.id === selectedVariantId);
    const parsedValue = adjustmentValue.trim() ? Number(adjustmentValue) : 0;
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      toast({ title: "Pricing not saved", description: "Enter a valid non-negative adjustment.", variant: "danger" });
      return;
    }
    setSaving(`shade:${selectedShadeId}`);
    const payload = {
      product_id: productId,
      product_variant_id: variant?.id ?? null,
      shade_id: selectedShadeId,
      colour_family: null,
      tone: null,
      depth: null,
      finish: variant?.finish ?? null,
      pack_size: variant?.pack_size ?? null,
      adjustment_type: adjustmentType,
      adjustment_value: parsedValue,
      override_price: null,
      priority: 0,
      is_active: ruleActive,
    };
    const existing = rules.find(
      (rule) =>
        rule.product_id === productId &&
        rule.shade_id === selectedShadeId &&
        rule.product_variant_id === (variant?.id ?? null) &&
        rule.finish === payload.finish &&
        rule.pack_size === payload.pack_size,
    );
    const result = existing
      ? await client.from("paint_pricing_rules").update(payload).eq("id", existing.id)
      : await client.from("paint_pricing_rules").insert(payload);
    setSaving(null);
    if (result.error) {
      toast({ title: "Pricing not saved", description: result.error.message, variant: "danger" });
      return;
    }
    const { data: refreshed } = await client
      .from("paint_pricing_rules")
      .select("id, product_id, product_variant_id, shade_id, colour_family, tone, depth, finish, pack_size, adjustment_type, adjustment_value, override_price, is_active")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });
    setRules((refreshed ?? []) as PricingRule[]);
    toast({ title: "Shade pricing saved", description: "The selected shade now uses this adjustment.", variant: "success" });
  };
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
  const paintProducts = products.filter((product) => paintDepartmentIds.has(product.department_id));
  const visible = variants.filter(
    (variant) =>
      paintProducts.some((product) => product.id === variant.product_id) &&
      (!productId || variant.product_id === productId) &&
      (variant.shade_name_snapshot || variant.pack_size || variant.finish),
  );
  const productById = new Map(paintProducts.map((product) => [product.id, product]));
  const visibleRules = rules.filter(
    (rule) =>
      (!productId || rule.product_id === productId) &&
      (!selectedShadeId || rule.shade_id === selectedShadeId),
  );
  const productVariants = variants.filter((variant) => paintProducts.some((product) => product.id === variant.product_id) && (!productId || variant.product_id === productId));
  const selectedVariant = productVariants.find((variant) => variant.id === selectedVariantId);
  const selectedProduct = productById.get(productId);
  const matchingProductShades = productShades.filter((mapping) => {
    if (!productId || mapping.product_id !== productId || !selectedVariant || mapping.is_available === false) return false;
    const assignedShade = Array.isArray(mapping.shades) ? mapping.shades[0] : mapping.shades;
    if (!assignedShade || assignedShade.is_active === false || assignedShade.deleted_at !== null) return false;
    if (selectedVariant.shade_id && mapping.shade_id !== selectedVariant.shade_id) return false;
    return !mapping.finish || !selectedVariant.finish || mapping.finish.trim().toLowerCase() === selectedVariant.finish.trim().toLowerCase();
  });
  const selectableShades = matchingProductShades
    .map((mapping) => (Array.isArray(mapping.shades) ? mapping.shades[0] : mapping.shades))
    .filter((shade): shade is AssignedShade => Boolean(shade && shade.is_active !== false && shade.deleted_at === null))
    .filter((shade, index, allShades) => allShades.findIndex((candidate) => candidate.id === shade.id) === index)
    .map((shade) => ({
      id: shade.id,
      shade_name: shade.shade_name,
      shade_code: shade.shade_code,
      color_family: shade.color_family,
      hex_color: shade.hex_color,
    }));
  const selectableColours = Array.from(
    new Map(
      selectableShades
        .filter((shade) => shade.color_family?.trim())
        .map((shade) => [shade.color_family!.trim().toLowerCase(), shade.color_family!.trim()] as const),
    ).values(),
  );
  const colourShades = selectedColour
    ? selectableShades.filter((shade) => shade.color_family?.trim().toLowerCase() === selectedColour.trim().toLowerCase())
    : [];
  const selectedShade = selectedShadeId
    ? selectableShades.find((shade) => shade.id === selectedShadeId)
    : null;
  const selectedProductMappings = productShades.filter((mapping) => mapping.product_id === productId);
  const missingJoinedShadeCount = selectedProductMappings.filter((mapping) => {
    const assignedShade = Array.isArray(mapping.shades) ? mapping.shades[0] : mapping.shades;
    return !assignedShade;
  }).length;
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && productId) {
      console.debug("[ShadePricingAdmin] selected product shade state", {
        productId,
        variantId: selectedVariantId || null,
        error: productShadeLoadError || null,
        returnedRowCount: selectedProductMappings.length,
        joinedShadeCount: selectedProductMappings.length - missingJoinedShadeCount,
      });
    }
  }, [missingJoinedShadeCount, productId, productShadeLoadError, selectedProductMappings.length, selectedVariantId]);
  const basePrice =
    selectedVariant?.base_price ??
    selectedVariant?.selling_price_override ??
    selectedProduct?.selling_price ??
    0;
  const previewAdjustment =
    adjustmentType === "percentage"
      ? Math.round((basePrice * (Number(adjustmentValue) || 0) / 100) * 100) / 100
      : adjustmentType === "none"
        ? 0
        : Number(adjustmentValue) || 0;
  const previewTaxable = basePrice + previewAdjustment;
  const previewGst = Math.round((previewTaxable * (selectedProduct?.gst_rate ?? 18) / 100) * 100) / 100;
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
              onChange={(event) => {
                setProductId(event.target.value);
                setSelectedShadeId("");
                setSelectedVariantId("");
                setSelectedColour("");
              }}
              className="border-border bg-background text-text h-11 w-full rounded-[var(--radius-md)] border px-3.5 text-sm font-medium"
            >
              <option value="">All products</option>
              {paintProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <div className="mb-5 rounded-xl border border-accent/20 bg-accent/5 p-4">
          <p className="text-text font-bold">Configure a shade-specific rule</p>
          <p className="text-muted mt-1 text-sm font-medium">
            Rules apply only to the selected product, variant configuration, and individual shade.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <FormField label="Finish / pack variant" htmlFor="pricing-variant">
              <select
                id="pricing-variant"
                value={selectedVariantId}
                onChange={(event) => {
                  setSelectedVariantId(event.target.value);
                  setSelectedColour("");
                  setSelectedShadeId("");
                }}
                className="border-border bg-background text-text h-11 w-full rounded-[var(--radius-md)] border px-3 text-sm font-medium"
                disabled={!productId}
              >
                <option value="">Choose a variant</option>
                {productVariants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.finish || "Any finish"} · {variant.pack_size || "Any size"} · {variant.variant_name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Colour" htmlFor="pricing-colour">
              <select
                id="pricing-colour"
                value={selectedColour}
                onChange={(event) => {
                  setSelectedColour(event.target.value);
                  setSelectedShadeId("");
                }}
                className="border-border bg-background text-text h-11 w-full rounded-[var(--radius-md)] border px-3 text-sm font-medium"
                disabled={!selectedVariantId}
              >
                <option value="">Choose a colour</option>
                {selectableColours.map((colour) => (
                  <option key={colour} value={colour}>{colour}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Individual shade" htmlFor="pricing-shade">
              <select
                id="pricing-shade"
                value={selectedShadeId}
                onChange={(event) => setSelectedShadeId(event.target.value)}
                className="border-border bg-background text-text h-11 w-full rounded-[var(--radius-md)] border px-3 text-sm font-medium"
                disabled={!selectedColour}
              >
                <option value="">Choose a shade</option>
                {colourShades.map((shade) => (
                  <option key={shade.id} value={shade.id}>
                    {shade.shade_name} · {shade.shade_code}
                  </option>
                ))}
              </select>
            </FormField>
            {selectedColour && colourShades.length === 0 ? (
              <p className="text-muted self-end text-sm font-medium">No shades available for this colour.</p>
            ) : null}
            {!productShadeLoadError && productId && selectedProductMappings.length === 0 ? (
              <p className="text-muted self-end text-sm font-medium">No assigned colours for this product.</p>
            ) : null}
            {productShadeLoadError ? (
              <p className="text-danger self-end text-sm font-medium">{productShadeLoadError}</p>
            ) : null}
            {!productShadeLoadError && productId && selectedProductMappings.length > 0 && missingJoinedShadeCount > 0 ? (
              <p className="text-danger self-end text-sm font-medium">Some assigned shades could not be loaded from the shade catalogue.</p>
            ) : null}
            <FormField label="Adjustment type" htmlFor="pricing-rule-type">
              <select
                id="pricing-rule-type"
                value={adjustmentType}
                onChange={(event) => setAdjustmentType(event.target.value as "none" | "fixed" | "percentage")}
                className="border-border bg-background text-text h-11 w-full rounded-[var(--radius-md)] border px-3 text-sm font-medium"
                disabled={!canManage || !productId || !selectedVariantId || !selectedColour || !selectedShadeId}
              >
                <option value="fixed">Fixed amount</option>
                <option value="percentage">Percentage</option>
                <option value="none">No adjustment</option>
              </select>
            </FormField>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <FormField label="Adjustment value" htmlFor="pricing-rule-value">
              <Input
                id="pricing-rule-value"
                value={adjustmentValue}
                onChange={(event) => setAdjustmentValue(event.target.value)}
                placeholder={adjustmentType === "percentage" ? "Percent" : "Amount"}
                inputMode="decimal"
                disabled={!canManage || !productId || !selectedVariantId || !selectedColour || !selectedShadeId}
              />
            </FormField>
            <label className="text-text flex h-11 items-center gap-2 self-end text-sm font-semibold">
              <input type="checkbox" checked={ruleActive} onChange={(event) => setRuleActive(event.target.checked)} disabled={!canManage || !productId || !selectedVariantId || !selectedColour || !selectedShadeId} />
              Active rule
            </label>
            <button
              type="button"
              onClick={() => void saveShadeRule()}
              disabled={!canManage || !productId || !selectedVariantId || !selectedColour || !selectedShadeId || Boolean(saving)}
              className="bg-accent text-accent-foreground h-11 self-end rounded-[var(--radius-md)] px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save shade pricing"}
            </button>
          </div>
          {productId && selectedVariantId && selectedColour && selectedShadeId ? (
            <div className="text-muted mt-4 text-sm font-medium">
              Base SP {formatPrice(basePrice)} · Colour {selectedColour} · Shade {selectedShade?.shade_name ?? ""} · Shade adjustment {adjustmentType === "percentage" ? `${adjustmentValue || 0}% (${formatPrice(previewAdjustment)})` : formatPrice(previewAdjustment)} · Taxable {formatPrice(previewTaxable)} · GST {formatPrice(previewGst)} · Final {formatPrice(previewTaxable + previewGst)}
            </div>
          ) : null}
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
                variant.base_price ??
                variant.selling_price_override ??
                product?.selling_price ??
                0,
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
