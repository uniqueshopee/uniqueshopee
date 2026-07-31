"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2,
  Check,
  Copy,
  Edit3,
  Home,
  MapPin,
  MapPinned,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, FormField } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/feedback/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { UI_MESSAGES, getFriendlyErrorMessage } from "@/lib/messages";
import {
  DEFAULT_COUNTRY,
  formatAddressLine,
  getCompactAddress,
  type AddressFormValues,
  type AddressType,
  type SavedAddress,
} from "@/lib/address-data";

const PHONE_REGEX = /^\+?\d[\d\s-]{8,16}$/;
const PIN_REGEX = /^\d{6}$/;

type AddressRow = {
  id: string;
  full_name: string;
  phone: string;
  alternate_phone: string | null;
  line1: string;
  line2: string | null;
  landmark: string | null;
  area: string | null;
  city: string;
  state: string;
  country: string;
  pin_code: string;
  address_type: "home" | "office" | "other";
  is_default: boolean;
  deleted_at: string | null;
};

const addressSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your full name"),
  mobileNumber: z.string().trim().regex(PHONE_REGEX, "Enter a valid mobile number"),
  alternateMobile: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((value) => !value || PHONE_REGEX.test(value), "Enter a valid mobile number"),
  pinCode: z.string().trim().regex(PIN_REGEX, "Enter a valid 6-digit PIN"),
  houseFlat: z.string().trim().min(1, "Enter house, flat, or apartment"),
  street: z.string().trim().min(1, "Enter street name"),
  landmark: z.string().trim().min(1, "Enter a landmark"),
  area: z.string().trim().min(1, "Enter area or locality"),
  city: z.string().trim().min(1, "Enter city"),
  state: z.string().trim().min(1, "Enter state"),
  country: z.literal(DEFAULT_COUNTRY),
  addressType: z.enum(["Home", "Office", "Other"]),
  isDefault: z.boolean(),
});

type AddressFormSchema = z.infer<typeof addressSchema>;

function mapAddressRow(row: AddressRow): SavedAddress {
  return {
    id: row.id,
    fullName: row.full_name,
    mobileNumber: row.phone,
    alternateMobile: row.alternate_phone ?? "",
    pinCode: row.pin_code,
    houseFlat: row.line1,
    street: row.line2 ?? "",
    landmark: row.landmark ?? "",
    area: row.area ?? "",
    city: row.city,
    state: row.state,
    country: DEFAULT_COUNTRY,
    addressType: row.address_type === "office" ? "Office" : row.address_type === "other" ? "Other" : "Home",
    isDefault: row.is_default,
  };
}

function toFormValues(address?: SavedAddress): AddressFormValues {
  if (!address) {
    return {
      fullName: "",
      mobileNumber: "",
      alternateMobile: "",
      pinCode: "",
      houseFlat: "",
      street: "",
      landmark: "",
      area: "",
      city: "",
      state: "",
      country: DEFAULT_COUNTRY,
      addressType: "Home",
      isDefault: false,
    };
  }

  return {
    fullName: address.fullName,
    mobileNumber: address.mobileNumber,
    alternateMobile: address.alternateMobile ?? "",
    pinCode: address.pinCode,
    houseFlat: address.houseFlat,
    street: address.street,
    landmark: address.landmark,
    area: address.area,
    city: address.city,
    state: address.state,
    country: address.country,
    addressType: address.addressType,
    isDefault: address.isDefault,
  };
}

function getAddressIcon(addressType: AddressType) {
  switch (addressType) {
    case "Office":
      return Building2;
    case "Other":
      return MapPinned;
    case "Home":
    default:
      return Home;
  }
}

function getTypeBadgeVariant(addressType: AddressType) {
  switch (addressType) {
    case "Office":
      return "neutral" as const;
    case "Other":
      return "warning" as const;
    case "Home":
    default:
      return "accent" as const;
  }
}

function AddressTypeBadge({ type }: { type: AddressType }) {
  return <Badge variant={getTypeBadgeVariant(type)}>{type}</Badge>;
}

