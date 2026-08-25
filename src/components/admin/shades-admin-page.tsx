"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, FormField } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { AdminActionButton, AdminSectionCard, PageHeader } from "@/components/admin/admin-kit";
import { useAuth } from "@/components/auth/auth-provider";
import { toast } from "@/hooks/use-toast";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type BrandRow = {
  id: string;
  name: string;
  slug: string;
  deleted_at: string | null;
};

type ShadeRow = {
  id: string;
  brand_id: string | null;
  shade_code: string;
  shade_name: string;
  color_family: string;
  color_sub_family: string | null;
  hex_color: string | null;
  rgb: string | null;
  tone: "warm" | "cool" | "neutral" | null;
  depth: "light" | "medium" | "dark" | null;
  base_id: string | null;
  is_popular: boolean;
  is_featured: boolean;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

type ShadeForm = {
  brandId: string;
  shadeCode: string;
  shadeName: string;
  colorFamily: string;
  colorSubFamily: string;
  hexColor: string;
  rgb: string;
  tone: "" | "warm" | "cool" | "neutral";
  depth: "" | "light" | "medium" | "dark";
  baseId: string;
  isPopular: boolean;
  isFeatured: boolean;
  imageUrl: string;
  isActive: boolean;
  sortOrder: string;
};

type ImportRow = {
  rowNumber: number;
  values: Record<string, string>;
};

type ImportIssue = {
  rowNumber: number;
  shadeCode: string;
  shadeName: string;
  status: "Skipped" | "Failed";
  reason: string;
};

type ImportCandidate = {
  rowNumber: number;
  values: Record<string, string>;
  existingId?: string;
};

type ImportAnalysis = {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  newRecords: number;
  updates: number;
  skipped: number;
  candidates: ImportCandidate[];
  issues: ImportIssue[];
};

type ImportSummary = {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  elapsedMs: number;
  issues: ImportIssue[];
};

const EMPTY_FORM: ShadeForm = {
  brandId: "",
  shadeCode: "",
  shadeName: "",
  colorFamily: "",
  colorSubFamily: "",
  hexColor: "",
  rgb: "",
  tone: "",
  depth: "",
  baseId: "",
  isPopular: false,
  isFeatured: false,
  imageUrl: "",
  isActive: true,
  sortOrder: "0",
};

function cleanText(value: string) {
  return value.trim();
}

function normalizeHex(value: string) {
  return value.trim().toUpperCase();
}

function normalizeRgb(value: string) {
  return value.split(",").map((part) => part.trim()).join(",");
}

function isValidRgb(value: string) {
  const parts = value.split(",").map((part) => part.trim());
  return parts.length === 3 && parts.every((part) => /^\d+$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
}

function shadeSaveError(error: { code?: string; message?: string }) {
  const message = error.message ?? "";
  if (error.code === "23505" || /duplicate|unique/i.test(message)) {
    return "That shade code already exists for the selected brand.";
  }
  if (error.code === "42501" || /permission|row-level security|policy/i.test(message)) {
    return "Unable to save shade. You do not have permission to create or edit shades.";
  }
  return "Unable to save shade. Please try again.";
}

function normalizeCsvHeader(value: string) {
  const normalized = value.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const aliases: Record<string, string> = {
    brand_name: "brand",
    shadecode: "shade_code",
    shade_code: "shade_code",
    shadename: "shade_name",
    shade_name: "shade_name",
    colourfamily: "colour_family",
    colorfamily: "colour_family",
    colour_family: "colour_family",
    color_family: "colour_family",
    colour_subfamily: "colour_sub_family",
    color_subfamily: "colour_sub_family",
    color_sub_family: "colour_sub_family",
  };
  return aliases[normalized] ?? normalized;
}

function parseCsv(text: string): { headers: string[]; rows: ImportRow[]; error: string | null } {
  const matrix: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let justClosedQuote = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index] ?? "";
    const next = text[index + 1];
    if (quoted) {
      if (character === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
        justClosedQuote = true;
      } else {
        cell += character;
      }
    } else if (character === '"' && cell.length === 0) {
      quoted = true;
      justClosedQuote = false;
    } else if (character === ",") {
      row.push(cell.trim());
      cell = "";
      justClosedQuote = false;
    } else if (character === "\r" || character === "\n") {
      if (character === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      cell = "";
      if (row.some((value) => value.length > 0)) matrix.push(row);
      row = [];
      justClosedQuote = false;
    } else if (justClosedQuote && character.trim().length > 0) {
      return { headers: [], rows: [], error: "Unexpected characters after a quoted CSV value." };
    } else {
      cell += character;
    }
  }

  if (quoted) return { headers: [], rows: [], error: "The CSV contains an unterminated quoted value." };
  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    if (row.some((value) => value.length > 0)) matrix.push(row);
  }
  if (matrix.length < 2) return { headers: [], rows: [], error: "The CSV must contain a header row and at least one data row." };

  const headers = (matrix[0] ?? []).map(normalizeCsvHeader);
  const duplicateHeaders = headers.filter((header, index) => header && headers.indexOf(header) !== index);
  if (duplicateHeaders.length > 0) return { headers, rows: [], error: `Duplicate CSV header: ${duplicateHeaders[0]}.` };
  const rows = matrix.slice(1).map((values, index) => ({
    rowNumber: index + 2,
    values: Object.fromEntries(headers.map((header, valueIndex) => [header, (values[valueIndex] ?? "").trim()])),
  }));
  return { headers, rows, error: null };
}

