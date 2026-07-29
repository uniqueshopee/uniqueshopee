"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ensureCurrentUserProfile } from "@/lib/supabase/auth";
import type { CartItem } from "@/types";
import { useCartStore } from "@/store/cart-store";
import { toast } from "@/hooks/use-toast";

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  selling_price: number | string;
  mrp: number | string;
  status: string;
  deleted_at: string | null;
  category_id: string;
  brand_id: string;
  department_id: string;
  og_image_url: string | null;
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
  mrp_override: number | string | null;
  selling_price_override: number | string | null;
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
  quantity: number | string;
  deleted_at: string | null;
};

type CartInsertRow = {
  user_id: string;
  product_id: string;
  product_variant_id: string | null;
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

function firstImage(productId: string, images: ProductImageRow[]) {
  return (
    images.find((image) => image.product_id === productId && image.is_primary && image.deleted_at === null)?.image_url ??
    images
      .filter((image) => image.product_id === productId && image.deleted_at === null)
      .sort((left, right) => left.sort_order - right.sort_order)[0]?.image_url ??
    ""
  );
}

function stockStateFromInventory(inventories: InventoryRow[]) {
  const validRows = inventories.filter((row) => row.deleted_at === null);
  const stockCount = validRows.reduce((sum, row) => sum + toNumber(row.current_quantity), 0);
  const reservedCount = validRows.reduce((sum, row) => sum + toNumber(row.reserved_quantity), 0);
  const lowStockThreshold = validRows.length > 0 ? Math.max(...validRows.map((row) => toNumber(row.low_stock_threshold, 10))) : 10;
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

export async function loadRemoteCartItems(userId: string, client?: SupabaseClient | null) {
  const resolvedClient = await getClient(client);

  if (!resolvedClient) {
    return [] as CartItem[];
  }

  const profile = await ensureCurrentUserProfile(resolvedClient);
  if (!profile || profile.id !== userId) {
    return [] as CartItem[];
  }

  const [cartResult, productsResult, imagesResult, variantsResult, inventoryResult, categoriesResult, departmentsResult] =
    await Promise.all([
      resolvedClient.from("cart_items").select("id, product_id, product_variant_id, quantity, deleted_at").eq("user_id", userId).is("deleted_at", null),
      resolvedClient.from("products").select("id, name, slug, selling_price, mrp, status, deleted_at, category_id, brand_id, department_id, og_image_url").is("deleted_at", null),
      resolvedClient.from("product_images").select("product_id, image_url, is_primary, sort_order, deleted_at").is("deleted_at", null).order("sort_order", { ascending: true }),
      resolvedClient.from("product_variants").select("id, product_id, sku, mrp_override, selling_price_override, is_default, deleted_at").is("deleted_at", null),
      resolvedClient.from("inventory").select("product_variant_id, current_quantity, reserved_quantity, low_stock_threshold, stock_status, deleted_at").is("deleted_at", null),
      resolvedClient.from("categories").select("id, name").is("deleted_at", null),
      resolvedClient.from("departments").select("id, name").is("deleted_at", null),
    ]);

  if (cartResult.error || productsResult.error || imagesResult.error || variantsResult.error || inventoryResult.error) {
    return [] as CartItem[];
  }

  const products = (productsResult.data ?? []) as ProductRow[];
  const images = (imagesResult.data ?? []) as ProductImageRow[];
  const variants = (variantsResult.data ?? []) as ProductVariantRow[];
  const inventories = (inventoryResult.data ?? []) as InventoryRow[];
  const categories = new Map(((categoriesResult.data ?? []) as CategoryRow[]).map((row) => [row.id, row.name]));
  const departments = new Map(((departmentsResult.data ?? []) as DepartmentRow[]).map((row) => [row.id, row.name]));
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
      const chosenVariant =
        (row.product_variant_id ? variantRows.find((variant) => variant.id === row.product_variant_id) : null) ??
        variantRows.find((variant) => variant.is_default) ??
        variantRows[0] ??
        null;
      const inventoryRows = chosenVariant ? inventoryByVariantId.get(chosenVariant.id) ?? [] : [];
      const stock = stockStateFromInventory(inventoryRows);
      const quantity = Math.max(1, Math.min(toNumber(row.quantity, 1), stock.stockCount > 0 ? stock.stockCount : 1));
      const price = toNumber(chosenVariant?.selling_price_override ?? product.selling_price);
      const compareAtPrice = toNumber(chosenVariant?.mrp_override ?? product.mrp) > price ? toNumber(chosenVariant?.mrp_override ?? product.mrp) : undefined;
      const categoryName = categories.get(product.category_id) ?? "Category";
      const departmentName = departments.get(product.department_id) ?? "Department";

      return {
        productId: product.id,
        name: product.name,
        price,
        image: firstImage(product.id, images) || product.og_image_url || "",
        quantity,
        slug: product.slug,
        category: categoryName,
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

    const existing = acc.find((entry) => entry.productId === item.productId);
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
          .select("id, name, slug, selling_price, mrp, status, deleted_at, og_image_url")
          .in("id", productIds)
          .eq("status", "active")
          .is("deleted_at", null)
      : Promise.resolve({ data: [] as ProductRow[] }),
    productIds.length > 0
      ? resolvedClient
          .from("product_variants")
          .select("id, product_id, sku, mrp_override, selling_price_override, is_default, deleted_at")
          .in("product_id", productIds)
          .is("deleted_at", null)
      : Promise.resolve({ data: [] as ProductVariantRow[] }),
    productIds.length > 0
      ? resolvedClient
          .from("inventory")
          .select("product_variant_id, current_quantity, reserved_quantity, low_stock_threshold, stock_status, deleted_at")
          .is("deleted_at", null)
      : Promise.resolve({ data: [] as InventoryRow[] }),
  ]);

  if ((productResult as { error?: Error }).error || (variantsResult as { error?: Error }).error || (inventoryResult as { error?: Error }).error) {
    return { error: "Unable to validate cart items." };
  }

  const products = new Map(((productResult as { data?: ProductRow[] }).data ?? []).map((product) => [product.id, product]));
  const variants = ((variantsResult as { data?: ProductVariantRow[] }).data ?? []).filter((variant) => {
    if (!productIds.includes(variant.product_id)) {
      return false;
    }
    variantIds.push(variant.id);
    return true;
  });
  const inventoryRows = ((inventoryResult as { data?: InventoryRow[] }).data ?? []).filter((row) => variantIds.includes(row.product_variant_id));
  const inventoryByVariantId = new Map<string, InventoryRow[]>();
  for (const row of inventoryRows) {
    const list = inventoryByVariantId.get(row.product_variant_id) ?? [];
    list.push(row);
    inventoryByVariantId.set(row.product_variant_id, list);
  }

  const payload = normalized
    .map((item) => {
      const product = products.get(item.productId);
      if (!product || product.status !== "active" || product.deleted_at) {
        return null;
      }

      const productVariants = variants.filter((variant) => variant.product_id === product.id);
      const chosenVariant = productVariants.find((variant) => variant.is_default) ?? productVariants[0] ?? null;
      const stockRows = chosenVariant ? inventoryByVariantId.get(chosenVariant.id) ?? [] : [];
      const stock = stockStateFromInventory(stockRows);

      if (stock.stockCount <= 0) {
        return null;
      }

      const quantity = Math.min(item.quantity, stock.stockCount);

      return {
        user_id: userId,
        product_id: product.id,
        product_variant_id: chosenVariant?.id ?? null,
        quantity,
      } satisfies CartInsertRow;
    })
    .filter((row): row is CartInsertRow => row !== null);

  const { error: deleteError } = await resolvedClient.from("cart_items").delete().eq("user_id", userId);
  if (deleteError) {
    return { error: deleteError.message };
  }

  if (payload.length > 0) {
    const { error } = await resolvedClient.from("cart_items").insert(payload);
    if (error) {
      return { error: error.message };
    }
  }

  return { error: null };
}

export async function validateCartAddition(item: CartItem, quantity: number, client?: SupabaseClient | null) {
  const resolvedClient = await getClient(client);

  if (!resolvedClient) {
    return { error: "Supabase is not configured." };
  }

  const { data: product, error: productError } = await resolvedClient
    .from("products")
    .select("id, name, slug, selling_price, mrp, status, deleted_at, category_id, brand_id, department_id, og_image_url")
    .eq("id", item.productId)
    .maybeSingle();

  if (productError || !product || product.status !== "active" || product.deleted_at) {
    return { error: "This product is no longer available." };
  }

  const { data: variants, error: variantError } = await resolvedClient
    .from("product_variants")
    .select("id, product_id, sku, mrp_override, selling_price_override, is_default, deleted_at")
    .eq("product_id", item.productId)
    .is("deleted_at", null);

  if (variantError) {
    return { error: variantError.message };
  }

  const chosenVariant = (variants as ProductVariantRow[]).find((variant) => variant.is_default) ?? (variants as ProductVariantRow[])[0] ?? null;

  if (!chosenVariant) {
    return { error: "No purchasable variant is available for this product." };
  }

  const { data: inventoryRows, error: inventoryError } = await resolvedClient
    .from("inventory")
    .select("product_variant_id, current_quantity, reserved_quantity, low_stock_threshold, stock_status, deleted_at")
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

  const fallbackImage = typeof product.og_image_url === "string" ? product.og_image_url : "";
  const resolvedSlug = typeof product.slug === "string" ? product.slug : item.slug ?? item.productId;

  return {
    error: null,
    product: {
      ...item,
      price: toNumber(chosenVariant.selling_price_override ?? product.selling_price),
      image: item.image || fallbackImage,
      slug: resolvedSlug,
      category: item.category ?? "Category",
      compareAtPrice:
        toNumber(chosenVariant.mrp_override ?? product.mrp) > toNumber(chosenVariant.selling_price_override ?? product.selling_price)
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
  const client = getSupabaseBrowserClient();
  const session = client ? await client.auth.getSession() : null;
  const user = session?.data.session?.user ?? null;

  if (user && client) {
    const result = await validateCartAddition({ ...item, quantity: 1 } as CartItem, quantity, client);
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
