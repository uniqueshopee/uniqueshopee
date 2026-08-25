"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, FormField } from "@/components/ui/input";
import { AdminSectionCard, PageHeader } from "@/components/admin/admin-kit";
import { useAuth } from "@/components/auth/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";

type ProductVariant = {
  finish: string | null;
  is_active: boolean | null;
  is_available: boolean | null;
  deleted_at: string | null;
};
type Product = {
  id: string;
  name: string;
  slug: string;
  brand_id: string | null;
  status: string;
  variants: ProductVariant[];
};
type Shade = {
  id: string;
  shade_name: string;
  shade_code: string;
  color_family: string;
  brand_id: string | null;
};
type ProductShadeMapping = { id: string; shade_id: string; finish: string | null };
type Brand = { id: string; name: string };
type BulkPreview = {
  productId: string;
  finish: string | null;
  brandName: string;
  productName: string;
  family: string | null;
  total: number;
  alreadyMapped: number;
  missing: Shade[];
  examples: Shade[];
};
type BulkIssue = { shadeCode: string; shadeName: string; reason: string };
type CustomerVisibilityCheck = {
  shadeCode: string;
  shadeName: string;
  visible: boolean;
  request: string;
  status: number | null;
  response: string;
  reason?: string;
};
type BulkSummary = {
  created: number;
  alreadyMapped: number;
  failed: number;
  databaseVerified: boolean;
  apiVerified: boolean;
  issues: BulkIssue[];
  customerVisibility: CustomerVisibilityCheck[];
};

function compatibilityDebug(...args: unknown[]) {
  if (process.env.NODE_ENV !== "production")
    console.debug("[PaintCompatibility]", ...args);
}

