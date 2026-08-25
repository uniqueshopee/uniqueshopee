"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getQaCartItems, isQaBypassEnabled } from "@/lib/qa-mode";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ensureCurrentUserProfile } from "@/lib/supabase/auth";
import type { CartItem } from "@/types";
import { useCartStore } from "@/store/cart-store";
import { toast } from "@/hooks/use-toast";
import { calculateVariantPrice } from "@/lib/variant-pricing";

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  selling_price: number | string;
  gst_rate: number | string | null;
  mrp: number | string;
  status: string;
  deleted_at: string | null;
  category_id: string;
  brand_id: string;
  department_id: string;
  og_image_url: string | null;
};

type BrandRow = {
  id: string;
  name: string;
  deleted_at: string | null;
};

type ProductImageRow = {
  product_id: string;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
  deleted_at: string | null;
};

type ProductVariantRow = {
  id: string;
  product_id: string;
  sku: string;
  variant_name: string | null;
  option_label: string | null;
  option_value: string | null;
  mrp_override: number | string | null;
  selling_price_override: number | string | null;
  shade_id: string | null;
  pack_size: string | null;
  unit: string | null;
  finish: string | null;
  base_price: number | string | null;
  shade_extra_price: number | string | null;
  adjustment_type: string | null;
  final_price: number | string | null;
  is_available: boolean | null;
  shade_code_snapshot: string | null;
  shade_name_snapshot: string | null;
  colour_family_snapshot: string | null;
  hex_color_snapshot: string | null;
  is_default: boolean;
  deleted_at: string | null;
};

type InventoryRow = {
  product_variant_id: string;
  current_quantity: number | string;
  reserved_quantity: number | string;
  low_stock_threshold: number | string;
  stock_status: string;
  deleted_at: string | null;
};

type CartRow = {
  id: string;
  product_id: string;
  product_variant_id: string | null;
  shade_id: string | null;
  shade_code_snapshot: string | null;
  shade_name_snapshot: string | null;
  colour_family_snapshot: string | null;
  hex_color_snapshot: string | null;
  pack_size_snapshot: string | null;
  finish_snapshot: string | null;
  base_price_snapshot: number | string | null;
  shade_extra_price_snapshot: number | string | null;
  final_unit_price_snapshot: number | string | null;
  sku_snapshot: string | null;
  quantity: number | string;
  deleted_at: string | null;
};

type CartInsertRow = {
  user_id: string;
  product_id: string;
  product_variant_id: string | null;
  shade_id: string | null;
  shade_code_snapshot: string | null;
  shade_name_snapshot: string | null;
  colour_family_snapshot: string | null;
  hex_color_snapshot: string | null;
  pack_size_snapshot: string | null;
  finish_snapshot: string | null;
  base_price_snapshot: number;
  shade_extra_price_snapshot: number;
  final_unit_price_snapshot: number;
  sku_snapshot: string | null;
  quantity: number;
};

type CategoryRow = {
  id: string;
  name: string;
};

type DepartmentRow = {
  id: string;
  name: string;
};

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

type ResolvedPricingRow = {
  base_price: number | string | null;
  shade_adjustment: number | string | null;
  final_price: number | string | null;
};

async function resolveCartPricing(
  client: SupabaseClient,
  variant: ProductVariantRow | null | undefined,
  product: ProductRow,
  shadeId: string | null | undefined,
) {
  const fallback = calculateVariantPrice({
    basePrice:
      variant?.base_price ?? variant?.selling_price_override ?? product.selling_price,
    shadeExtraPrice: variant?.shade_extra_price ?? 0,
    adjustmentType:
      (variant?.adjustment_type as "none" | "fixed" | "percentage" | null) ?? "fixed",
  });

  if (!variant) return fallback;

  const { data, error } = await client.rpc("resolve_paint_configuration_price", {
    p_variant_id: variant.id,
    p_shade_id: shadeId ?? null,
  });
  const row = (Array.isArray(data) ? data[0] : data) as ResolvedPricingRow | null;
  if (error || !row) return fallback;

  return {
    basePrice: toNumber(row.base_price, fallback.basePrice),
    shadeExtraPrice: toNumber(row.shade_adjustment, 0),
    finalPrice: toNumber(row.final_price, fallback.finalPrice),
  };
}

