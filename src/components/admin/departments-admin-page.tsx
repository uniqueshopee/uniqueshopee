"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField, Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminActionButton, AdminSectionCard, AdminStatusBadge, PageHeader } from "@/components/admin/admin-kit";
import { useAuth } from "@/components/auth/auth-provider";
import { toast } from "@/hooks/use-toast";
import { getQaProductCatalog, isQaBypassEnabled } from "@/lib/qa-mode";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { LayoutGrid, PenSquare, Plus, RotateCcw, Search, ShieldCheck, Trash2 } from "lucide-react";

type DepartmentRecord = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number | null;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

type DepartmentFormState = {
  name: string;
  slug: string;
  description: string;
  sortOrder: string;
  isActive: boolean;
};

const PAGE_SIZE = 6;

const DEPARTMENT_FORM_INITIAL: DepartmentFormState = {
  name: "",
  slug: "",
  description: "",
  sortOrder: "0",
  isActive: true,
};

function slugifyDepartment(value: string) {
  return value
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/['"]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function parseSortOrder(value: string) {
  const next = Number.parseInt(value, 10);
  return Number.isFinite(next) ? next : 0;
}

function DepartmentsEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-8 text-center shadow-[var(--shadow-sm)]">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 text-accent">
        <LayoutGrid className="h-9 w-9" aria-hidden="true" />
      </div>
      <h3 className="mt-5 text-2xl font-black text-text">No Departments Yet</h3>
      <p className="mt-2 text-sm font-medium text-muted">Create the first department to organize categories, brands, and products in Supabase.</p>
      <Button variant="accent" size="md" className="mt-6" onClick={onCreate}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add Department
      </Button>
    </Card>
  );
}

function DepartmentsLoadingState() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-56 rounded-[1.4rem]" />
      ))}
    </div>
  );
}