function parseBoolean(value: string) {
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes"].includes(normalized)) return true;
  if (["false", "0", "no"].includes(normalized)) return false;
  return null;
}

function validRgb(value: string) {
  const parts = value.split(",").map((part) => part.trim());
  return parts.length === 3 && parts.every((part) => /^\d+$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
}

// The database and shared shade types persist "dark". The customer picker
// uses "deep" as the user-facing label and already maps it to "dark".
// Keep the importer on that same canonical storage value.
type CanonicalShadeDepth = "light" | "medium" | "dark";
const SHADE_DEPTH_ALIASES: Record<string, CanonicalShadeDepth> = {
  light: "light",
  medium: "medium",
  dark: "dark",
  deep: "dark",
};

function normalizeShadeDepth(value: string | undefined) {
  return SHADE_DEPTH_ALIASES[(value ?? "").trim().toLowerCase()] ?? null;
}

export function ShadesAdminPage() {
  const { role } = useAuth();
  // Keep the UI permission gate aligned with public.is_admin_user(), which
  // permits admin, manager, and staff to manage shade records.
  const canManage = role === "admin" || role === "manager" || role === "staff";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<ShadeRow[]>([]);
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [bases, setBases] = useState<Array<{ id: string; name: string; code: string | null }>>([]);
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [familyFilter, setFamilyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importHeaderError, setImportHeaderError] = useState("");
  const [importAnalysis, setImportAnalysis] = useState<ImportAnalysis | null>(null);
  const [importAnalyzing, setImportAnalyzing] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; processed: number; totalRows: number } | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importMode, setImportMode] = useState<"create" | "update" | "upsert">("create");
  const pageSize = 40;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShadeId, setEditingShadeId] = useState<string | null>(null);
  const [form, setForm] = useState<ShadeForm>(EMPTY_FORM);

  const brandNameById = useMemo(() => new Map(brands.map((brand) => [brand.id, brand.name])), [brands]);

  const loadData = async () => {
    setLoading(true);
    const client = getSupabaseBrowserClient();
    if (!client) {
      setRows([]);
      setBrands([]);
      setLoading(false);
      return;
    }

    let shadeQuery = client
        .from("shades")
        .select("id, brand_id, shade_code, shade_name, color_family, color_sub_family, hex_color, rgb, tone, depth, base_id, is_popular, is_featured, image_url, is_active, sort_order, deleted_at, created_at, updated_at", { count: "exact" })
        .is("deleted_at", null)
        .order("sort_order", { ascending: true })
        .range((page - 1) * pageSize, page * pageSize - 1);
    if (search.trim()) shadeQuery = shadeQuery.or(`shade_name.ilike.%${search.trim()}%,shade_code.ilike.%${search.trim()}%`);
    if (brandFilter) shadeQuery = shadeQuery.eq("brand_id", brandFilter);
    if (familyFilter.trim()) shadeQuery = shadeQuery.ilike("color_family", familyFilter.trim());
    if (statusFilter === "active") shadeQuery = shadeQuery.eq("is_active", true);
    if (statusFilter === "inactive") shadeQuery = shadeQuery.eq("is_active", false);

    const [shadeResult, brandResult, baseResult] = await Promise.all([
      shadeQuery,
      client.from("brands").select("id, name, slug, deleted_at").is("deleted_at", null).order("name", { ascending: true }),
      client.from("paint_bases").select("id, name, code").is("deleted_at", null).eq("is_active", true).order("sort_order", { ascending: true }),
    ]);

    if (!shadeResult.error) {
      setRows((shadeResult.data ?? []) as ShadeRow[]);
      setTotal(shadeResult.count ?? 0);
    }

    if (!brandResult.error) {
      setBrands((brandResult.data ?? []) as BrandRow[]);
    }
    if (!baseResult.error) setBases((baseResult.data ?? []) as Array<{ id: string; name: string; code: string | null }>);

    setLoading(false);
  };

  useEffect(() => {
    void loadData();
    // loadData intentionally reads the current query state; including the recreated function would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandFilter, familyFilter, page, search, statusFilter]);

  const openCreate = () => {
    setEditingShadeId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (row: ShadeRow) => {
    setEditingShadeId(row.id);
    setForm({
      brandId: row.brand_id ?? "",
      shadeCode: row.shade_code,
      shadeName: row.shade_name,
      colorFamily: row.color_family,
      colorSubFamily: row.color_sub_family ?? "",
      hexColor: row.hex_color ?? "",
      rgb: row.rgb ?? "",
      tone: row.tone ?? "",
      depth: row.depth ?? "",
      baseId: row.base_id ?? "",
      isPopular: row.is_popular,
      isFeatured: row.is_featured,
      imageUrl: row.image_url ?? "",
      isActive: row.is_active,
      sortOrder: String(row.sort_order),
    });
    setDialogOpen(true);
  };

  const saveShade = async () => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      toast({ title: "Supabase unavailable", description: "Cannot save shades right now.", variant: "danger" });
      return;
    }

    const shadeCode = cleanText(form.shadeCode);
    const shadeName = cleanText(form.shadeName);
    const colorFamily = cleanText(form.colorFamily);
    const hexColor = normalizeHex(form.hexColor);
    const rgb = normalizeRgb(form.rgb);
    const sortOrder = Number(form.sortOrder.trim());

    if (!shadeCode || !shadeName || !colorFamily) {
      toast({ title: "Missing fields", description: "Shade code, shade name, and color family are required.", variant: "danger" });
      return;
    }
    if (hexColor && !/^#([0-9A-F]{3}|[0-9A-F]{6})$/.test(hexColor)) {
      toast({ title: "Invalid HEX color", description: "HEX color must be a valid value such as #4169E1.", variant: "danger" });
      return;
    }
    if (rgb && !isValidRgb(rgb)) {
      toast({ title: "Invalid RGB value", description: "RGB must use the format R,G,B, for example 65,105,225.", variant: "danger" });
      return;
    }
    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      toast({ title: "Invalid sort order", description: "Sort order must be a whole number greater than or equal to 0.", variant: "danger" });
      return;
    }

    const duplicateQuery = client.from("shades").select("id").ilike("shade_code", shadeCode).is("deleted_at", null).limit(1);
    if (form.brandId) duplicateQuery.eq("brand_id", form.brandId);
    if (editingShadeId) duplicateQuery.neq("id", editingShadeId);
    const { data: duplicateRows, error: duplicateError } = await duplicateQuery;
    if (duplicateError) {
      // Duplicate detection is a convenience check only. The database unique
      // index and the insert response remain authoritative, so a read-policy
      // or transient lookup failure must not block a valid save attempt.
      if (process.env.NODE_ENV !== "production") console.warn("Shade duplicate preflight failed; continuing to insert", { code: duplicateError.code, message: duplicateError.message });
    }
    if ((duplicateRows ?? []).length > 0) {
      const brandName = brandNameById.get(form.brandId) ?? "the selected brand";
      toast({ title: "Duplicate shade code", description: `Shade code ${shadeCode} already exists for ${brandName}.`, variant: "danger" });
      return;
    }

    setSaving(true);
    const payload = {
      brand_id: form.brandId || null,
      shade_code: shadeCode,
      shade_name: shadeName,
      color_family: colorFamily,
      color_sub_family: cleanText(form.colorSubFamily) || null,
      hex_color: hexColor || null,
      rgb: rgb || null,
      tone: form.tone || null,
      depth: form.depth || null,
      base_id: form.baseId || null,
      is_popular: form.isPopular,
      is_featured: form.isFeatured,
      image_url: cleanText(form.imageUrl) || null,
      is_active: form.isActive,
      sort_order: sortOrder,
      deleted_at: null,
    };

    const result = editingShadeId
      ? await client.from("shades").update(payload).eq("id", editingShadeId)
      : await client.from("shades").insert(payload);
    const { error } = result;
    setSaving(false);

    if (error) {
      if (process.env.NODE_ENV !== "production") console.error("Shade save failed", { code: error.code, message: error.message, details: error.details, hint: error.hint });
      toast({ title: "Shade not saved", description: shadeSaveError(error), variant: "danger" });
      return;
    }

    toast({ title: editingShadeId ? "Shade updated" : "Shade created", description: shadeName, variant: "success" });
    setDialogOpen(false);
    setEditingShadeId(null);
    setForm(EMPTY_FORM);
    await loadData();
  };

  const deleteShade = async (row: ShadeRow) => {
    const client = getSupabaseBrowserClient();
    if (!client) return;

    const { error } = await client.from("shades").update({ deleted_at: new Date().toISOString() }).eq("id", row.id);
    if (error) {
      toast({ title: "Shade not removed", description: error.message, variant: "danger" });
      return;
    }

    toast({ title: "Shade deactivated", description: row.shade_name, variant: "warning" });
    await loadData();
  };

  const analyzeImport = async () => {
    const client = getSupabaseBrowserClient();
    if (!client || importRows.length === 0 || importHeaderError) return;
    setImportAnalyzing(true);
    const brandIdByName = new Map(brands.map((brand) => [brand.name.toLowerCase(), brand.id]));
    const brandIds = [...new Set(importRows.map(({ values }) => brandIdByName.get((values.brand ?? "").toLowerCase())).filter((id): id is string => Boolean(id)))];
    const { data: existing, error } = brandIds.length > 0
      ? await client.from("shades").select("id, brand_id, shade_code").in("brand_id", brandIds).is("deleted_at", null)
      : { data: [], error: null };
    if (error) {
      setImportAnalyzing(false);
      toast({ title: "Preview failed", description: error.message, variant: "danger" });
      return;
    }
    const existingByKey = new Map(((existing ?? []) as Array<{ id: string; brand_id: string; shade_code: string }>).map((row) => [`${row.brand_id}:${row.shade_code.toLowerCase().trim()}`, row.id]));
    const seen = new Set<string>();
    const candidates: ImportCandidate[] = [];
    const issues: ImportIssue[] = [];
    let valid = 0;
    let duplicates = 0;

    for (const importRow of importRows) {
      const values = importRow.values;
      const shadeCode = (values.shade_code ?? "").trim();
      const shadeName = (values.shade_name ?? "").trim();
      const brand = (values.brand ?? "").trim();
      const keyBrandId = brandIdByName.get(brand.toLowerCase());
      const key = `${keyBrandId ?? brand.toLowerCase()}:${shadeCode.toLowerCase()}`;
      const rowErrors: string[] = [];
      if (!brand) rowErrors.push("Missing brand");
      else if (!keyBrandId) rowErrors.push("Brand not found");
      if (!shadeCode) rowErrors.push("Missing shade code");
      if (!shadeName) rowErrors.push("Missing shade name");
      if (!(values.colour_family ?? "").trim()) rowErrors.push("Missing colour family");
      if (values.hex && !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(values.hex.trim())) rowErrors.push("Invalid HEX");
      if (values.rgb && !validRgb(values.rgb)) rowErrors.push("Invalid RGB");
      if (values.tone && !["warm", "cool", "neutral"].includes(values.tone.toLowerCase())) rowErrors.push("Invalid tone");
      if (values.depth && !normalizeShadeDepth(values.depth)) rowErrors.push("Invalid depth");
      if (values.sort_order && (!/^\d+$/.test(values.sort_order) || Number(values.sort_order) < 0)) rowErrors.push("Invalid sort order");
      for (const field of ["is_popular", "is_featured", "is_active"]) {
        if (values[field] && parseBoolean(values[field]) === null) rowErrors.push(`Invalid ${field}`);
      }
      if (values.base) {
        const baseValue = values.base ?? "";
        const base = bases.find((item) => item.name.toLowerCase() === baseValue.toLowerCase() || item.code?.toLowerCase() === baseValue.toLowerCase());
        if (!base) rowErrors.push("Paint base not found");
      }
      if (rowErrors.length > 0) {
        issues.push({ rowNumber: importRow.rowNumber, shadeCode, shadeName, status: "Failed", reason: rowErrors.join("; ") });
        continue;
      }
      if (seen.has(key)) {
        duplicates += 1;
        issues.push({ rowNumber: importRow.rowNumber, shadeCode, shadeName, status: "Skipped", reason: "Duplicate shade code inside CSV" });
        continue;
      }
      seen.add(key);
      valid += 1;
      const existingId = existingByKey.get(key);
      if (importMode === "create" && existingId) {
        issues.push({ rowNumber: importRow.rowNumber, shadeCode, shadeName, status: "Skipped", reason: "Shade code already exists" });
        continue;
      }
      if (importMode === "update" && !existingId) {
        issues.push({ rowNumber: importRow.rowNumber, shadeCode, shadeName, status: "Skipped", reason: "Existing shade not found" });
        continue;
      }
      candidates.push({ rowNumber: importRow.rowNumber, values, existingId });
    }
    setImportAnalysis({
      total: importRows.length,
      valid,
      invalid: issues.filter((issue) => issue.status === "Failed").length,
      duplicates,
      newRecords: candidates.filter((candidate) => !candidate.existingId).length,
      updates: candidates.filter((candidate) => Boolean(candidate.existingId)).length,
      skipped: issues.filter((issue) => issue.status === "Skipped").length,
      candidates,
      issues,
    });
    setImportAnalyzing(false);
  };

  const buildImportPayload = (candidate: ImportCandidate) => {
    const row = candidate.values;
    const brandId = brands.find((brand) => brand.name.toLowerCase() === (row.brand ?? "").toLowerCase())?.id ?? null;
    const base = bases.find((item) => item.name.toLowerCase() === (row.base ?? "").toLowerCase() || item.code?.toLowerCase() === (row.base ?? "").toLowerCase());
    return {
      ...(candidate.existingId ? { id: candidate.existingId } : {}),
      brand_id: brandId,
      shade_code: (row.shade_code ?? "").trim(),
      shade_name: (row.shade_name ?? "").trim(),
      color_family: (row.colour_family ?? "").trim(),
      color_sub_family: row.colour_sub_family || null,
      hex_color: row.hex ? row.hex.toUpperCase() : null,
      rgb: row.rgb || null,
      tone: row.tone ? row.tone.toLowerCase() : null,
      depth: row.depth ? normalizeShadeDepth(row.depth) : null,
      base_id: base?.id ?? null,
      image_url: row.image_url || null,
      is_popular: row.is_popular ? parseBoolean(row.is_popular) : false,
      is_featured: row.is_featured ? parseBoolean(row.is_featured) : false,
      sort_order: row.sort_order ? Number(row.sort_order) : 0,
      is_active: row.is_active ? parseBoolean(row.is_active) : true,
    };
  };

  const downloadImportIssues = (issues: ImportIssue[]) => {
    const csv = ["CSV Row,Shade Code,Shade Name,Status,Reason", ...issues.map((issue) => [issue.rowNumber, issue.shadeCode, issue.shadeName, issue.status, issue.reason].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "shade-import-errors.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const importCsv = async () => {
    const client = getSupabaseBrowserClient();
    if (!client || !importAnalysis || importAnalysis.candidates.length === 0) return;
    const startedAt = Date.now();
    const chunkSize = 250;
    const chunks = Array.from({ length: Math.ceil(importAnalysis.candidates.length / chunkSize) }, (_, index) => importAnalysis.candidates.slice(index * chunkSize, (index + 1) * chunkSize));
    let created = 0;
    let updated = 0;
    const issues = [...importAnalysis.issues];
    setSaving(true);
    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index] ?? [];
      setImportProgress({ current: index + 1, total: chunks.length, processed: index * chunkSize, totalRows: importAnalysis.candidates.length });
      const payload = chunk.map(buildImportPayload);
      let error: { message: string } | null = null;
      const attempts = importMode === "create" ? 1 : 3;
      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        const result = importMode === "create"
          ? await client.from("shades").insert(payload.map(({ id: _id, ...row }) => row) as never)
          : await client.from("shades").upsert(payload as never, { onConflict: "id" });
        error = result.error ? { message: result.error.message } : null;
        if (!error) break;
      }
      if (error) {
        for (const candidate of chunk) issues.push({ rowNumber: candidate.rowNumber, shadeCode: candidate.values.shade_code ?? "", shadeName: candidate.values.shade_name ?? "", status: "Failed", reason: `Chunk ${index + 1} failed: ${error.message}` });
      } else if (importMode === "create") {
        created += chunk.length;
      } else {
        updated += chunk.filter((candidate) => Boolean(candidate.existingId)).length;
        created += chunk.filter((candidate) => !candidate.existingId).length;
      }
      setImportProgress({ current: index + 1, total: chunks.length, processed: Math.min((index + 1) * chunkSize, importAnalysis.candidates.length), totalRows: importAnalysis.candidates.length });
    }
    const failed = issues.filter((issue) => issue.status === "Failed").length - importAnalysis.issues.filter((issue) => issue.status === "Failed").length;
    const summary: ImportSummary = { total: importRows.length, created, updated, skipped: issues.filter((issue) => issue.status === "Skipped").length, failed, elapsedMs: Date.now() - startedAt, issues };
    setImportSummary(summary);
    setImportProgress(null);
    setSaving(false);
    await loadData();
  };

  if (loading) {
    return <div className="rounded-[1.6rem] border border-white/80 bg-white/92 p-6 shadow-[var(--shadow-lg)]">Loading shades...</div>;
  }

  return (
    <section className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Shades" }]}
        title="Shades"
        subtitle="Create, edit, and deactivate paint shades for the live catalog."
        actions={<div className="flex flex-wrap gap-2"><AdminActionButton variant="outline" onClick={() => setImportOpen(true)}>Import CSV</AdminActionButton><AdminActionButton variant="accent" onClick={openCreate}>Add Shade</AdminActionButton></div>}
      />

      <AdminSectionCard title="Shade Directory" description="Digital shade previews and availability metadata.">
        <div className="mb-4 grid gap-3 rounded-[1.2rem] border border-border/70 bg-background-secondary/30 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name or code" aria-label="Search shade name or code" />
          <select value={brandFilter} onChange={(event) => { setBrandFilter(event.target.value); setPage(1); }} className="h-11 rounded-[var(--radius-md)] border border-border bg-background px-3 text-sm font-medium text-text"><option value="">All brands</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select>
          <Input value={familyFilter} onChange={(event) => { setFamilyFilter(event.target.value); setPage(1); }} placeholder="Colour family" aria-label="Filter colour family" />
          <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} className="h-11 rounded-[var(--radius-md)] border border-border bg-background px-3 text-sm font-medium text-text"><option value="active">Active</option><option value="inactive">Inactive</option><option value="all">All statuses</option></select>
        </div>
        <div className="overflow-hidden rounded-[1.2rem] border border-border/70">
          <table className="min-w-full divide-y divide-border/70">
            <thead className="bg-background-secondary/35">
              <tr className="text-left text-xs font-bold uppercase tracking-[0.18em] text-muted">
                <th className="px-4 py-3">Shade</th>
                <th className="px-4 py-3">Tone · Depth</th>
                <th className="px-4 py-3">Colour</th>
                <th className="px-4 py-3">Brand</th>
                <th className="px-4 py-3">Preview</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70 bg-white/80">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-text">{row.shade_name}</div>
                    <div className="text-xs text-muted">{row.shade_code}</div>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-muted">{row.tone ?? "—"} · {row.depth ?? "—"}<br />{bases.find((base) => base.id === row.base_id)?.name ?? "No base"}</td>
                  <td className="px-4 py-3 text-sm text-muted">
                    {row.color_family}
                    {row.color_sub_family ? <div className="text-xs">{row.color_sub_family}</div> : null}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted">{brandNameById.get(row.brand_id ?? "") ?? "Global"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-6 w-6 rounded-full border border-border/70" style={{ backgroundColor: row.hex_color || "#d1d5db" }} />
                      <span className="text-xs font-medium text-muted">{row.hex_color || "No HEX"}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={row.is_active ? "success" : "neutral"}>{row.is_active ? "Active" : "Inactive"}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/admin/shade-pricing?shadeId=${row.id}`} className="inline-flex h-9 items-center justify-center rounded-full border border-border/80 bg-white px-3 text-sm font-semibold text-text transition hover:border-accent/30">Pricing</Link>
                      <Link href={`/admin/paint-compatibility?shadeId=${row.id}`} className="inline-flex h-9 items-center justify-center rounded-full border border-border/80 bg-white px-3 text-sm font-semibold text-text transition hover:border-accent/30">Compatibility</Link>
                      <Button type="button" variant="outline" size="sm" onClick={() => openEdit(row)}>Edit</Button>
                      <Button type="button" variant="danger" size="sm" onClick={() => void deleteShade(row)} disabled={!canManage}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm font-medium text-muted"><span>{total} matching shades</span><div className="flex items-center gap-2"><Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button><span>Page {page}</span><Button type="button" variant="outline" size="sm" disabled={page * pageSize >= total} onClick={() => setPage((current) => current + 1)}>Next</Button></div></div>
      </AdminSectionCard>

      <Modal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingShadeId ? "Edit Shade" : "Create Shade"}
        description="Manage a reusable shade that can be linked to any paint product."
        className="max-w-3xl"
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Brand" htmlFor="shade-brand">
              <select
                id="shade-brand"
                value={form.brandId}
                onChange={(event) => setForm((current) => ({ ...current, brandId: event.target.value }))}
                className="h-11 w-full rounded-[var(--radius-md)] border border-border bg-background px-3.5 text-sm font-medium text-text"
              >
                <option value="">Global / Any brand</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Shade Code" htmlFor="shade-code">
              <Input id="shade-code" value={form.shadeCode} onChange={(event) => setForm((current) => ({ ...current, shadeCode: event.target.value }))} placeholder="7245" />
            </FormField>
            <FormField label="Shade Name" htmlFor="shade-name">
              <Input id="shade-name" value={form.shadeName} onChange={(event) => setForm((current) => ({ ...current, shadeName: event.target.value }))} placeholder="Ocean Breeze" />
            </FormField>
            <FormField label="Color Family" htmlFor="shade-family">
              <Input id="shade-family" value={form.colorFamily} onChange={(event) => setForm((current) => ({ ...current, colorFamily: event.target.value }))} placeholder="Blue" />
            </FormField>
            <FormField label="Sub Family" htmlFor="shade-sub-family">
              <Input id="shade-sub-family" value={form.colorSubFamily} onChange={(event) => setForm((current) => ({ ...current, colorSubFamily: event.target.value }))} placeholder="Light Blue" />
            </FormField>
            <FormField label="HEX Color" htmlFor="shade-hex">
              <Input id="shade-hex" value={form.hexColor} onChange={(event) => setForm((current) => ({ ...current, hexColor: event.target.value }))} placeholder="#8FAFC4" />
            </FormField>
            <FormField label="RGB" htmlFor="shade-rgb">
              <Input id="shade-rgb" value={form.rgb} onChange={(event) => setForm((current) => ({ ...current, rgb: event.target.value }))} placeholder="143,175,196" />
            </FormField>
            <FormField label="Tone" htmlFor="shade-tone"><select id="shade-tone" value={form.tone} onChange={(event) => setForm((current) => ({ ...current, tone: event.target.value as ShadeForm["tone"] }))} className="h-11 w-full rounded-[var(--radius-md)] border border-border bg-background px-3.5 text-sm font-medium text-text"><option value="">Not set</option><option value="warm">Warm</option><option value="cool">Cool</option><option value="neutral">Neutral</option></select></FormField>
            <FormField label="Depth" htmlFor="shade-depth"><select id="shade-depth" value={form.depth} onChange={(event) => setForm((current) => ({ ...current, depth: event.target.value as ShadeForm["depth"] }))} className="h-11 w-full rounded-[var(--radius-md)] border border-border bg-background px-3.5 text-sm font-medium text-text"><option value="">Not set</option><option value="light">Light</option><option value="medium">Medium</option><option value="dark">Dark</option></select></FormField>
            <FormField label="Paint Base" htmlFor="shade-base"><select id="shade-base" value={form.baseId} onChange={(event) => setForm((current) => ({ ...current, baseId: event.target.value }))} className="h-11 w-full rounded-[var(--radius-md)] border border-border bg-background px-3.5 text-sm font-medium text-text"><option value="">Not set</option>{bases.map((base) => <option key={base.id} value={base.id}>{base.name}{base.code ? ` (${base.code})` : ""}</option>)}</select></FormField>
            <FormField label="Image URL" htmlFor="shade-image">
              <Input id="shade-image" value={form.imageUrl} onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))} placeholder="https://..." />
            </FormField>
            <FormField label="Sort Order" htmlFor="shade-sort">
              <Input id="shade-sort" value={form.sortOrder} onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))} inputMode="numeric" />
            </FormField>
          </div>

          <label className="flex items-center gap-3 rounded-[1.2rem] border border-border/70 bg-background-secondary/35 px-4 py-3 text-sm font-semibold text-text">
            <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />
            Active shade
          </label>
          <div className="flex flex-wrap gap-4 text-sm font-semibold text-text"><label className="flex items-center gap-2"><input type="checkbox" checked={form.isPopular} onChange={(event) => setForm((current) => ({ ...current, isPopular: event.target.checked }))} />Popular</label><label className="flex items-center gap-2"><input type="checkbox" checked={form.isFeatured} onChange={(event) => setForm((current) => ({ ...current, isFeatured: event.target.checked }))} />Featured</label></div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" size="md" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="button" variant="accent" size="md" loading={saving} onClick={() => void saveShade()} disabled={saving}>Save Shade</Button>
          </div>
        </div>
      </Modal>

      <Modal open={importOpen} onOpenChange={(open) => { setImportOpen(open); if (!open) { setImportRows([]); setImportHeaders([]); setImportHeaderError(""); setImportAnalysis(null); setImportProgress(null); setImportSummary(null); } }} title="Import shades" description="Upload, validate, preview, and import shades in safe 250-row chunks." className="max-w-3xl">
        <div className="space-y-4">
          <input type="file" accept=".csv,text/csv" onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void file.text().then((text) => {
              const parsed = parseCsv(text);
              const requiredHeaders = ["brand", "shade_code", "shade_name", "colour_family"];
              const missingHeaders = requiredHeaders.filter((header) => !parsed.headers.includes(header));
              const headerError = parsed.error ?? (missingHeaders.length > 0 ? `Missing required column${missingHeaders.length > 1 ? "s" : ""}: ${missingHeaders.join(", ")}.` : "");
              setImportHeaders(parsed.headers);
              setImportHeaderError(headerError);
              setImportRows(parsed.rows);
              setImportAnalysis(null);
              setImportSummary(null);
              if (headerError) toast({ title: "CSV not ready", description: headerError, variant: "danger" });
            });
          }} className="block w-full rounded-xl border border-border p-3 text-sm" />
          <FormField label="Conflict mode" htmlFor="shade-import-mode"><select id="shade-import-mode" value={importMode} onChange={(event) => { setImportMode(event.target.value as typeof importMode); setImportAnalysis(null); setImportSummary(null); }} className="h-11 w-full rounded-[var(--radius-md)] border border-border bg-background px-3 text-sm"><option value="create">Create only (safest)</option><option value="update">Update existing only</option><option value="upsert">Upsert existing and new</option></select></FormField>
          <p className="text-xs font-medium leading-5 text-muted">Required columns: brand, shade_code, shade_name, colour_family. Optional columns: colour_sub_family, hex, rgb, tone, depth, base, image_url, is_popular, is_featured, sort_order, is_active.</p>
          {importHeaderError ? <p className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm font-semibold text-danger">{importHeaderError}</p> : null}
          {importHeaders.length > 0 && !importHeaderError ? <p className="text-xs text-muted">Headers detected: {importHeaders.join(", ")}</p> : null}
          {importRows.length > 0 ? <div className="rounded-xl border border-border/70 bg-background-secondary/30 p-4 text-sm"><p className="font-bold text-text">{importAnalysis ? "Import Preview" : `Loaded ${importRows.length} rows`}</p>{importAnalysis ? <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-muted sm:grid-cols-4"><span>Total {importAnalysis.total}</span><span>Valid {importAnalysis.valid}</span><span>Invalid {importAnalysis.invalid}</span><span>Duplicates {importAnalysis.duplicates}</span><span>New {importAnalysis.newRecords}</span><span>Updates {importAnalysis.updates}</span><span>Skipped {importAnalysis.skipped}</span></div> : null}<div className="mt-3 max-h-32 overflow-auto text-xs text-muted">{importRows.slice(0, 8).map((row) => <div key={row.rowNumber} className="border-b border-border/50 py-2">Row {row.rowNumber}: {row.values.shade_code} · {row.values.shade_name} · {row.values.colour_family}</div>)}</div></div> : null}
          {importProgress ? <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 text-sm"><p className="font-bold text-text">Importing shades...</p><p className="mt-1 text-muted">Chunk {importProgress.current} / {importProgress.total} · {importProgress.processed} / {importProgress.totalRows}</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-border"><div className="h-full bg-accent transition-all" style={{ width: `${importProgress.totalRows ? (importProgress.processed / importProgress.totalRows) * 100 : 0}%` }} /></div></div> : null}
          {importSummary ? <div className="rounded-xl border border-success/30 bg-success/5 p-4 text-sm"><p className="font-bold text-text">✓ Import completed</p><p className="mt-1 text-muted">Total {importSummary.total} · Created {importSummary.created} · Updated {importSummary.updated} · Skipped {importSummary.skipped} · Failed {importSummary.failed} · {(importSummary.elapsedMs / 1000).toFixed(1)}s</p>{importSummary.issues.length > 0 ? <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => downloadImportIssues(importSummary.issues)}>Download error report</Button> : null}</div> : null}
          <div className="flex flex-wrap justify-end gap-3"><Button type="button" variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>{importAnalysis?.issues.length ? <Button type="button" variant="outline" onClick={() => downloadImportIssues(importAnalysis.issues)}>Download preview issues</Button> : null}{!importAnalysis && importRows.length > 0 ? <Button type="button" variant="outline" loading={importAnalyzing} onClick={() => void analyzeImport()} disabled={!canManage || Boolean(importHeaderError) || importAnalyzing}>Validate & Preview</Button> : null}<Button type="button" variant="accent" loading={saving} onClick={() => void importCsv()} disabled={!canManage || !importAnalysis || importAnalysis.candidates.length === 0 || saving || Boolean(importSummary)}>{importSummary ? "Import finished" : "Start Import"}</Button></div>
        </div>
      </Modal>
    </section>
  );
}