function firstImage(productId: string, images: ProductImageRow[]) {
  return (
    images.find(
      (image) =>
        image.product_id === productId && image.is_primary && image.deleted_at === null,
    )?.image_url ??
    images
      .filter((image) => image.product_id === productId && image.deleted_at === null)
      .sort((left, right) => left.sort_order - right.sort_order)[0]?.image_url ??
    ""
  );
}

function stockStateFromInventory(inventories: InventoryRow[]) {
  const validRows = inventories.filter((row) => row.deleted_at === null);
  const stockCount = validRows.reduce(
    (sum, row) => sum + toNumber(row.current_quantity),
    0,
  );
  const reservedCount = validRows.reduce(
    (sum, row) => sum + toNumber(row.reserved_quantity),
    0,
  );
  const lowStockThreshold =
    validRows.length > 0
      ? Math.max(...validRows.map((row) => toNumber(row.low_stock_threshold, 10)))
      : 10;
  const inStock = stockCount > 0;

  return {
    stockCount,
    reservedCount,
    lowStockThreshold,
    inStock,
  };
}

function activeCartItemCount(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

async function getClient(client?: SupabaseClient | null) {
  return client ?? getSupabaseBrowserClient();
}

function formatVariantLabel(row?: ProductVariantRow | null) {
  if (!row) {
    return "Standard";
  }

  const shade =
    row.shade_name_snapshot || row.shade_code_snapshot
      ? [
          row.shade_name_snapshot,
          row.shade_code_snapshot ? `#${row.shade_code_snapshot}` : "",
        ]
          .filter(Boolean)
          .join(" ")
      : "";
  const size = [row.pack_size, row.unit].filter(Boolean).join(" ");
  const extra =
    row.finish || (row.option_label && row.option_value)
      ? [
          row.finish,
          row.option_label && row.option_value
            ? `${row.option_label}: ${row.option_value}`
            : "",
        ]
          .filter(Boolean)
          .join(" - ")
      : "";
  const label = [shade, size, extra, row.variant_name].filter(Boolean).join(" • ");
  return label || "Standard";
}

function resolveVariantBySelection(
  variants: ProductVariantRow[],
  selection: {
    variantId?: string | null;
    shadeId?: string | null;
    packSize?: string | null;
    finish?: string | null;
  },
) {
  if (selection.variantId) {
    const direct = variants.find((variant) => variant.id === selection.variantId);
    if (direct) {
      return direct;
    }
  }

  if (selection.shadeId) {
    const shadeMatch =
      variants.find(
        (variant) =>
          variant.shade_id === selection.shadeId &&
          (selection.packSize ? variant.pack_size === selection.packSize : true) &&
          (selection.finish ? variant.finish === selection.finish : true),
      ) ??
      variants.find((variant) => variant.shade_id === selection.shadeId) ??
      null;

    if (shadeMatch) {
      return shadeMatch;
    }
  }

  return variants.find((variant) => variant.is_default) ?? variants[0] ?? null;
}

function resolveVariantStrict(
  variants: ProductVariantRow[],
  selection: {
    variantId?: string | null;
    shadeId?: string | null;
    packSize?: string | null;
    finish?: string | null;
  },
) {
  if (selection.variantId) {
    return (
      variants.find(
        (variant) =>
          variant.id === selection.variantId &&
          (!selection.shadeId ||
            !variant.shade_id ||
            variant.shade_id === selection.shadeId) &&
          (!selection.packSize || variant.pack_size === selection.packSize) &&
          (!selection.finish || variant.finish === selection.finish),
      ) ?? null
    );
  }

  return (
    variants.find(
      (variant) =>
        (!selection.shadeId ||
          !variant.shade_id ||
          variant.shade_id === selection.shadeId) &&
        (!selection.packSize || variant.pack_size === selection.packSize) &&
        (!selection.finish || variant.finish === selection.finish),
    ) ?? null
  );
}

export async function loadRemoteCartItems(
  userId: string,
  client?: SupabaseClient | null,
  options?: { profileId?: string | null },
) {
  if (isQaBypassEnabled()) {
    return getQaCartItems();
  }

  const resolvedClient = await getClient(client);

  if (!resolvedClient) {
    return [] as CartItem[];
  }

  const profileId = options?.profileId ?? null;
  if (profileId !== userId) {
    const profile = await ensureCurrentUserProfile(resolvedClient);
    if (!profile || profile.id !== userId) {
      return [] as CartItem[];
    }
  }

  const [
    cartResult,
    productsResult,
    brandsResult,
    imagesResult,
    variantsResult,
    inventoryResult,
    categoriesResult,
    departmentsResult,
  ] = await Promise.all([
    resolvedClient
      .from("cart_items")
      .select(
        "id, product_id, product_variant_id, shade_id, shade_code_snapshot, shade_name_snapshot, colour_family_snapshot, hex_color_snapshot, pack_size_snapshot, finish_snapshot, base_price_snapshot, shade_extra_price_snapshot, final_unit_price_snapshot, sku_snapshot, quantity, deleted_at",
      )
      .eq("user_id", userId)
      .is("deleted_at", null),
    resolvedClient
      .from("products")
      .select(
        "id, name, slug, selling_price, mrp, gst_rate, status, deleted_at, category_id, brand_id, department_id, og_image_url",
      )
      .is("deleted_at", null),
    resolvedClient.from("brands").select("id, name, deleted_at").is("deleted_at", null),
    resolvedClient
      .from("product_images")
      .select("product_id, image_url, is_primary, sort_order, deleted_at")
      .is("deleted_at", null)
      .order("sort_order", { ascending: true }),
    resolvedClient
      .from("product_variants")
      .select(
        "id, product_id, sku, variant_name, option_label, option_value, mrp_override, selling_price_override, shade_id, pack_size, unit, finish, base_price, shade_extra_price, adjustment_type, final_price, is_available, shade_code_snapshot, shade_name_snapshot, is_default, deleted_at",
      )
      .is("deleted_at", null),
    resolvedClient
      .from("inventory")
      .select(
        "product_variant_id, current_quantity, reserved_quantity, low_stock_threshold, stock_status, deleted_at",
      )
      .is("deleted_at", null),
    resolvedClient.from("categories").select("id, name").is("deleted_at", null),
    resolvedClient.from("departments").select("id, name").is("deleted_at", null),
  ]);

  if (
    cartResult.error ||
    productsResult.error ||
    brandsResult.error ||
    imagesResult.error ||
    variantsResult.error ||
    inventoryResult.error
  ) {
    return [] as CartItem[];
  }

  const products = (productsResult.data ?? []) as ProductRow[];
  const brands = new Map(
    ((brandsResult.data ?? []) as BrandRow[]).map((row) => [row.id, row.name]),
  );
  const images = (imagesResult.data ?? []) as ProductImageRow[];
  const variants = (variantsResult.data ?? []) as ProductVariantRow[];
  const inventories = (inventoryResult.data ?? []) as InventoryRow[];
  const categories = new Map(
    ((categoriesResult.data ?? []) as CategoryRow[]).map((row) => [row.id, row.name]),
  );
  const departments = new Map(
    ((departmentsResult.data ?? []) as DepartmentRow[]).map((row) => [row.id, row.name]),
  );
  const productById = new Map(products.map((product) => [product.id, product]));
  const productVariantsByProductId = new Map<string, ProductVariantRow[]>();

  for (const variant of variants) {
    const list = productVariantsByProductId.get(variant.product_id) ?? [];
    list.push(variant);
    productVariantsByProductId.set(variant.product_id, list);
  }

  const inventoryByVariantId = new Map<string, InventoryRow[]>();
  for (const inventory of inventories) {
    const list = inventoryByVariantId.get(inventory.product_variant_id) ?? [];
    list.push(inventory);
    inventoryByVariantId.set(inventory.product_variant_id, list);
  }

  return ((cartResult.data ?? []) as CartRow[])
    .map((row) => {
      const product = productById.get(row.product_id);
      if (!product || product.status !== "active" || product.deleted_at) {
        return null;
      }

      const variantRows = productVariantsByProductId.get(product.id) ?? [];
      const chosenVariant = resolveVariantBySelection(variantRows, {
        variantId: row.product_variant_id,
        shadeId: row.shade_id,
        packSize: row.pack_size_snapshot,
        finish: row.finish_snapshot,
      });
      const inventoryRows = chosenVariant
        ? (inventoryByVariantId.get(chosenVariant.id) ?? [])
        : [];
      const stock = stockStateFromInventory(inventoryRows);
      const quantity = Math.max(
        1,
        Math.min(toNumber(row.quantity, 1), stock.stockCount > 0 ? stock.stockCount : 1),
      );
      const pricing = calculateVariantPrice({
        basePrice:
          chosenVariant?.base_price ??
          chosenVariant?.selling_price_override ??
          product.selling_price,
        shadeExtraPrice: chosenVariant?.shade_extra_price ?? 0,
        adjustmentType:
          (chosenVariant?.adjustment_type as "none" | "fixed" | "percentage" | null) ??
          "fixed",
      });
      const price = chosenVariant?.final_price
        ? toNumber(chosenVariant.final_price)
        : pricing.finalPrice;
      const compareAtPrice =
        toNumber(chosenVariant?.mrp_override ?? product.mrp) > price
          ? toNumber(chosenVariant?.mrp_override ?? product.mrp)
          : undefined;
      const categoryName = categories.get(product.category_id) ?? "Category";
      const departmentName = departments.get(product.department_id) ?? "Department";
      const shadeCode =
        row.shade_code_snapshot ?? chosenVariant?.shade_code_snapshot ?? null;
      const shadeName =
        row.shade_name_snapshot ?? chosenVariant?.shade_name_snapshot ?? null;

      return {
        productId: product.id,
        variantId: chosenVariant?.id ?? row.product_variant_id ?? undefined,
        shadeId: chosenVariant?.shade_id ?? row.shade_id ?? undefined,
        shadeCode: shadeCode ?? undefined,
        shadeName: shadeName ?? undefined,
        shadeFamily: row.colour_family_snapshot ?? undefined,
        shadeHexColor: row.hex_color_snapshot ?? undefined,
        packSize: row.pack_size_snapshot ?? chosenVariant?.pack_size ?? undefined,
        finish: row.finish_snapshot ?? chosenVariant?.finish ?? undefined,
        name: product.name,
        price,
        image: firstImage(product.id, images) || product.og_image_url || "",
        quantity,
        slug: product.slug,
        category: categoryName,
        brand: brands.get(product.brand_id) ?? "Brand",
        gstRate: toNumber(product.gst_rate, 18),
        variant: formatVariantLabel(chosenVariant),
        sku: row.sku_snapshot ?? chosenVariant?.sku ?? product.id,
        basePrice: pricing.basePrice,
        shadeExtraPrice: pricing.shadeExtraPrice,
        finalUnitPrice: price,
        compareAtPrice,
        inStock: stock.inStock,
        stockCount: stock.stockCount,
        reservedCount: stock.reservedCount,
        lowStockThreshold: stock.lowStockThreshold,
        department: departmentName,
      } satisfies CartItem & { department: string };
    })
    .filter(Boolean) as Array<CartItem & { department: string }>;
}

export async function replaceRemoteCartItems(
  userId: string,
  items: CartItem[],
  client?: SupabaseClient | null,
) {
  if (isQaBypassEnabled()) {
    return { error: null };
  }

  const resolvedClient = await getClient(client);

  if (!resolvedClient) {
    return { error: "Supabase is not configured." };
  }

  const profile = await ensureCurrentUserProfile(resolvedClient);
  if (!profile || profile.id !== userId) {
    return { error: "Your account is still being prepared. Please try again." };
  }

  const normalized = items.reduce<CartItem[]>((acc, item) => {
    const quantity = Math.max(1, Math.floor(item.quantity));
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return acc;
    }

    const existing = acc.find(
      (entry) =>
        entry.productId === item.productId &&
        (entry.variantId ?? "") === (item.variantId ?? "") &&
        (entry.shadeId ?? "") === (item.shadeId ?? "") &&
        (entry.packSize ?? "") === (item.packSize ?? "") &&
        (entry.finish ?? "") === (item.finish ?? ""),
    );
    if (existing) {
      existing.quantity += quantity;
    } else {
      acc.push({ ...item, quantity });
    }
    return acc;
  }, []);

  const productIds = normalized.map((item) => item.productId);
  const variantIds: string[] = [];

  const [productResult, variantsResult, inventoryResult] = await Promise.all([
    productIds.length > 0
      ? resolvedClient
          .from("products")
          .select(
            "id, name, slug, selling_price, mrp, gst_rate, status, deleted_at, og_image_url",
          )
          .in("id", productIds)
          .eq("status", "active")
          .is("deleted_at", null)
      : Promise.resolve({ data: [] as ProductRow[] }),
    productIds.length > 0
      ? resolvedClient
          .from("product_variants")
          .select(
            "id, product_id, sku, variant_name, option_label, option_value, mrp_override, selling_price_override, shade_id, pack_size, unit, finish, base_price, shade_extra_price, adjustment_type, final_price, is_available, shade_code_snapshot, shade_name_snapshot, is_default, deleted_at",
          )
          .in("product_id", productIds)
          .is("deleted_at", null)
      : Promise.resolve({ data: [] as ProductVariantRow[] }),
    productIds.length > 0
      ? resolvedClient
          .from("inventory")
          .select(
            "product_variant_id, current_quantity, reserved_quantity, low_stock_threshold, stock_status, deleted_at",
          )
          .is("deleted_at", null)
      : Promise.resolve({ data: [] as InventoryRow[] }),
  ]);

  if (
    (productResult as { error?: Error }).error ||
    (variantsResult as { error?: Error }).error ||
    (inventoryResult as { error?: Error }).error
  ) {
    return { error: "Unable to validate cart items." };
  }

  const products = new Map(
    ((productResult as { data?: ProductRow[] }).data ?? []).map((product) => [
      product.id,
      product,
    ]),
  );
  const variants = ((variantsResult as { data?: ProductVariantRow[] }).data ?? []).filter(
    (variant) => {
      if (!productIds.includes(variant.product_id)) {
        return false;
      }
      variantIds.push(variant.id);
      return true;
    },
  );
  const inventoryRows = (
    (inventoryResult as { data?: InventoryRow[] }).data ?? []
  ).filter((row) => variantIds.includes(row.product_variant_id));
  const inventoryByVariantId = new Map<string, InventoryRow[]>();
  for (const row of inventoryRows) {
    const list = inventoryByVariantId.get(row.product_variant_id) ?? [];
    list.push(row);
    inventoryByVariantId.set(row.product_variant_id, list);
  }

  const resolvedPayload = await Promise.all(
    normalized.map(async (item) => {
      const product = products.get(item.productId);
      if (!product || product.status !== "active" || product.deleted_at) {
        return null;
      }

      const productVariants = variants.filter(
        (variant) => variant.product_id === product.id,
      );
      const chosenVariant = resolveVariantBySelection(productVariants, {
        variantId: item.variantId,
        shadeId: item.shadeId,
        packSize: item.packSize,
        finish: item.finish,
      });
      const stockRows = chosenVariant
        ? (inventoryByVariantId.get(chosenVariant.id) ?? [])
        : [];
      const stock = stockStateFromInventory(stockRows);

      if (stock.stockCount <= 0) {
        return null;
      }

      const quantity = Math.min(item.quantity, stock.stockCount);
      const selectedShadeId = chosenVariant?.shade_id ?? item.shadeId ?? null;
      const pricing = await resolveCartPricing(
        resolvedClient,
        chosenVariant,
        product,
        selectedShadeId,
      );

      return {
        user_id: userId,
        product_id: product.id,
        product_variant_id: chosenVariant?.id ?? null,
        shade_id: selectedShadeId,
        shade_code_snapshot: item.shadeCode ?? chosenVariant?.shade_code_snapshot ?? null,
        shade_name_snapshot: item.shadeName ?? chosenVariant?.shade_name_snapshot ?? null,
        colour_family_snapshot: item.shadeFamily ?? null,
        hex_color_snapshot: item.shadeHexColor ?? null,
        pack_size_snapshot: item.packSize ?? chosenVariant?.pack_size ?? null,
        finish_snapshot: item.finish ?? chosenVariant?.finish ?? null,
        base_price_snapshot: pricing.basePrice,
        shade_extra_price_snapshot: pricing.shadeExtraPrice,
        final_unit_price_snapshot: pricing.finalPrice,
        sku_snapshot: item.sku ?? chosenVariant?.sku ?? null,
        quantity,
      } satisfies CartInsertRow;
    }),
  );
  const payload = resolvedPayload.filter(
    (row): row is CartInsertRow => row !== null,
  );

  const { error: deleteError } = await resolvedClient
    .from("cart_items")
    .delete()
    .eq("user_id", userId);
  if (deleteError) {
    return { error: deleteError.message };
  }

  if (payload.length > 0) {
    const { error } = await resolvedClient.from("cart_items").insert(payload as never);
    if (error) {
      return { error: error.message };
    }
  }

  return { error: null };
}