export function DepartmentsAdminPage() {
  const { role } = useAuth();
  const canManage = role === "admin" || role === "manager";
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "deleted">("all");
  const [sortBy, setSortBy] = useState<"created_at" | "updated_at" | "name" | "sort_order" | "status">("sort_order");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DepartmentRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<DepartmentFormState>(DEPARTMENT_FORM_INITIAL);
  const [slugTouched, setSlugTouched] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"name" | "slug", string>>>({});

  const loadDepartments = async () => {
    setIsLoading(true);
    setLoadError(null);

    if (isQaBypassEnabled()) {
      // DEV ONLY
      // REMOVE OR DISABLE BEFORE PRODUCTION
      const catalog = getQaProductCatalog();
      setDepartments(
        catalog.departments.map((department, index) => ({
          id: department.id,
          slug: department.slug,
          name: department.name,
          description: department.name === "Paints" ? "Interior and exterior paint catalog" : "Plumbing and hardware catalog",
          sort_order: index,
          is_active: department.is_active,
          deleted_at: department.deleted_at,
          created_at: "2026-07-01T00:00:00.000Z",
          updated_at: "2026-07-29T00:00:00.000Z",
        })),
      );
      setIsLoading(false);
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      setLoadError("Supabase is not configured for this environment.");
      setIsLoading(false);
      return;
    }

    const { data, error } = await client
      .from("departments")
      .select("id, slug, name, description, sort_order, is_active, deleted_at, created_at, updated_at")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      setLoadError(error.message);
      setDepartments([]);
    } else {
      setDepartments((data ?? []) as DepartmentRecord[]);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    void loadDepartments();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sortBy, sortDirection]);

  const filteredDepartments = useMemo(() => {
    const term = search.trim().toLowerCase();

    const rows = departments.filter((department) => {
      const status = department.deleted_at ? "deleted" : department.is_active ? "active" : "inactive";
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (!term) return true;

      return [department.name, department.slug, department.description ?? "", String(department.sort_order ?? 0)].join(" ").toLowerCase().includes(term);
    });

    const compareValues = {
      name: (left: DepartmentRecord, right: DepartmentRecord) => left.name.localeCompare(right.name),
      created_at: (left: DepartmentRecord, right: DepartmentRecord) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
      updated_at: (left: DepartmentRecord, right: DepartmentRecord) => new Date(left.updated_at).getTime() - new Date(right.updated_at).getTime(),
      sort_order: (left: DepartmentRecord, right: DepartmentRecord) => parseSortOrder(String(left.sort_order ?? 0)) - parseSortOrder(String(right.sort_order ?? 0)),
      status: (left: DepartmentRecord, right: DepartmentRecord) => {
        const leftStatus = left.deleted_at ? "deleted" : left.is_active ? "active" : "inactive";
        const rightStatus = right.deleted_at ? "deleted" : right.is_active ? "active" : "inactive";
        return leftStatus.localeCompare(rightStatus);
      },
    } satisfies Record<typeof sortBy, (left: DepartmentRecord, right: DepartmentRecord) => number>;

    return [...rows].sort((left, right) => {
      const result = compareValues[sortBy](left, right);
      return sortDirection === "asc" ? result : -result;
    });
  }, [departments, search, sortBy, sortDirection, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredDepartments.length / PAGE_SIZE));
  const visiblePage = Math.min(page, totalPages);
  const visibleDepartments = filteredDepartments.slice((visiblePage - 1) * PAGE_SIZE, visiblePage * PAGE_SIZE);

  const activeCount = departments.filter((department) => !department.deleted_at && department.is_active).length;
  const deletedCount = departments.filter((department) => Boolean(department.deleted_at)).length;

  const resetForm = () => {
    setEditingDepartment(null);
    setForm(DEPARTMENT_FORM_INITIAL);
    setFieldErrors({});
    setSlugTouched(false);
  };

  const openCreateDepartment = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDepartment = (department: DepartmentRecord) => {
    setEditingDepartment(department);
    setForm({
      name: department.name,
      slug: department.slug,
      description: department.description ?? "",
      sortOrder: String(department.sort_order ?? 0),
      isActive: department.is_active,
    });
    setSlugTouched(true);
    setFieldErrors({});
    setDialogOpen(true);
  };

  const updateForm = (patch: Partial<DepartmentFormState>) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const handleNameChange = (value: string) => {
    setForm((current) => ({
      ...current,
      name: value,
      slug: slugTouched ? current.slug : slugifyDepartment(value),
    }));
  };

  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    updateForm({ slug: value });
  };

  const validateForm = () => {
    const nextErrors: Partial<Record<"name" | "slug", string>> = {};
    const normalizedSlug = slugifyDepartment(form.slug || form.name);

    if (!form.name.trim()) nextErrors.name = "Department name is required";
    if (!normalizedSlug) nextErrors.slug = "Department slug is required";

    setFieldErrors(nextErrors);
    return { valid: Object.keys(nextErrors).length === 0, normalizedSlug };
  };

  const handleSubmit = async () => {
    if (!canManage) {
      toast({ title: "Permission denied", description: "Only admins and managers can manage departments.", variant: "danger" });
      return;
    }

    const validation = validateForm();
    if (!validation.valid) {
      toast({ title: "Validation failed", description: "Department name is required.", variant: "warning" });
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      toast({ title: "Supabase unavailable", description: "Add Supabase environment variables to enable departments.", variant: "danger" });
      return;
    }

    setSaving(true);
    try {
      const duplicateQuery = client.from("departments").select("id").eq("slug", validation.normalizedSlug);
      if (editingDepartment) duplicateQuery.neq("id", editingDepartment.id);
      const duplicateResult = await duplicateQuery.limit(1);
      if (duplicateResult.error) throw duplicateResult.error;
      if ((duplicateResult.data ?? []).length > 0) {
        setFieldErrors((current) => ({ ...current, slug: "Slug must be unique" }));
        toast({ title: "Duplicate slug", description: "Choose a different department slug.", variant: "warning" });
        setSaving(false);
        return;
      }

      const payload = {
        slug: validation.normalizedSlug,
        name: form.name.trim(),
        description: form.description.trim() || null,
        sort_order: parseSortOrder(form.sortOrder),
        is_active: form.isActive,
      };

      const { error } = editingDepartment
        ? await client.from("departments").update(payload).eq("id", editingDepartment.id)
        : await client.from("departments").insert([payload]);

      if (error) throw error;

      toast({
        title: editingDepartment ? "Department updated" : "Department created",
        description: `${form.name.trim()} is now synced with Supabase.`,
        variant: "success",
      });

      setDialogOpen(false);
      resetForm();
      await loadDepartments();
    } catch (error) {
      toast({
        title: editingDepartment ? "Update failed" : "Create failed",
        description: error instanceof Error ? error.message : "Something went wrong while saving the department.",
        variant: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleDepartment = async (department: DepartmentRecord) => {
    if (!canManage) return;

    const client = getSupabaseBrowserClient();
    if (!client) {
      toast({ title: "Supabase unavailable", description: "Cannot update department right now.", variant: "danger" });
      return;
    }

    const { error } = await client.from("departments").update({ is_active: !department.is_active }).eq("id", department.id);
    if (error) {
      toast({ title: "Status update failed", description: error.message, variant: "danger" });
      return;
    }

    toast({
      title: department.is_active ? "Department deactivated" : "Department activated",
      description: department.name,
      variant: "success",
    });
    await loadDepartments();
  };

  const restoreDepartment = async (department: DepartmentRecord) => {
    if (!canManage) return;

    const client = getSupabaseBrowserClient();
    if (!client) {
      toast({ title: "Supabase unavailable", description: "Cannot restore this department right now.", variant: "danger" });
      return;
    }

    const { error } = await client.from("departments").update({ deleted_at: null, is_active: true }).eq("id", department.id);
    if (error) {
      toast({ title: "Restore failed", description: error.message, variant: "danger" });
      return;
    }

    toast({ title: "Department restored", description: department.name, variant: "success" });
    await loadDepartments();
  };

  const softDeleteDepartment = async () => {
    if (!deleteTarget || !canManage) return;

    const client = getSupabaseBrowserClient();
    if (!client) {
      toast({ title: "Supabase unavailable", description: "Cannot delete this department right now.", variant: "danger" });
      return;
    }

    const { error } = await client
      .from("departments")
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq("id", deleteTarget.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "danger" });
      return;
    }

    toast({ title: "Department deleted", description: `${deleteTarget.name} archived safely.`, variant: "success" });
    setDeleteTarget(null);
    await loadDepartments();
  };

  return (
    <section className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Departments" }]}
        title="Departments"
        subtitle="Create and manage department structure for products, categories, and brands using live Supabase data."
        actions={
          <>
            <AdminActionButton variant="outline" onClick={loadDepartments}>
              <RotateCcw className="h-4 w-4" />
              Refresh
            </AdminActionButton>
            <AdminActionButton variant="accent" onClick={openCreateDepartment} disabled={!canManage}>
              <Plus className="h-4 w-4" />
              Add Department
            </AdminActionButton>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-[1.35rem] border-white/80 bg-white/92 p-4 shadow-[var(--shadow-sm)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Total Departments</p>
          <p className="mt-1 text-2xl font-black text-text">{departments.length}</p>
          <p className="mt-2 text-xs font-medium text-muted">Live departments from Supabase</p>
        </Card>
        <Card className="rounded-[1.35rem] border-white/80 bg-white/92 p-4 shadow-[var(--shadow-sm)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Active</p>
          <p className="mt-1 text-2xl font-black text-text">{activeCount}</p>
          <p className="mt-2 text-xs font-medium text-muted">Visible departments</p>
        </Card>
        <Card className="rounded-[1.35rem] border-white/80 bg-white/92 p-4 shadow-[var(--shadow-sm)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Deleted</p>
          <p className="mt-1 text-2xl font-black text-text">{deletedCount}</p>
          <p className="mt-2 text-xs font-medium text-muted">Soft deleted only</p>
        </Card>
      </div>

      <AdminSectionCard title="Search & Filters" description="Search, sort, and filter departments.">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.5fr)_minmax(0,0.6fr)]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search departments" className="h-11 pl-11" aria-label="Search departments" />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            className="h-11 rounded-[var(--radius-md)] border border-border bg-background px-3.5 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Filter departments by status"
          >
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="deleted">Deleted</option>
          </select>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
              className="h-11 rounded-[var(--radius-md)] border border-border bg-background px-3.5 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="Sort departments"
            >
              <option value="sort_order">Sort Order</option>
              <option value="name">Name</option>
              <option value="created_at">Created</option>
              <option value="updated_at">Updated</option>
              <option value="status">Status</option>
            </select>
            <Button variant="outline" size="sm" onClick={() => setSortDirection((current) => (current === "asc" ? "desc" : "asc"))}>
              {sortDirection === "asc" ? "Ascending" : "Descending"}
            </Button>
          </div>
        </div>
      </AdminSectionCard>

      {loadError ? (
        <Card className="rounded-[1.6rem] border-danger/20 bg-danger/5 p-5 shadow-[var(--shadow-sm)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-base font-bold text-text">Unable to load departments</p>
              <p className="mt-1 text-sm font-medium text-muted">{loadError}</p>
            </div>
            <Button variant="outline" size="md" onClick={loadDepartments}>
              Retry
            </Button>
          </div>
        </Card>
      ) : null}

      {isLoading ? (
        <DepartmentsLoadingState />
      ) : visibleDepartments.length > 0 ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleDepartments.map((department) => {
              const status = department.deleted_at ? "Deleted" : department.is_active ? "Active" : "Inactive";

              return (
                <Card key={department.id} className="rounded-[1.4rem] border-white/80 bg-white/92 p-4 shadow-[var(--shadow-sm)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-black text-text">{department.name}</p>
                      <p className="text-xs font-medium text-muted">/{department.slug}</p>
                    </div>
                    <AdminStatusBadge status={status} />
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm font-medium text-muted">{department.description || "No description provided."}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-muted">
                    <Badge variant="neutral">Sort {department.sort_order ?? 0}</Badge>
                    <Badge variant="neutral">{new Date(department.updated_at).toLocaleDateString()}</Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditDepartment(department)} disabled={!canManage}>
                      <PenSquare className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button variant={department.deleted_at ? "outline" : "accent"} size="sm" onClick={() => void (department.deleted_at ? restoreDepartment(department) : toggleDepartment(department))} disabled={!canManage}>
                      <ShieldCheck className="h-4 w-4" />
                      {department.deleted_at ? "Restore" : department.is_active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setDeleteTarget(department)} disabled={!canManage}>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 rounded-[1.4rem] border border-border/70 bg-white/90 p-4 shadow-[var(--shadow-sm)] sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-muted">
              Showing {visibleDepartments.length} of {filteredDepartments.length} departments
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={visiblePage === 1}>
                Prev
              </Button>
              <Badge variant="neutral">
                Page {visiblePage} of {totalPages}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={visiblePage >= totalPages}>
                Next
              </Button>
            </div>
          </div>
        </>
      ) : (
        <DepartmentsEmptyState onCreate={openCreateDepartment} />
      )}

      <Modal
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
        title={editingDepartment ? "Edit Department" : "Create Department"}
        description="Save departments directly to Supabase."
        className="max-w-2xl"
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Name" htmlFor="department-name" error={fieldErrors.name}>
              <Input id="department-name" value={form.name} onChange={(event) => handleNameChange(event.target.value)} placeholder="Department name" />
            </FormField>
            <FormField label="Slug" htmlFor="department-slug" error={fieldErrors.slug}>
              <Input id="department-slug" value={form.slug} onChange={(event) => handleSlugChange(event.target.value)} placeholder="department-slug" />
            </FormField>
          </div>

          <FormField label="Description" htmlFor="department-description" hint="Optional. Shown in admin and future storefront contexts.">
            <textarea
              id="department-description"
              value={form.description}
              onChange={(event) => updateForm({ description: event.target.value })}
              rows={4}
              className="min-h-28 w-full rounded-[var(--radius-md)] border border-border bg-background px-3.5 py-3 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              placeholder="Department description"
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Sort Order" htmlFor="department-sort-order">
              <Input id="department-sort-order" type="number" value={form.sortOrder} onChange={(event) => updateForm({ sortOrder: event.target.value })} placeholder="0" />
            </FormField>
            <label className="flex items-center gap-3 rounded-[1.2rem] border border-border/70 bg-white/80 px-4 py-3 text-sm font-semibold text-text">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => updateForm({ isActive: event.target.checked })}
                className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
              />
              Active department
            </label>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" size="md" onClick={() => { setDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button type="button" variant="accent" size="md" loading={saving} onClick={() => void handleSubmit()} disabled={!canManage}>
              {editingDepartment ? "Update Department" : "Save Department"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Department"
        description="This will archive the department using soft delete."
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm font-medium text-muted">
            {deleteTarget ? (
              <>
                Are you sure you want to delete <span className="font-semibold text-text">{deleteTarget.name}</span>?
              </>
            ) : null}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" size="md" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" size="md" onClick={() => void softDeleteDepartment()} disabled={!canManage}>
              Delete Department
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
