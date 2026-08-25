import { NextRequest, NextResponse } from "next/server";
import { getSupabasePublicServerClient } from "@/lib/supabase/public-server";

const PAGE_SIZE = 24;
const MAPPING_PAGE_SIZE = 1000;
const SHADE_ID_CHUNK_SIZE = 250;

function clean(value: string | null) {
  return value?.trim() ?? "";
}

function paintShadesDebug(...args: unknown[]) {
  if (process.env.NODE_ENV !== "production") console.debug("[PaintShadesAPI]", ...args);
}

function describeDatabaseError(error: unknown) {
  if (!(error instanceof Error)) return { errorObject: JSON.stringify(error) };
  const cause = error.cause as { code?: string; message?: string } | undefined;
  return {
    errorName: error.name,
    errorMessage: error.message,
    causeCode: cause?.code ?? null,
    causeMessage: cause?.message ?? null,
    errorObject: JSON.stringify(error),
  };
}

export async function GET(request: NextRequest) {
  const client = getSupabasePublicServerClient();
  if (!client) {
    return NextResponse.json(
      { error: "Shade catalogue is unavailable." },
      { status: 503 },
    );
  }

  const params = request.nextUrl.searchParams;
  const productId = clean(params.get("productId"));
  const finish = clean(params.get("finish"));
  const family = clean(params.get("colourFamily"));
  const search = clean(params.get("search"));
  const tone = clean(params.get("tone"));
  const depth = clean(params.get("depth"));
  const mode = params.get("mode") === "popular" ? "popular" : "all";
  const page = Math.max(Number.parseInt(params.get("page") ?? "1", 10) || 1, 1);

  if (!productId) {
    return NextResponse.json({ error: "productId is required." }, { status: 400 });
  }

  const { data: product } = await client
    .from("products")
    .select("brand_id")
    .eq("id", productId)
    .maybeSingle();

  const mappings: Array<{ shade_id: string; finish: string | null }> = [];
  for (let offset = 0; ; offset += MAPPING_PAGE_SIZE) {
    const { data: mappingPage, error: mappingsError } = await client
      .from("product_shades")
      .select("shade_id, finish")
      .eq("product_id", productId)
      .eq("is_available", true)
      .is("deleted_at", null)
      .range(offset, offset + MAPPING_PAGE_SIZE - 1);

    if (mappingsError) {
      paintShadesDebug("mapping query failed", {
        productId,
        finish,
        colourFamily: family,
        offset,
        ...describeDatabaseError(mappingsError),
      });
      return NextResponse.json({ error: mappingsError.message }, { status: 500 });
    }

    mappings.push(
      ...((mappingPage ?? []) as Array<{ shade_id: string; finish: string | null }>),
    );
    if (!mappingPage || mappingPage.length < MAPPING_PAGE_SIZE) break;
  }

  const shadeIds = [
    ...new Set(
      mappings
        .filter(
          (mapping) =>
            !finish ||
            typeof mapping.finish !== "string" ||
            mapping.finish.trim().toLowerCase() === finish.toLowerCase(),
        )
        .map((mapping) => mapping.shade_id),
    ),
  ];

  paintShadesDebug("mapping result", {
    productId,
    brandId: product?.brand_id ?? null,
    finish,
    colourFamily: family || "All families",
    mappingCount: shadeIds.length,
  });

  if (shadeIds.length === 0) {
    return NextResponse.json({
      items: [],
      total: 0,
      page,
      pageSize: PAGE_SIZE,
      hasMore: false,
    });
  }

  const shadeRows: Array<Record<string, unknown>> = [];
  for (let offset = 0; offset < shadeIds.length; offset += SHADE_ID_CHUNK_SIZE) {
    const ids = shadeIds.slice(offset, offset + SHADE_ID_CHUNK_SIZE);
    const { data, error } = await client
      .from("shades")
      .select(
        "id, brand_id, shade_code, shade_name, color_family, color_sub_family, hex_color, rgb, image_url, tone, depth, base_id, is_popular, is_featured, is_active, sort_order",
      )
      .in("id", ids)
      .eq("is_active", true)
      .is("deleted_at", null);

    if (error) {
      paintShadesDebug("shade query failed", {
        productId,
        finish,
        colourFamily: family,
        chunkOffset: offset,
        chunkSize: ids.length,
        ...describeDatabaseError(error),
      });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    shadeRows.push(...((data ?? []) as Array<Record<string, unknown>>));
  }

  const uniqueShades = [...new Map(shadeRows.map((shade) => [shade.id, shade])).values()];
  const filteredShades = uniqueShades.filter((shade) => {
    const shadeFamily = typeof shade.color_family === "string" ? shade.color_family : "";
    const shadeTone = typeof shade.tone === "string" ? shade.tone : null;
    const shadeDepth = typeof shade.depth === "string" ? shade.depth : null;
    const shadeName = typeof shade.shade_name === "string" ? shade.shade_name : "";
    const shadeCode = typeof shade.shade_code === "string" ? shade.shade_code : "";
    return (
      (!family || shadeFamily.toLowerCase() === family.toLowerCase()) &&
      (!tone || shadeTone === tone) &&
      (!depth || shadeDepth === depth) &&
      (!search ||
        `${shadeName} ${shadeCode}`.toLowerCase().includes(search.toLowerCase()))
    );
  });

  filteredShades.sort((left, right) => {
    if (mode === "popular") {
      const featuredDifference =
        Number(Boolean(right.is_featured)) - Number(Boolean(left.is_featured));
      if (featuredDifference !== 0) return featuredDifference;
      const popularDifference =
        Number(Boolean(right.is_popular)) - Number(Boolean(left.is_popular));
      if (popularDifference !== 0) return popularDifference;
    }
    const sortDifference = Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0);
    if (sortDifference !== 0) return sortDifference;
    return String(left.shade_name ?? "").localeCompare(String(right.shade_name ?? ""));
  });

  const count = filteredShades.length;
  const data = filteredShades.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  paintShadesDebug("shade result", {
    productId,
    finish,
    colourFamily: family || "All families",
    mappingCount: shadeIds.length,
    shadeCount: data.length,
    total: count,
  });

  return NextResponse.json({
    items: data,
    total: count,
    page,
    pageSize: PAGE_SIZE,
    hasMore: page * PAGE_SIZE < count,
  });
}