export async function validateCartAddition(
  item: CartItem,
  quantity: number,
  client?: SupabaseClient | null,
) {
  if (isQaBypassEnabled()) {
    return {
      error: null,
      product: {
        ...item,
        inStock: true,
        stockCount: item.stockCount ?? 99,
        reservedCount: item.reservedCount ?? 0,
        lowStockThreshold: item.lowStockThreshold ?? 10,
      } satisfies CartItem,
      quantity: Math.max(1, quantity),
    };
  }

  const resolvedClient = await getClient(client);

  if (!resolvedClient) {
    return { error: "Supabase is not configured." };
  }

  const { data: product, error: productError } = await resolvedClient
    .from("products")
    .select(
      "id, name, slug, selling_price, mrp, status, deleted_at, category_id, brand_id, department_id, og_image_url",
    )
    .eq("id", item.productId)
    .maybeSingle();

  if (productError || !product || product.status !== "active" || product.deleted_at) {
    return { error: "This product is no longer available." };
  }

  const { data: variants, error: variantError } = await resolvedClient
    .from("product_variants")
    .select(
      "id, product_id, sku, mrp_override, selling_price_override, shade_id, pack_size, unit, finish, base_price, shade_extra_price, adjustment_type, final_price, is_available, shade_code_snapshot, shade_name_snapshot, is_default, deleted_at",
    )
    .eq("product_id", item.productId)
    .is("deleted_at", null);

  if (variantError) {
    return { error: variantError.message };
  }

  const chosenVariant = resolveVariantStrict(variants as ProductVariantRow[], {
    variantId: item.variantId,
    shadeId: item.shadeId,
    packSize: item.packSize,
    finish: item.finish,
  });

  if (!chosenVariant) {
    return { error: "No purchasable variant is available for this product." };
  }

  if (!toNumber(chosenVariant.is_available === false ? 0 : 1, 1)) {
    return { error: "The selected variant is unavailable." };
  }

  const selectedShadeId = item.shadeId ?? chosenVariant.shade_id;
  if (selectedShadeId) {
    const [{ data: shade, error: shadeError }, { data: mappings, error: mappingError }] =
      await Promise.all([
        resolvedClient
          .from("shades")
          .select("id, brand_id, is_active, deleted_at")
          .eq("id", selectedShadeId)
          .maybeSingle(),
        resolvedClient
          .from("product_shades")
          .select("id, finish, is_available, deleted_at")
          .eq("product_id", item.productId)
          .eq("shade_id", selectedShadeId)
          .eq("is_available", true)
          .is("deleted_at", null),
      ]);
    if (
      shadeError ||
      mappingError ||
      !shade ||
      shade.deleted_at ||
      shade.is_active === false
    )
      return { error: "The selected shade is no longer available." };
    const compatible = (mappings ?? []).some(
      (mapping) =>
        typeof mapping.finish !== "string" ||
        mapping.finish.trim().toLowerCase() ===
          (item.finish ?? chosenVariant.finish ?? "").trim().toLowerCase(),
    );
    if (!compatible)
      return { error: "The selected shade is unavailable for this finish." };
  }

  const { data: inventoryRows, error: inventoryError } = await resolvedClient
    .from("inventory")
    .select(
      "product_variant_id, current_quantity, reserved_quantity, low_stock_threshold, stock_status, deleted_at",
    )
    .eq("product_variant_id", chosenVariant.id)
    .is("deleted_at", null);

  if (inventoryError) {
    return { error: inventoryError.message };
  }

  const stock = stockStateFromInventory((inventoryRows ?? []) as InventoryRow[]);
  if (stock.stockCount <= 0) {
    return { error: "This item is out of stock." };
  }

  if (quantity > stock.stockCount) {
    return { error: `Only ${stock.stockCount} left in stock.` };
  }

  const fallbackImage =
    typeof product.og_image_url === "string" ? product.og_image_url : "";
  const resolvedSlug =
    typeof product.slug === "string" ? product.slug : (item.slug ?? item.productId);
  const pricing = await resolveCartPricing(
    resolvedClient,
    chosenVariant,
    product as ProductRow,
    selectedShadeId,
  );
  const finalUnitPrice = pricing.finalPrice;

  return {
    error: null,
    product: {
      ...item,
      variantId: chosenVariant.id,
      shadeId: chosenVariant.shade_id ?? item.shadeId,
      shadeCode: item.shadeCode ?? chosenVariant.shade_code_snapshot ?? undefined,
      shadeName: item.shadeName ?? chosenVariant.shade_name_snapshot ?? undefined,
      packSize: item.packSize ?? chosenVariant.pack_size ?? undefined,
      finish: item.finish ?? chosenVariant.finish ?? undefined,
      sku: item.sku ?? chosenVariant.sku,
      basePrice: pricing.basePrice,
      shadeExtraPrice: pricing.shadeExtraPrice,
      finalUnitPrice,
      price: finalUnitPrice,
      image: item.image || fallbackImage,
      slug: resolvedSlug,
      category: item.category ?? "Category",
      compareAtPrice:
        toNumber(chosenVariant.mrp_override ?? product.mrp) > finalUnitPrice
          ? toNumber(chosenVariant.mrp_override ?? product.mrp)
          : undefined,
      inStock: true,
      stockCount: stock.stockCount,
      reservedCount: stock.reservedCount,
      lowStockThreshold: stock.lowStockThreshold,
    } satisfies CartItem,
    quantity: Math.min(quantity, stock.stockCount),
  };
}