function AddressHeader({
  title,
  subtitle,
  count,
  onAdd,
}: {
  title: string;
  subtitle: string;
  count: number;
  onAdd: () => void;
}) {
  return (
    <div className="space-y-5">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-2 text-sm font-medium text-muted">
          <li>
            <Link href="/account" className="transition-colors hover:text-text focus-visible:text-text">
              Account
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <span aria-current="page" className="text-text">
              Addresses
            </span>
          </li>
        </ol>
      </nav>

      <div className="rounded-[1.6rem] border border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <Badge variant="accent" className="eyebrow-font w-fit">
              Address Book
            </Badge>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-text sm:text-3xl">{title}</h1>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted sm:text-base">{subtitle}</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background-secondary px-3 py-1.5 text-sm font-semibold text-text">
              <MapPin className="h-4 w-4 text-accent" aria-hidden="true" />
              {count} total saved addresses
            </div>
          </div>

          <Button type="button" variant="accent" size="md" onClick={onAdd} className="w-full lg:w-auto">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add New Address
          </Button>
        </div>
      </div>
    </div>
  );
}

function AddressSelector({
  address,
  selected = false,
  compact = false,
  onSelect,
  onDeliverHere,
}: {
  address: SavedAddress;
  selected?: boolean;
  compact?: boolean;
  onSelect?: () => void;
  onDeliverHere?: () => void;
}) {
  const Icon = getAddressIcon(address.addressType);

  return (
    <Card
      className={cn(
        "overflow-hidden rounded-[1.4rem] border-white/80 bg-white/92 shadow-[var(--shadow-sm)]",
        selected && "border-accent/30 bg-gradient-to-br from-accent/10 via-white to-white shadow-[var(--shadow-lg)]",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={cn(
          "w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          compact ? "p-4" : "p-5",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-background-secondary text-accent">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <p className="truncate text-base font-bold text-text">{address.fullName}</p>
            </div>
            <p className="text-sm font-medium text-muted">{address.mobileNumber}</p>
            <p className={cn("text-sm font-medium text-text", compact ? "line-clamp-2" : "")}>
              {compact ? getCompactAddress(address) : formatAddressLine(address)}
            </p>
            {!compact && <p className="text-sm font-medium text-muted">Landmark: {address.landmark}</p>}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            {address.isDefault && <Badge variant="success">Default</Badge>}
            <AddressTypeBadge type={address.addressType} />
            {selected && (
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <Check className="h-4 w-4" aria-hidden="true" />
              </span>
            )}
          </div>
        </div>
      </button>

      {onDeliverHere && (
        <div className="border-t border-border/70 p-3">
          <Button type="button" variant="accent" size="sm" className="w-full" onClick={onDeliverHere}>
            Deliver Here
          </Button>
        </div>
      )}
    </Card>
  );
}

function AddressForm({
  initialValues,
  submitLabel,
  cancelLabel = "Cancel",
  onSubmit,
  onCancel,
  isBusy = false,
}: {
  initialValues: AddressFormValues;
  submitLabel: string;
  cancelLabel?: string;
  onSubmit: (values: AddressFormValues) => void;
  onCancel: () => void;
  isBusy?: boolean;
}) {
  const form = useForm<AddressFormSchema>({
    resolver: zodResolver(addressSchema),
    mode: "onChange",
    defaultValues: initialValues,
  });

  const { errors, isValid } = form.formState;

  useEffect(() => {
    form.reset(initialValues);
  }, [form, initialValues]);

  const submit = form.handleSubmit((values) => onSubmit(values));
  const addressTypes: AddressType[] = ["Home", "Office", "Other"];

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Full Name" htmlFor="address-full-name" error={errors.fullName?.message}>
          <Input
            id="address-full-name"
            {...form.register("fullName")}
            placeholder="Enter full name"
            autoComplete="name"
            error={Boolean(errors.fullName)}
          />
        </FormField>
        <FormField label="Mobile Number" htmlFor="address-mobile" error={errors.mobileNumber?.message}>
          <Input
            id="address-mobile"
            {...form.register("mobileNumber")}
            placeholder="+91 98765 43210"
            autoComplete="tel"
            inputMode="tel"
            error={Boolean(errors.mobileNumber)}
          />
        </FormField>
        <FormField label="Alternate Mobile" htmlFor="address-alt-mobile" error={errors.alternateMobile?.message} hint="Optional">
          <Input
            id="address-alt-mobile"
            {...form.register("alternateMobile")}
            placeholder="+91 91234 56789"
            autoComplete="tel"
            inputMode="tel"
            error={Boolean(errors.alternateMobile)}
          />
        </FormField>
        <FormField label="PIN Code" htmlFor="address-pin" error={errors.pinCode?.message}>
          <Input
            id="address-pin"
            {...form.register("pinCode")}
            placeholder="6-digit PIN"
            autoComplete="postal-code"
            inputMode="numeric"
            maxLength={6}
            error={Boolean(errors.pinCode)}
          />
        </FormField>
        <FormField label="House / Flat / Apartment" htmlFor="address-house" error={errors.houseFlat?.message}>
          <Input
            id="address-house"
            {...form.register("houseFlat")}
            placeholder="Tower B, Flat 1204"
            autoComplete="address-line1"
            error={Boolean(errors.houseFlat)}
          />
        </FormField>
        <FormField label="Street" htmlFor="address-street" error={errors.street?.message}>
          <Input
            id="address-street"
            {...form.register("street")}
            placeholder="Street name"
            autoComplete="address-line2"
            error={Boolean(errors.street)}
          />
        </FormField>
        <FormField label="Landmark" htmlFor="address-landmark" error={errors.landmark?.message}>
          <Input
            id="address-landmark"
            {...form.register("landmark")}
            placeholder="Near landmark"
            error={Boolean(errors.landmark)}
          />
        </FormField>
        <FormField label="Area" htmlFor="address-area" error={errors.area?.message}>
          <Input
            id="address-area"
            {...form.register("area")}
            placeholder="Area / locality"
            error={Boolean(errors.area)}
          />
        </FormField>
        <FormField label="City" htmlFor="address-city" error={errors.city?.message}>
          <Input id="address-city" {...form.register("city")} placeholder="City" error={Boolean(errors.city)} />
        </FormField>
        <FormField label="State" htmlFor="address-state" error={errors.state?.message}>
          <Input id="address-state" {...form.register("state")} placeholder="State" error={Boolean(errors.state)} />
        </FormField>
        <FormField label="Country" htmlFor="address-country">
          <Input id="address-country" value={DEFAULT_COUNTRY} readOnly disabled />
        </FormField>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-text">Address Type</p>
        <div className="grid grid-cols-3 gap-2">
          {addressTypes.map((type) => {
            const active = form.watch("addressType") === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => form.setValue("addressType", type, { shouldValidate: true, shouldDirty: true })}
                aria-pressed={active}
                className={cn(
                  "rounded-[1rem] border px-3 py-3 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  active
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border/70 bg-white text-text hover:border-accent/20 hover:bg-white",
                )}
              >
                {type}
              </button>
            );
          })}
        </div>
        {errors.addressType ? <p className="text-xs font-medium text-danger">{errors.addressType.message}</p> : null}
      </div>

      <label className="flex items-start gap-3 rounded-[1.1rem] border border-border/70 bg-white/75 px-4 py-3 text-sm font-medium text-text">
        <input
          type="checkbox"
          {...form.register("isDefault")}
          className="mt-0.5 h-4 w-4 rounded border-border text-accent focus:ring-accent"
        />
        <span>Set as default address</span>
      </label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" variant="accent" size="lg" className="w-full" loading={isBusy} disabled={!isValid || isBusy}>
          <Save className="h-4 w-4" aria-hidden="true" />
          {submitLabel}
        </Button>
        <Button type="button" variant="outline" size="lg" className="w-full" onClick={onCancel}>
          <X className="h-4 w-4" aria-hidden="true" />
          {cancelLabel}
        </Button>
      </div>
    </form>
  );
}

function AddressDeleteConfirm({
  open,
  address,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  address: SavedAddress | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onCancel();
        }
      }}
      title="Delete Address"
      description={address ? `Remove ${address.fullName}'s saved address?` : "Remove this address?"}
      className="max-w-md"
    >
      <div className="space-y-4">
        <p className="text-sm font-medium leading-6 text-muted">This will soft-delete the saved address from your account.</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="button" variant="outline" size="md" className="w-full" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="danger" size="md" className="w-full" onClick={onConfirm}>
            Delete Address
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function AddressSkeletonCard() {
  return (
    <Card className="overflow-hidden rounded-[1.4rem] border-white/80 bg-white/92 shadow-[var(--shadow-sm)]">
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-full" />
          </div>
          <Skeleton className="h-7 w-16 rounded-full" />
        </div>
        <Skeleton className="h-16 w-full rounded-[1rem]" />
        <Skeleton className="h-10 w-full rounded-full" />
      </div>
    </Card>
  );
}