export function PaintCompatibilityAdminPage() {
  const { role } = useAuth();
  const canManage = role === "admin" || role === "manager" || role === "staff";
  const [products, setProducts] = useState<Product[]>([]);
  const [shades, setShades] = useState<Shade[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [productId, setProductId] = useState("");
  const [finish, setFinish] = useState("");
  const [family, setFamily] = useState("");
  const [search, setSearch] = useState("");
  const [assigned, setAssigned] = useState<Set<string>>(new Set());
  const [assignmentPreview, setAssignmentPreview] = useState<BulkPreview | null>(null);
  const [assignmentPreviewLoading, setAssignmentPreviewLoading] = useState(false);
  const [assignmentProgress, setAssignmentProgress] = useState<{
    current: number;
    total: number;
    processed: number;
  } | null>(null);
  const [assignmentSummary, setAssignmentSummary] = useState<BulkSummary | null>(null);

  const load = async () => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const [{ data: productData }, { data: brandData }, { data: variantData }] =
      await Promise.all([
        client
          .from("products")
          .select("id, name, slug, brand_id, status")
          .eq("status", "active")
          .is("deleted_at", null)
          .order("name"),
        client.from("brands").select("id, name").is("deleted_at", null).order("name"),
        client
          .from("product_variants")
          .select("product_id, finish, is_active, is_available, deleted_at")
          .is("deleted_at", null),
      ]);
    const variantsByProductId = new Map<string, ProductVariant[]>();
    for (const row of (variantData ?? []) as Array<
      ProductVariant & { product_id: string }
    >) {
      const variants = variantsByProductId.get(row.product_id) ?? [];
      variants.push(row);
      variantsByProductId.set(row.product_id, variants);
    }
    const loadedProducts = (productData ?? []).map((row) => ({
      ...(row as Omit<Product, "variants">),
      variants: variantsByProductId.get(row.id as string) ?? [],
    })) as Product[];
    const loadedShades: Shade[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data: shadePage, error: shadeError } = await client
        .from("shades")
        .select("id, shade_name, shade_code, color_family, brand_id")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("shade_name")
        .range(offset, offset + 999);
      if (shadeError) {
        compatibilityDebug("shade catalogue load failed", shadeError.message);
        break;
      }
      loadedShades.push(...((shadePage ?? []) as Shade[]));
      if (!shadePage || shadePage.length < 1000) break;
    }
    setProducts(loadedProducts);
    setProductId((current) => {
      if (
        loadedProducts.some(
          (product) => product.id === current && product.slug !== "paint-box",
        )
      )
        return current;
      return (
        loadedProducts.find((product) => product.slug === "berger-paint")?.id ??
        loadedProducts.find((product) => product.slug !== "paint-box")?.id ??
        ""
      );
    });
    setShades(loadedShades);
    setBrands((brandData ?? []) as Brand[]);
    compatibilityDebug("active shade count", loadedShades.length);
    compatibilityDebug("shade brand ids", [
      ...new Set(loadedShades.map((shade) => shade.brand_id).filter(Boolean)),
    ]);
    compatibilityDebug("shade brand names", [
      ...new Set(
        loadedShades
          .map(
            (shade) =>
              (brandData ?? []).find((brand) => brand.id === shade.brand_id)?.name,
          )
          .filter(Boolean),
      ),
    ]);
    const brandNameCounts = new Map<string, number>();
    for (const brand of (brandData ?? []) as Brand[])
      brandNameCounts.set(
        brand.name.trim().toLowerCase(),
        (brandNameCounts.get(brand.name.trim().toLowerCase()) ?? 0) + 1,
      );
    compatibilityDebug(
      "duplicate brand records",
      [...brandNameCounts.entries()]
        .filter(([, count]) => count > 1)
        .map(([name, count]) => ({ name, count })),
    );
  };
  useEffect(() => {
    void load();
  }, []);
  const loadAssignments = useCallback(async () => {
    const client = getSupabaseBrowserClient();
    if (!client || !productId) {
      setAssigned(new Set());
      return;
    }
    const mappings: ProductShadeMapping[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await client
        .from("product_shades")
        .select("id, shade_id, finish")
        .eq("product_id", productId)
        .is("deleted_at", null)
        .range(offset, offset + 999);
      if (error) {
        compatibilityDebug("assignment read failed", {
          productId,
          finish,
          error: error.message,
        });
        setAssigned(new Set());
        return;
      }
      mappings.push(...((data ?? []) as ProductShadeMapping[]));
      if (!data || data.length < 1000) break;
    }
    const normalizedFinish = finish.trim().toLowerCase();
    const assignedIds = mappings
      .filter(
        (row) =>
          !normalizedFinish ||
          !row.finish ||
          row.finish.trim().toLowerCase() === normalizedFinish,
      )
      .map((row) => row.shade_id);
    setAssigned(new Set(assignedIds));
    compatibilityDebug("assignment count refreshed", {
      productId,
      finish,
      assignedCount: assignedIds.length,
    });
  }, [finish, productId]);
  useEffect(() => {
    void loadAssignments();
  }, [loadAssignments]);

  const product = products.find((row) => row.id === productId);
  const productBrandName = brands.find((brand) => brand.id === product?.brand_id)?.name;
  const productFinishes = useMemo(() => {
    const byNormalizedFinish = new Map<string, string>();
    for (const variant of product?.variants ?? []) {
      if (
        variant.deleted_at !== null ||
        variant.is_active !== true ||
        variant.is_available !== true
      )
        continue;
      const value = variant.finish?.trim();
      if (value && !byNormalizedFinish.has(value.toLowerCase()))
        byNormalizedFinish.set(value.toLowerCase(), value);
    }
    return [...byNormalizedFinish.values()];
  }, [product]);
  useEffect(() => {
    setFinish(
      (current) =>
        productFinishes.find(
          (value) => value.toLowerCase() === current.trim().toLowerCase(),
        ) ??
        productFinishes[0] ??
        "",
    );
  }, [productFinishes]);
  useEffect(() => {
    setAssignmentPreview(null);
    setAssignmentSummary(null);
  }, [productId, finish, family]);
  useEffect(() => {
    if (!product) return;
    compatibilityDebug("selected product", {
      productName: product.name,
      productId: product.id,
      productBrandId: product.brand_id,
      productBrandName: productBrandName ?? null,
    });
  }, [product, productBrandName]);
  const visible = useMemo(
    () =>
      shades.filter(
        (shade) =>
          (!family || shade.color_family.toLowerCase() === family.toLowerCase()) &&
          (!search ||
            `${shade.shade_name} ${shade.shade_code}`
              .toLowerCase()
              .includes(search.toLowerCase())) &&
          (!product || !shade.brand_id || shade.brand_id === product.brand_id),
      ),
    [family, product, search, shades],
  );
  const families = [...new Set(shades.map((shade) => shade.color_family))].sort();
  const assignmentCandidates = useMemo(
    () =>
      shades.filter(
        (shade) =>
          shade.brand_id === product?.brand_id &&
          (!family || shade.color_family.toLowerCase() === family.toLowerCase()),
      ),
    [family, product?.brand_id, shades],
  );

  const matchingFinish = (mappingFinish: string | null, selectedFinish: string | null) =>
    !selectedFinish ||
    !mappingFinish ||
    mappingFinish.trim().toLowerCase() === selectedFinish.trim().toLowerCase();

  const previewAssignment = async () => {
    const client = getSupabaseBrowserClient();
    if (!client || !product || !finish.trim() || assignmentCandidates.length === 0) {
      toast({
        title: "Check assignment",
        description:
          "Choose an active product, finish, and matching shade scope before previewing.",
        variant: "danger",
      });
      return;
    }
    setAssignmentPreviewLoading(true);
    setAssignmentSummary(null);
    const selectedFinish = finish.trim() || null;
    const mappings: ProductShadeMapping[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await client
        .from("product_shades")
        .select("id, shade_id, finish")
        .eq("product_id", product.id)
        .is("deleted_at", null)
        .range(offset, offset + 999);
      if (error) {
        setAssignmentPreviewLoading(false);
        toast({ title: "Preview failed", description: error.message, variant: "danger" });
        return;
      }
      mappings.push(...((data ?? []) as ProductShadeMapping[]));
      if (!data || data.length < 1000) break;
    }
    if (!product.brand_id) {
      setAssignmentPreviewLoading(false);
      toast({
        title: "Preview failed",
        description: "The selected product has no brand.",
        variant: "danger",
      });
      return;
    }
    const mappedIds = new Set(
      mappings
        .filter((mapping) => matchingFinish(mapping.finish, selectedFinish))
        .map((mapping) => mapping.shade_id),
    );
    const missing = assignmentCandidates.filter((shade) => !mappedIds.has(shade.id));
    setAssignmentPreview({
      productId: product.id,
      finish: selectedFinish,
      brandName: productBrandName ?? "Selected brand",
      productName: product.name,
      family: family || null,
      total: assignmentCandidates.length,
      alreadyMapped: assignmentCandidates.length - missing.length,
      missing,
      examples: assignmentCandidates.slice(0, 5),
    });
    setAssignmentPreviewLoading(false);
  };

  const verifyCustomerVisibility = async (
    selectedProductId: string,
    selectedFinish: string | null,
    selectedFamily: string | null,
    candidateShades: Shade[],
  ): Promise<CustomerVisibilityCheck[]> => {
    const client = getSupabaseBrowserClient();
    const tests = candidateShades.slice(0, 3);
    return Promise.all(
      tests.map(async (testShade) => {
        const params = new URLSearchParams({
          productId: selectedProductId,
          page: "1",
          search: testShade.shade_code,
        });
        if (selectedFinish) params.set("finish", selectedFinish);
        if (selectedFamily) params.set("colourFamily", selectedFamily);
        const request = `/api/paint/shades?${params.toString()}`;
        const base = {
          shadeCode: testShade.shade_code,
          shadeName: testShade.shade_name,
          request,
          status: null as number | null,
          response: "",
        };
        if (!client) {
          return {
            ...base,
            visible: false,
            response: "Supabase client unavailable.",
            reason: "Supabase client unavailable.",
          };
        }
        const { data: shade } = await client
          .from("shades")
          .select("id, shade_name, shade_code, is_active, deleted_at")
          .eq("id", testShade.id)
          .maybeSingle();
        if (!shade)
          return {
            ...base,
            visible: false,
            response: "Shade row not found.",
            reason: "Shade row not found.",
          };
        if (!shade.is_active)
          return {
            ...base,
            visible: false,
            response: "Shade is inactive.",
            reason: "Shade is inactive.",
          };
        if (shade.deleted_at)
          return {
            ...base,
            visible: false,
            response: "Shade is deleted.",
            reason: "Shade is deleted.",
          };
        const shadeId = String(shade.id);
        const { data: mappings, error: mappingError } = await client
          .from("product_shades")
          .select("shade_id, finish, is_available, deleted_at")
          .eq("product_id", selectedProductId)
          .eq("shade_id", shadeId)
          .is("deleted_at", null);
        if (mappingError) {
          return {
            ...base,
            visible: false,
            response: mappingError.message,
            reason: `Mapping query failed: ${mappingError.message}`,
          };
        }
        const matchingMapping = (
          (mappings ?? []) as Array<{
            shade_id: string;
            finish: string | null;
            is_available: boolean;
            deleted_at: string | null;
          }>
        ).find(
          (mapping) =>
            mapping.shade_id === shadeId &&
            mapping.is_available &&
            matchingFinish(mapping.finish, selectedFinish),
        );
        if (!matchingMapping) {
          return {
            ...base,
            visible: false,
            response: "No customer-visible product_shades mapping.",
            reason: "No customer-visible product_shades mapping.",
          };
        }
        try {
          const apiResponse = await fetch(request);
          const responseBody = await apiResponse.text();
          let result: { items?: Array<{ id: string; shade_code: string }> } = {};
          try {
            result = JSON.parse(responseBody) as typeof result;
          } catch {
            // Preserve the raw body in the diagnostic result below.
          }
          compatibilityDebug("customer visibility verification", {
            request,
            status: apiResponse.status,
            responseBody,
            expectedShade: { id: shadeId, code: testShade.shade_code },
          });
          if (!apiResponse.ok)
            return {
              ...base,
              visible: false,
              status: apiResponse.status,
              response: responseBody,
              reason: `HTTP ${apiResponse.status}: ${responseBody}`,
            };
          const returnedItems = result.items ?? [];
          const visible = returnedItems.some(
            (item) =>
              item.id === shadeId &&
              item.shade_code.toLowerCase() === testShade.shade_code.toLowerCase(),
          );
          return {
            ...base,
            visible,
            status: apiResponse.status,
            response: JSON.stringify({
              total: returnedItems.length,
              items: returnedItems,
            }),
            reason: visible
              ? undefined
              : `HTTP 200 but expected shade not found. Returned: ${JSON.stringify(returnedItems)}`,
          };
        } catch (error) {
          const reason =
            error instanceof Error ? error.message : "Customer API verification failed.";
          compatibilityDebug("customer visibility verification request failed", {
            request,
            expectedShade: { id: shadeId, code: testShade.shade_code },
            error: reason,
          });
          return {
            ...base,
            visible: false,
            response: reason,
            reason,
          };
        }
      }),
    );
  };

  const assignMissing = async () => {
    const client = getSupabaseBrowserClient();
    if (
      !client ||
      !assignmentPreview ||
      assignmentPreview.missing.length === 0 ||
      !canManage
    )
      return;
    const chunkSize = 250;
    const chunks = Array.from(
      { length: Math.ceil(assignmentPreview.missing.length / chunkSize) },
      (_, index) =>
        assignmentPreview.missing.slice(index * chunkSize, (index + 1) * chunkSize),
    );
    const issues: BulkIssue[] = [];
    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index] ?? [];
      setAssignmentProgress({
        current: index + 1,
        total: chunks.length,
        processed: index * chunkSize,
      });
      const payload = chunk.map((shade) => ({
        product_id: assignmentPreview.productId,
        shade_id: shade.id,
        finish: assignmentPreview.finish,
        is_available: true,
      }));
      let error: string | null = null;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const result = await client.from("product_shades").insert(payload as never);
        if (!result.error) {
          error = null;
          break;
        }
        if (result.error.code === "23505") {
          const { data: currentMappings } = await client
            .from("product_shades")
            .select("shade_id, finish")
            .eq("product_id", assignmentPreview.productId)
            .in(
              "shade_id",
              chunk.map((shade) => shade.id),
            )
            .is("deleted_at", null);
          const currentIds = new Set(
            ((currentMappings ?? []) as ProductShadeMapping[])
              .filter((mapping) =>
                matchingFinish(mapping.finish, assignmentPreview.finish),
              )
              .map((mapping) => mapping.shade_id),
          );
          const remaining = chunk.filter((shade) => !currentIds.has(shade.id));
          if (remaining.length === 0) {
            error = null;
            break;
          }
          payload.splice(
            0,
            payload.length,
            ...remaining.map((shade) => ({
              product_id: assignmentPreview.productId,
              shade_id: shade.id,
              finish: assignmentPreview.finish,
              is_available: true,
            })),
          );
          continue;
        }
        error = result.error.message;
      }
      if (error) {
        for (const shade of chunk)
          issues.push({
            shadeCode: shade.shade_code,
            shadeName: shade.shade_name,
            reason: error,
          });
      }
      setAssignmentProgress({
        current: index + 1,
        total: chunks.length,
        processed: Math.min((index + 1) * chunkSize, assignmentPreview.missing.length),
      });
    }
    const finalMappings: ProductShadeMapping[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await client
        .from("product_shades")
        .select("id, shade_id, finish")
        .eq("product_id", assignmentPreview.productId)
        .is("deleted_at", null)
        .range(offset, offset + 999);
      if (error) {
        issues.push({
          shadeCode: "*",
          shadeName: "Final compatibility verification",
          reason: error.message,
        });
        break;
      }
      finalMappings.push(...((data ?? []) as ProductShadeMapping[]));
      if (!data || data.length < 1000) break;
    }
    const finalIds = new Set(
      finalMappings
        .filter((mapping) => matchingFinish(mapping.finish, assignmentPreview.finish))
        .map((mapping) => mapping.shade_id),
    );
    const created = assignmentPreview.missing.filter((shade) =>
      finalIds.has(shade.id),
    ).length;
    const customerVisibility = await verifyCustomerVisibility(
      assignmentPreview.productId,
      assignmentPreview.finish,
      assignmentPreview.family,
      assignmentPreview.missing.length > 0
        ? assignmentPreview.missing
        : assignmentPreview.examples,
    );
    const databaseVerified =
      issues.length === 0 &&
      assignmentPreview.missing.every((shade) => finalIds.has(shade.id));
    const apiVerified =
      customerVisibility.length > 0 && customerVisibility.every((check) => check.visible);
    setAssignmentSummary({
      created,
      alreadyMapped: assignmentPreview.total - created - issues.length,
      failed: issues.length,
      databaseVerified,
      apiVerified,
      issues,
      customerVisibility,
    });
    setAssignmentProgress(null);
    await loadAssignments();
    const visibilityFailed = !apiVerified;
    toast({
      title: visibilityFailed
        ? "Compatibility needs attention"
        : "Bulk compatibility completed",
      description: visibilityFailed
        ? "Mappings were written, but customer visibility verification failed."
        : `${created} shade mappings created and customer visibility verified.`,
      variant: visibilityFailed ? "danger" : "success",
    });
  };
  return (
    <section className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Paint Compatibility" }]}
        title="Paint compatibility"
        subtitle="Assign available shades to a product and finish without managing individual products."
      />
      <AdminSectionCard
        title="Product + finish"
        description="Customers can only select shades assigned here and validated by the server."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label="Product" htmlFor="compat-product">
            <select
              id="compat-product"
              value={productId}
              onChange={(event) => {
                setProductId(event.target.value);
                setAssignmentPreview(null);
                setAssignmentSummary(null);
              }}
              className="border-border bg-background h-11 w-full rounded-[var(--radius-md)] border px-3 text-sm"
            >
              <option value="">Choose product</option>
              {products.map((row) => (
                <option key={row.id} value={row.id} disabled={row.slug === "paint-box"}>
                  {row.name} ·{" "}
                  {brands.find((brand) => brand.id === row.brand_id)?.name ?? "No brand"}{" "}
                  · /{row.slug}
                  {row.slug === "paint-box" ? " (TEST/DUPLICATE)" : ""}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Finish" htmlFor="compat-finish">
            <select
              id="compat-finish"
              value={finish}
              onChange={(event) => {
                setFinish(event.target.value);
                setAssignmentPreview(null);
                setAssignmentSummary(null);
              }}
              disabled={!product || productFinishes.length === 0}
              className="border-border bg-background h-11 w-full rounded-[var(--radius-md)] border px-3 text-sm"
            >
              <option value="">Choose finish</option>
              {productFinishes.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Colour family" htmlFor="compat-family">
            <select
              id="compat-family"
              value={family}
              onChange={(event) => setFamily(event.target.value)}
              className="border-border bg-background h-11 w-full rounded-[var(--radius-md)] border px-3 text-sm"
            >
              <option value="">All families</option>
              {families.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            loading={assignmentPreviewLoading}
            disabled={
              !canManage ||
              !product ||
              product.status === "inactive" ||
              !finish.trim() ||
              assignmentCandidates.length === 0 ||
              Boolean(assignmentProgress)
            }
            onClick={() => void previewAssignment()}
          >
            Preview assignment
          </Button>
          {assignmentPreview ? (
            <Button
              type="button"
              variant="accent"
              loading={Boolean(assignmentProgress)}
              disabled={
                !canManage ||
                assignmentPreview.missing.length === 0 ||
                Boolean(assignmentProgress) ||
                Boolean(assignmentSummary)
              }
              onClick={() => void assignMissing()}
            >
              {family
                ? `Assign ${family} shades`
                : `Assign all ${productBrandName ?? "brand"} shades`}
            </Button>
          ) : null}
        </div>
        {assignmentPreview ? (
          <div className="border-border/70 bg-background-secondary/30 mt-4 rounded-xl border p-4 text-sm">
            <p className="text-text font-bold">
              {assignmentPreview.brandName} · {assignmentPreview.productName} ·{" "}
              {assignmentPreview.finish}
              {assignmentPreview.family ? ` · ${assignmentPreview.family}` : ""}
            </p>
            <p className="text-muted mt-1 text-xs break-all">
              Product ID: {assignmentPreview.productId}
            </p>
            <div className="text-muted mt-3 grid grid-cols-2 gap-2 text-xs font-semibold sm:grid-cols-3">
              <span>Catalogue shades: {assignmentPreview.total}</span>
              <span>Already compatible: {assignmentPreview.alreadyMapped}</span>
              <span>Missing compatibility: {assignmentPreview.missing.length}</span>
            </div>
            <div className="text-muted mt-3 max-h-32 overflow-auto text-xs">
              <p className="text-text mb-1 font-bold">Examples</p>
              {assignmentPreview.examples.map((shade) => (
                <div key={shade.id} className="border-border/50 border-b py-1.5">
                  {shade.shade_name} — {shade.shade_code}
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {assignmentProgress ? (
          <div className="border-accent/30 bg-accent/5 mt-4 rounded-xl border p-4 text-sm">
            <p className="text-text font-bold">Assigning shades...</p>
            <p className="text-muted mt-1">
              {assignmentProgress.processed} / {assignmentPreview?.missing.length ?? 0} ·
              Chunk {assignmentProgress.current} / {assignmentProgress.total}
            </p>
          </div>
        ) : null}
        {assignmentSummary ? (
          <div className="border-success/30 bg-success/5 mt-4 rounded-xl border p-4 text-sm">
            <p className="text-text font-bold">Compatibility updated</p>
            <p className="text-muted mt-1">
              Created: {assignmentSummary.created} · Already compatible:{" "}
              {assignmentSummary.alreadyMapped} · Failed: {assignmentSummary.failed}
            </p>
            <div className="mt-3 space-y-1 text-xs font-semibold">
              <p
                className={
                  assignmentSummary.databaseVerified ? "text-success" : "text-danger"
                }
              >
                Database compatibility:{" "}
                {assignmentSummary.databaseVerified ? "VERIFIED" : "FAILED"}
              </p>
              <p
                className={assignmentSummary.apiVerified ? "text-success" : "text-danger"}
              >
                Customer API visibility:{" "}
                {assignmentSummary.apiVerified ? "VERIFIED" : "FAILED"}
              </p>
            </div>
            <div className="mt-3 space-y-2 text-xs">
              {assignmentSummary.customerVisibility.map((check) => (
                <div
                  key={check.shadeCode}
                  className="border-border/50 rounded border p-2"
                >
                  <p
                    className={
                      check.visible
                        ? "text-success font-semibold"
                        : "text-danger font-semibold"
                    }
                  >
                    {check.visible ? "✓" : "✕"} {check.shadeName} —{" "}
                    {check.visible ? "visible" : check.reason}
                  </p>
                  {!check.visible ? (
                    <p className="text-muted mt-1 break-all">
                      HTTP {check.status ?? "request failed"} · {check.request} ·{" "}
                      {check.response}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </AdminSectionCard>
      <AdminSectionCard
        title="Shade directory"
        description={`${assigned.size} assigned for this finish`}
      >
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search shade name or code"
          aria-label="Search shade name or code"
        />
        <div className="mt-4 max-h-[32rem] space-y-2 overflow-auto">
          {visible.slice(0, 100).map((shade) => (
            <div
              key={shade.id}
              className="border-border/70 flex items-center justify-between gap-3 rounded-xl border bg-white p-3"
            >
              <div className="min-w-0">
                <p className="text-text truncate text-sm font-bold">{shade.shade_name}</p>
                <p className="text-muted text-xs font-medium">
                  {shade.shade_code} · {shade.color_family}
                </p>
              </div>
              <span className="text-accent text-xs font-bold">
                {assigned.has(shade.id) ? "Assigned" : "Available"}
              </span>
            </div>
          ))}
        </div>
      </AdminSectionCard>
    </section>
  );
}