export function cartItemCount(items: CartItem[]) {
  return activeCartItemCount(items);
}

export async function addValidatedCartItem(
  item: Omit<CartItem, "quantity">,
  quantity = 1,
  options?: { silent?: boolean },
) {
  const silent = options?.silent ?? false;

  if (typeof item.stockCount === "number" && item.stockCount <= 0) {
    if (!silent) {
      toast({
        title: "Unable to add to cart",
        description: "This item is out of stock.",
        variant: "danger",
      });
    }
    return { success: false, error: "This item is out of stock." };
  }

  if (isQaBypassEnabled()) {
    const product = { ...item, quantity: Math.max(1, quantity) } as CartItem;
    useCartStore.getState().addItem(product, quantity);
    if (!silent) {
      toast({
        title: "Added to cart",
        description: product.name,
        variant: "success",
      });
    }
    return { success: true, error: null };
  }

  const client = getSupabaseBrowserClient();
  const session = client ? await client.auth.getSession() : null;
  const user = session?.data.session?.user ?? null;

  if (user && client) {
    const result = await validateCartAddition(
      { ...item, quantity: 1 } as CartItem,
      quantity,
      client,
    );
    if (result.error || !result.product) {
      if (!silent) {
        toast({
          title: "Unable to add to cart",
          description: result.error ?? "This item is not available right now.",
          variant: "danger",
        });
      }
      return { success: false, error: result.error ?? "Unable to add item." };
    }

    useCartStore.getState().addItem(result.product, result.quantity);
    if (!silent) {
      toast({
        title: "Added to cart",
        description: result.product.name,
        variant: "success",
      });
    }
    return { success: true, error: null };
  }

  const available = item.stockCount ?? Number.POSITIVE_INFINITY;
  if (Number.isFinite(available) && quantity > available) {
    if (!silent) {
      toast({
        title: "Not enough stock",
        description: `Only ${available} left in stock.`,
        variant: "danger",
      });
    }
    return { success: false, error: "Not enough stock." };
  }

  useCartStore.getState().addItem(item, quantity);
  if (!silent) {
    toast({ title: "Added to cart", description: item.name, variant: "success" });
  }
  return { success: true, error: null };
}