function AddressManagementSkeleton() {
  return (
    <section className="relative isolate overflow-hidden border-b border-border surface-texture">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 top-4 h-72 w-72 rounded-full bg-orange-400/8 blur-3xl" />
        <div className="absolute right-0 top-16 h-64 w-64 rounded-full bg-sky-400/8 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:py-8">
        <div className="space-y-5">
          <div className="rounded-[1.6rem] border border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-5 w-80" />
              <Skeleton className="h-12 w-40 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-14 w-full rounded-[1.4rem]" />
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <AddressSkeletonCard key={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function AddressManagementPage() {
  const shouldReduceMotion = useReducedMotion();
  const { profile, user } = useAuth();
  const accountId = profile?.id ?? user?.id ?? null;
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [editorBusy, setEditorBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const editingAddress = useMemo(
    () => addresses.find((address) => address.id === editingAddressId) ?? null,
    [addresses, editingAddressId],
  );
  const deleteTarget = useMemo(
    () => addresses.find((address) => address.id === deleteTargetId) ?? null,
    [addresses, deleteTargetId],
  );
  const selectedAddress = useMemo(
    () => addresses.find((address) => address.id === selectedAddressId) ?? addresses[0] ?? null,
    [addresses, selectedAddressId],
  );
  const defaultAddress = useMemo(() => addresses.find((address) => address.isDefault) ?? addresses[0] ?? null, [addresses]);
  const formInitialValues = useMemo(() => toFormValues(editingAddress ?? undefined), [editingAddress]);

  useEffect(() => {
    if (addresses.length === 0) {
      setSelectedAddressId("");
      return;
    }

    const nextSelected = addresses.find((address) => address.id === selectedAddressId);
    if (!nextSelected) {
      setSelectedAddressId(addresses.find((address) => address.isDefault)?.id ?? addresses[0]?.id ?? "");
    }
  }, [addresses, selectedAddressId]);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client || !accountId) {
      setAddresses([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    void client
      .from("addresses")
      .select("id, full_name, phone, alternate_phone, line1, line2, landmark, area, city, state, country, pin_code, address_type, is_default, deleted_at")
      .eq("user_id", accountId)
      .is("deleted_at", null)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (!active) {
          return;
        }

        if (error) {
          setAddresses([]);
          toast({
            title: "Addresses unavailable",
            description: getFriendlyErrorMessage(error, UI_MESSAGES.generic.server),
            variant: "danger",
          });
        } else {
          setAddresses(((data ?? []) as AddressRow[]).map(mapAddressRow));
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [accountId]);

  const openCreate = () => {
    setEditingAddressId(null);
    setEditorOpen(true);
  };

  const openEdit = (id: string) => {
    setEditingAddressId(id);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditorBusy(false);
  };

  const saveAddress = async (values: AddressFormValues) => {
    const client = getSupabaseBrowserClient();
    if (!client || !accountId) {
      toast({ title: "Addresses unavailable", description: UI_MESSAGES.auth.sessionExpired, variant: "danger" });
      return;
    }

    setEditorBusy(true);

    const payload = {
      user_id: accountId,
      full_name: values.fullName.trim(),
      phone: values.mobileNumber.trim(),
      alternate_phone: values.alternateMobile?.trim() || null,
      line1: values.houseFlat.trim(),
      line2: values.street.trim() || null,
      landmark: values.landmark.trim() || null,
      area: values.area.trim() || null,
      city: values.city.trim(),
      state: values.state.trim(),
      country: values.country,
      pin_code: values.pinCode.trim(),
      address_type: values.addressType.toLowerCase(),
      is_default: values.isDefault || addresses.length === 0,
    };

    const isEditing = Boolean(editingAddress?.id);
    const result = isEditing
      ? await client.from("addresses").update(payload).eq("id", editingAddress!.id).eq("user_id", accountId).is("deleted_at", null)
      : await client.from("addresses").insert(payload).select("id").single();

    if (result.error) {
      setEditorBusy(false);
      toast({
        title: "Address not saved",
        description: getFriendlyErrorMessage(result.error.message, UI_MESSAGES.generic.server),
        variant: "danger",
      });
      return;
    }

    const savedId = isEditing ? editingAddress!.id : (result.data as { id?: string } | null)?.id ?? null;

    if (payload.is_default) {
      const currentAddresses = addresses.filter((address) => address.id !== savedId);
      if (currentAddresses.length > 0) {
        await Promise.all(
          currentAddresses.map((address) =>
            client.from("addresses").update({ is_default: false }).eq("id", address.id).eq("user_id", accountId).is("deleted_at", null),
          ),
        );
      }
      if (savedId) {
        await client.from("addresses").update({ is_default: true }).eq("id", savedId).eq("user_id", accountId).is("deleted_at", null);
      }
    }

    const refreshed = await client
      .from("addresses")
      .select("id, full_name, phone, alternate_phone, line1, line2, landmark, area, city, state, country, pin_code, address_type, is_default, deleted_at")
      .eq("user_id", accountId)
      .is("deleted_at", null)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });

    if (!refreshed.error) {
      setAddresses(((refreshed.data ?? []) as AddressRow[]).map(mapAddressRow));
    }

    if (savedId) {
      setSelectedAddressId(savedId);
    }
    setEditorBusy(false);
    closeEditor();
    toast({
      title: isEditing ? "Address updated" : "Address saved",
      description: "Your saved address is now synced to Supabase.",
      variant: "success",
    });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client || !accountId) {
      toast({ title: "Addresses unavailable", description: UI_MESSAGES.auth.sessionExpired, variant: "danger" });
      return;
    }

    const nextSelectedId = addresses.find((address) => address.id !== deleteTarget.id)?.id ?? "";

    const { error } = await client
      .from("addresses")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", deleteTarget.id)
      .eq("user_id", accountId)
      .is("deleted_at", null);

    if (error) {
      toast({
        title: "Address not deleted",
        description: getFriendlyErrorMessage(error, UI_MESSAGES.generic.server),
        variant: "danger",
      });
      return;
    }

    const refreshed = await client
      .from("addresses")
      .select("id, full_name, phone, alternate_phone, line1, line2, landmark, area, city, state, country, pin_code, address_type, is_default, deleted_at")
      .eq("user_id", accountId)
      .is("deleted_at", null)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });

    if (!refreshed.error) {
      setAddresses(((refreshed.data ?? []) as AddressRow[]).map(mapAddressRow));
    }

    setSelectedAddressId((current) => (current === deleteTarget.id ? nextSelectedId : current));
    setDeleteTargetId(null);
    toast({
      title: "Address deleted",
      description: "The saved address was removed from your account.",
      variant: "warning",
    });
  };

  const setDefault = async (id: string) => {
    const client = getSupabaseBrowserClient();
    if (!client || !accountId) {
      return;
    }

    await Promise.all(
      addresses.map((address) =>
        client.from("addresses").update({ is_default: address.id === id }).eq("id", address.id).eq("user_id", accountId).is("deleted_at", null),
      ),
    );

    const refreshed = await client
      .from("addresses")
      .select("id, full_name, phone, alternate_phone, line1, line2, landmark, area, city, state, country, pin_code, address_type, is_default, deleted_at")
      .eq("user_id", accountId)
      .is("deleted_at", null)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });

    if (!refreshed.error) {
      setAddresses(((refreshed.data ?? []) as AddressRow[]).map(mapAddressRow));
    }
    setSelectedAddressId(id);
    const selected = addresses.find((address) => address.id === id);
    toast({
      title: "Default address updated",
      description: selected ? `${selected.fullName} will be used as the default address.` : "Default address updated.",
      variant: "success",
    });
  };

  const deliverHere = (id: string) => {
    setSelectedAddressId(id);
    const selected = addresses.find((address) => address.id === id);
    toast({
      title: "Address selected",
      description: selected ? `${selected.fullName} is selected for delivery.` : "Address selected for delivery.",
      variant: "success",
    });
  };

  const copyAddress = async (address: SavedAddress) => {
    const text = [
      address.fullName,
      address.mobileNumber,
      address.alternateMobile || null,
      address.houseFlat,
      address.street,
      address.landmark,
      address.area,
      `${address.city}, ${address.state} - ${address.pinCode}`,
      address.country,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Address copied", description: "The address has been copied to your clipboard.", variant: "success" });
    } catch {
      toast({ title: "Copy failed", description: "Clipboard access is unavailable in this session.", variant: "danger" });
    }
  };

  if (loading) {
    return <AddressManagementSkeleton />;
  }

  return (
    <motion.section
      className="relative isolate overflow-hidden border-b border-border surface-texture"
      initial={shouldReduceMotion ? false : "hidden"}
      animate={shouldReduceMotion ? undefined : "visible"}
      variants={{
        hidden: { opacity: 0, y: 10 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.04, delayChildren: 0.03 },
        },
      }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 top-4 h-72 w-72 rounded-full bg-orange-400/8 blur-3xl" />
        <div className="absolute right-0 top-16 h-64 w-64 rounded-full bg-sky-400/8 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:py-8">
        <AddressHeader
          title="Manage Addresses"
          subtitle="Save your delivery locations to checkout faster and keep your UniqueShopee orders flowing smoothly."
          count={addresses.length}
          onAdd={openCreate}
        />

        {addresses.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              title="No Saved Addresses"
              description="Save addresses to checkout faster."
              actionLabel="Add Address"
              onAction={openCreate}
            />
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            <Card className="rounded-[1.6rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Quick select</p>
                  <h2 className="mt-2 text-xl font-bold text-text">Selected for delivery</h2>
                </div>
                <Badge variant="neutral" className="hidden sm:inline-flex">
                  Reusable for checkout
                </Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {addresses.map((address) => (
                  <AddressSelector
                    key={address.id}
                    address={address}
                    selected={address.id === selectedAddress?.id}
                    compact
                    onSelect={() => setSelectedAddressId(address.id)}
                    onDeliverHere={() => deliverHere(address.id)}
                  />
                ))}
              </div>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              {addresses.map((address) => (
                <Card
                  key={address.id}
                  className={cn(
                    "overflow-hidden rounded-[1.45rem] border-white/80 bg-white/92 shadow-[var(--shadow-lg)]",
                    address.id === defaultAddress?.id && "border-accent/20",
                  )}
                >
                  <div className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-text">{address.fullName}</h3>
                          {address.isDefault && <Badge variant="success">Default</Badge>}
                          <AddressTypeBadge type={address.addressType} />
                        </div>
                        <p className="text-sm font-medium text-muted">{address.mobileNumber}</p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background-secondary text-accent">
                        <MapPin className="h-4 w-4" aria-hidden="true" />
                      </div>
                    </div>

                    <div className="space-y-2 rounded-[1.2rem] border border-border/70 bg-white/80 p-4 text-sm font-medium text-text">
                      <p>{address.houseFlat}</p>
                      <p>{address.street}</p>
                      <p>{address.area}</p>
                      <p>{address.landmark}</p>
                      <p>
                        {address.city}, {address.state} - {address.pinCode}
                      </p>
                      <p>{address.country}</p>
                      {address.alternateMobile ? <p className="text-muted">Alt: {address.alternateMobile}</p> : null}
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <Button type="button" variant="outline" size="sm" onClick={() => openEdit(address.id)} className="w-full">
                        <Edit3 className="h-4 w-4" aria-hidden="true" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full border border-border/70 bg-white/75"
                        onClick={() => setDeleteTargetId(address.id)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Delete
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={address.isDefault}
                        onClick={() => setDefault(address.id)}
                      >
                        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                        Set Default
                      </Button>
                      <Button
                        type="button"
                        variant="accent"
                        size="sm"
                        className="w-full"
                        onClick={() => deliverHere(address.id)}
                      >
                        <Truck className="h-4 w-4" aria-hidden="true" />
                        Deliver Here
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full border border-border/70 bg-white/75"
                        onClick={() => copyAddress(address)}
                      >
                        <Copy className="h-4 w-4" aria-hidden="true" />
                        Copy Address
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal
        open={editorOpen}
        onOpenChange={(next) => {
          if (!next) {
            closeEditor();
            setEditingAddressId(null);
          }
        }}
        title={editingAddress ? "Edit Address" : "Add Address"}
        description={editingAddress ? "Update the saved delivery address." : "Add a new delivery address."}
        className="max-w-4xl"
      >
        <AddressForm
          initialValues={formInitialValues}
          submitLabel={editingAddress ? "Save Address" : "Save Address"}
          onSubmit={saveAddress}
          onCancel={() => {
            closeEditor();
            setEditingAddressId(null);
          }}
          isBusy={editorBusy}
        />
      </Modal>

      <AddressDeleteConfirm
        open={Boolean(deleteTargetId)}
        address={deleteTarget}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />

      <div className="fixed inset-x-4 bottom-20 z-40 sm:hidden">
        <Button type="button" variant="accent" size="lg" className="w-full shadow-[var(--shadow-lg)]" onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Address
        </Button>
      </div>
    </motion.section>
  );
}

export {
  AddressManagementPage,
  AddressManagementSkeleton,
  AddressSelector,
  AddressForm,
  AddressHeader,
  AddressDeleteConfirm,
  AddressTypeBadge,
};
