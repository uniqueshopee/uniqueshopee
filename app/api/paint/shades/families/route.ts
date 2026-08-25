import { NextRequest, NextResponse } from "next/server";
import { getSupabasePublicServerClient } from "@/lib/supabase/public-server";

const MAPPING_PAGE_SIZE = 1000;

type FamilyRow = {
  shade_id: string;
  finish: string | null;
  shades:
    | { color_family: string | null; hex_color: string | null }
    | { color_family: string | null; hex_color: string | null }[]
    | null;
};

function clean(value: string | null) {
  return value?.trim() ?? "";
}

function familyDebug(...args: unknown[]) {
  if (process.env.NODE_ENV !== "production")
    console.debug("[PaintShadeFamiliesAPI]", ...args);
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

  if (!productId) {
    return NextResponse.json({ error: "productId is required." }, { status: 400 });
  }

  // Select only family metadata through the existing compatibility relationship.
  // The family endpoint never transfers shade IDs or catalogue rows to the client.
  const rows: FamilyRow[] = [];
  for (let offset = 0; ; offset += MAPPING_PAGE_SIZE) {
    const { data, error } = await client
      .from("product_shades")
      .select("shade_id, finish, shades!inner(color_family, hex_color)")
      .eq("product_id", productId)
      .eq("is_available", true)
      .is("deleted_at", null)
      .eq("shades.is_active", true)
      .is("shades.deleted_at", null)
      .range(offset, offset + MAPPING_PAGE_SIZE - 1);

    if (error) {
      familyDebug("database query failed", {
        route: "/api/paint/shades/families",
        operation: "product_shades with shades relation",
        productId,
        finish,
        offset,
        ...describeDatabaseError(error),
      });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    rows.push(...((data ?? []) as unknown as FamilyRow[]));
    if (!data || data.length < MAPPING_PAGE_SIZE) break;
  }

  const families = new Map<
    string,
    { name: string; count: number; swatch: string | null }
  >();
  const seenShadeIds = new Set<string>();
  for (const rawRow of rows) {
    if (
      finish &&
      typeof rawRow.finish === "string" &&
      rawRow.finish.trim().toLowerCase() !== finish.toLowerCase()
    ) {
      continue;
    }

    const shade = Array.isArray(rawRow.shades) ? rawRow.shades[0] : rawRow.shades;
    if (!shade) continue;
    if (seenShadeIds.has(rawRow.shade_id)) continue;
    seenShadeIds.add(rawRow.shade_id);
    const name = shade?.color_family?.trim().replace(/\s+/g, " ") ?? "";
    if (!name) continue;
    const key = name.toLowerCase();
    const current = families.get(key);
    if (current) {
      current.count += 1;
      current.swatch ||= shade.hex_color;
    } else {
      families.set(key, { name, count: 1, swatch: shade.hex_color });
    }
  }

  return NextResponse.json(
    [...families.values()].sort((left, right) => left.name.localeCompare(right.name)),
  );
}
