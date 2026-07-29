"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CreditCard,
  Edit3,
  ExternalLink,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Product } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { cn, formatPrice } from "@/lib/utils";
import { resolveCouponCode } from "@/lib/checkout-pricing";
import { useAuth } from "@/components/auth/auth-provider";
import { useCartSync } from "@/components/cart/cart-sync-provider";
import { loadUserAddresses, type CheckoutAddress } from "@/lib/address-service";
import { createCheckoutOrder, loadCheckoutPricing, type CheckoutPricingSummary } from "@/lib/order-service";
import { validateCartAddition } from "@/lib/cart-service";
import { ensureCurrentUserProfile } from "@/lib/supabase/auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatRazorpayContact, getRazorpayKeyId, loadRazorpayCheckoutScript, type RazorpaySuccessResponse, type RazorpayWindow } from "@/lib/razorpay";
import { toast } from "@/hooks/use-toast";
import { useCartStore } from "@/store/cart-store";

type PaymentMethod = "cod" | "razorpay";

type DraftAddressState = {
  name: string;
  phone: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  pin: string;
  type: "Home" | "Office" | "Other";
};

type ProductMeta = {
  productId: string;
  brand: string;
  variant: string;
  slug: string;
};

type ProductRow = {
  id: string;
  slug: string;
  brand_id: string;
  og_image_url: string | null;
  deleted_at: string | null;
  status: string;
};

type BrandRow = {
  id: string;
  name: string;
  deleted_at: string | null;
};

type VariantRow = {
  id: string;
  product_id: string;
  variant_name: string;
  option_label: string | null;
  option_value: string | null;
  is_default: boolean;
  deleted_at: string | null;
};

const SECTION_VARIANTS = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.04, delayChildren: 0.03 },
  },
};

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
  },
};

const STORAGE_KEYS = {
  addressId: "checkout.selectedAddressId",
  paymentMethod: "checkout.paymentMethod",
  notes: "checkout.notes",
  couponInput: "checkout.couponInput",
};

function toOptionalText(value: string) {
  const next = value.trim();
  return next.length > 0 ? next : null;
}

function formatExpectedDelivery() {
  const start = new Date();
  const end = new Date();
  start.setDate(start.getDate() + 2);
  end.setDate(end.getDate() + 4);

  const formatter = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  });

  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function formatAddressType(type: CheckoutAddress["type"]) {
  if (type === "Office") return "Office";
  if (type === "Other") return "Other";
  return "Home";
}

function formatVariantLabel(row?: VariantRow | null) {
  if (!row) return "Standard";
  const extra = row.option_label && row.option_value ? `${row.option_label}: ${row.option_value}` : "";
  return [row.variant_name, extra].filter(Boolean).join(" - ") || "Standard";
}

function buildAddressDraft(profileName: string, profilePhone: string): DraftAddressState {
  return {
    name: profileName,
    phone: profilePhone,
    line1: "",
    line2: "",
    landmark: "",
    city: "",
    state: "",
    pin: "",
    type: "Home",
  };
}

function SummaryRow({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className={cn("font-medium", emphasize ? "text-text" : "text-muted")}>{label}</span>
      <span className={cn("font-bold", emphasize ? "text-lg text-text" : "text-text")}>{value}</span>
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-bold text-text">{title}</h2>
      {description ? <p className="mt-2 text-sm font-medium leading-7 text-muted">{description}</p> : null}
    </div>
  );
}

function AddressCard({
  address,
  selected,
  onSelect,
  onEdit,
  onDelete,
}: {
  address: CheckoutAddress;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article
      className={cn(
        "group w-full rounded-[1.35rem] border p-4 text-left transition-all duration-200",
        selected
          ? "border-accent/30 bg-accent/5 shadow-[var(--shadow-lg)]"
          : "border-border/70 bg-white hover:border-accent/20 hover:shadow-[var(--shadow-sm)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-text">{formatAddressType(address.type)}</p>
            {address.isDefault ? <Badge variant="success">Default</Badge> : null}
          </div>
          <p className="mt-2 text-sm font-semibold text-text">{address.name}</p>
          <p className="mt-1 text-xs font-medium text-muted">{address.phone}</p>
        </div>
        {selected ? (
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Check className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <div className="mt-3 space-y-1 text-sm font-medium text-text">
        <p>{address.line1}</p>
        {address.line2 ? <p>{address.line2}</p> : null}
        <p>
          {address.city}, {address.state} - {address.pin}
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={onSelect}>
          Select
        </Button>
        <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={onEdit}>
          <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
          Edit
        </Button>
        <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          Delete
        </Button>
      </div>
    </article>
  );
}

function CheckoutItem({
  product,
  quantity,
  brand,
  variant,
  onIncrease,
  onDecrease,
  onRemove,
}: {
  product: Product;
  quantity: number;
  brand: string;
  variant: string;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-[1.35rem] border border-border/70 bg-white p-3 shadow-[var(--shadow-sm)]">
      <div className="grid gap-3 sm:grid-cols-[88px_minmax(0,1fr)]">
        <div className="relative aspect-square overflow-hidden rounded-[1rem] border border-border/60 bg-background-secondary">
          <Image src={product.image} alt={product.name} fill sizes="88px" className="object-cover" />
        </div>

        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{brand}</p>
              <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-6 text-text">{product.name}</h3>
              <p className="mt-1 text-xs font-medium text-muted">{variant}</p>
            </div>
            <Button asChild size="sm" variant="ghost" className="shrink-0 rounded-full px-2 text-muted">
              <Link href={`/product/${product.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-muted">
                <span>Qty</span>
                <div className="inline-flex h-9 items-center overflow-hidden rounded-full border border-border/70 bg-white shadow-[var(--shadow-sm)]">
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center text-text transition-colors hover:bg-background-secondary"
                    onClick={onDecrease}
                    aria-label={`Decrease quantity for ${product.name}`}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span className="min-w-8 px-2 text-center text-sm font-bold text-text">{quantity}</span>
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center text-text transition-colors hover:bg-background-secondary"
                    onClick={onIncrease}
                    aria-label={`Increase quantity for ${product.name}`}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-medium text-muted">Unit {formatPrice(product.price)}</span>
                <span className="font-bold text-text">Total {formatPrice(product.price * quantity)}</span>
              </div>
            </div>

            <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={onRemove}>
              Remove Item
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddressForm({
  value,
  onChange,
  onSave,
  onCancel,
  saving,
  error,
  profileName,
  profilePhone,
}: {
  value: DraftAddressState;
  onChange: (next: DraftAddressState) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error?: string | null;
  profileName: string;
  profilePhone: string;
}) {
  return (
    <Card className="rounded-[1.5rem] border-white/80 bg-white p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-accent" aria-hidden="true" />
        <h3 className="text-base font-bold text-text">Delivery address</h3>
      </div>
      <p className="mt-1 text-sm font-medium text-muted">Name and phone are prefilled from your profile.</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="checkout-name">
          <Input
            id="checkout-name"
            value={value.name}
            onChange={(event) => onChange({ ...value, name: event.target.value })}
            placeholder={profileName || "Full name"}
            className="h-12 rounded-full bg-white"
          />
        </Field>
        <Field label="Phone" htmlFor="checkout-phone">
          <Input
            id="checkout-phone"
            value={value.phone}
            onChange={(event) => onChange({ ...value, phone: event.target.value })}
            placeholder={profilePhone || "+91 98765 43210"}
            className="h-12 rounded-full bg-white"
          />
        </Field>
        <Field label="Address line 1" htmlFor="checkout-line1">
          <Input
            id="checkout-line1"
            value={value.line1}
            onChange={(event) => onChange({ ...value, line1: event.target.value })}
            placeholder="House / flat / building"
            className="h-12 rounded-full bg-white"
          />
        </Field>
        <Field label="Address line 2" htmlFor="checkout-line2">
          <Input
            id="checkout-line2"
            value={value.line2}
            onChange={(event) => onChange({ ...value, line2: event.target.value })}
            placeholder="Street / area"
            className="h-12 rounded-full bg-white"
          />
        </Field>
        <Field label="Landmark" htmlFor="checkout-landmark">
          <Input
            id="checkout-landmark"
            value={value.landmark}
            onChange={(event) => onChange({ ...value, landmark: event.target.value })}
            placeholder="Optional landmark"
            className="h-12 rounded-full bg-white"
          />
        </Field>
        <Field label="City" htmlFor="checkout-city">
          <Input
            id="checkout-city"
            value={value.city}
            onChange={(event) => onChange({ ...value, city: event.target.value })}
            placeholder="City"
            className="h-12 rounded-full bg-white"
          />
        </Field>
        <Field label="State" htmlFor="checkout-state">
          <Input
            id="checkout-state"
            value={value.state}
            onChange={(event) => onChange({ ...value, state: event.target.value })}
            placeholder="State"
            className="h-12 rounded-full bg-white"
          />
        </Field>
        <Field label="PIN Code" htmlFor="checkout-pin">
          <Input
            id="checkout-pin"
            value={value.pin}
            onChange={(event) => onChange({ ...value, pin: event.target.value })}
            placeholder="6-digit PIN"
            inputMode="numeric"
            maxLength={6}
            className="h-12 rounded-full bg-white"
          />
        </Field>
        <Field label="Address type" htmlFor="checkout-type">
          <div className="flex flex-wrap gap-2">
            {(["Home", "Office", "Other"] as const).map((type) => (
              <Button
                key={type}
                type="button"
                size="sm"
                variant={value.type === type ? "accent" : "outline"}
                className="rounded-full"
                onClick={() => onChange({ ...value, type })}
              >
                {type}
              </Button>
            ))}
          </div>
        </Field>
      </div>

      {error ? <p className="mt-3 text-sm font-medium text-danger">{error}</p> : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="button" variant="primary" size="md" onClick={onSave} loading={saving}>
          Save Address
        </Button>
        <Button type="button" variant="outline" size="md" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="w-full">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function CheckoutShell() {
  const shouldReduceMotion = useReducedMotion();
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { loaded: cartLoaded } = useCartSync();
  const items = useCartStore((state) => state.items);
  const couponCode = useCartStore((state) => state.couponCode);
  const setCouponCode = useCartStore((state) => state.setCouponCode);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clear);

  const [metaByProductId, setMetaByProductId] = useState<Record<string, ProductMeta>>({});
  const [addresses, setAddresses] = useState<CheckoutAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [draftAddress, setDraftAddress] = useState<DraftAddressState>(buildAddressDraft("", ""));
  const [addressErrors, setAddressErrors] = useState<Partial<Record<keyof DraftAddressState, string>>>({});
  const [addressBusy, setAddressBusy] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [couponInput, setCouponInput] = useState(couponCode ?? "");
  const [notes, setNotes] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [razorpayLoading, setRazorpayLoading] = useState(false);
  const [pricing, setPricing] = useState<CheckoutPricingSummary | null>(null);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [cartValidationLoading, setCartValidationLoading] = useState(true);
  const [cartValidationError, setCartValidationError] = useState<string | null>(null);
  const [resolvedAccountId, setResolvedAccountId] = useState<string | null>(null);

  const accountId = resolvedAccountId;
  const profileName = profile?.full_name ?? "";
  const profilePhone = profile?.phone ?? "";
  const hasSavedAddresses = addresses.length > 0;

  useEffect(() => {
    let cancelled = false;

    const resolveAccountId = async () => {
      if (authLoading) {
        return;
      }

      if (!user) {
        setResolvedAccountId(null);
        return;
      }

      if (profile?.id) {
        setResolvedAccountId(profile.id);
        return;
      }

      const client = getSupabaseBrowserClient();
      if (!client) {
        setResolvedAccountId(null);
        return;
      }

      const ensuredProfile = await ensureCurrentUserProfile(client);
      if (!cancelled) {
        setResolvedAccountId(ensuredProfile?.id ?? null);
      }
    };

    void resolveAccountId();

    return () => {
      cancelled = true;
    };
  }, [authLoading, profile?.id, user]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storage = window.localStorage;
    const restoredAddressId = storage.getItem(STORAGE_KEYS.addressId) ?? "";
    const restoredPayment = storage.getItem(STORAGE_KEYS.paymentMethod) as PaymentMethod | null;
    const restoredNotes = storage.getItem(STORAGE_KEYS.notes) ?? "";
    const restoredCouponInput = storage.getItem(STORAGE_KEYS.couponInput) ?? "";

    if (restoredPayment === "cod" || restoredPayment === "razorpay") {
      setPaymentMethod(restoredPayment);
    }

    setNotes(restoredNotes);
    setCouponInput(restoredCouponInput || couponCode || "");
    if (restoredAddressId) {
      setSelectedAddressId(restoredAddressId);
    }
  }, [couponCode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storage = window.localStorage;
    storage.setItem(STORAGE_KEYS.paymentMethod, paymentMethod);
    storage.setItem(STORAGE_KEYS.notes, notes);
    storage.setItem(STORAGE_KEYS.couponInput, couponInput);
  }, [couponInput, notes, paymentMethod]);

  useEffect(() => {
    if (typeof window === "undefined" || !selectedAddressId) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEYS.addressId, selectedAddressId);
  }, [selectedAddressId]);

  useEffect(() => {
    if (couponCode && couponCode !== couponInput) {
      setCouponInput(couponCode);
    }
  }, [couponCode, couponInput]);

  useEffect(() => {
    let cancelled = false;

    const loadPricing = async () => {
      if (authLoading || !cartLoaded || (user && !accountId)) {
        return;
      }

      if (!user || !accountId) {
        setPricing(null);
        setPricingLoading(false);
        setPricingError("Sign in to see live checkout totals.");
        return;
      }

      const client = getSupabaseBrowserClient();
      if (!client) {
        setPricing(null);
        setPricingLoading(false);
        setPricingError("Supabase is not configured.");
        return;
      }

      setPricingLoading(true);
      const result = await loadCheckoutPricing(client, { couponCode });

      if (cancelled) {
        return;
      }

      if (result.error || !result.pricing) {
        setPricing(null);
        setPricingError(result.error ?? "Unable to calculate checkout totals.");
      } else {
        setPricing(result.pricing);
        setPricingError(null);
      }

      setPricingLoading(false);
    };

    void loadPricing();

    return () => {
      cancelled = true;
    };
  }, [accountId, authLoading, cartLoaded, couponCode, items, user]);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      if (authLoading || !cartLoaded || (user && !accountId)) {
        return;
      }

      const client = getSupabaseBrowserClient();
      if (!client) {
        return;
      }

      const productIds = Array.from(new Set(items.map((item) => item.productId)));
      if (productIds.length > 0) {
        const [productResult, brandResult, variantResult] = await Promise.all([
          client.from("products").select("id, slug, brand_id, og_image_url, deleted_at, status").in("id", productIds).is("deleted_at", null),
          client.from("brands").select("id, name, deleted_at").is("deleted_at", null),
          client
            .from("product_variants")
            .select("id, product_id, variant_name, option_label, option_value, is_default, deleted_at")
            .in("product_id", productIds)
            .is("deleted_at", null),
        ]);

        if (!cancelled && !productResult.error && !brandResult.error && !variantResult.error) {
          const products = (productResult.data ?? []) as ProductRow[];
          const brands = new Map(((brandResult.data ?? []) as BrandRow[]).map((row) => [row.id, row.name]));
          const variants = (variantResult.data ?? []) as VariantRow[];
          const variantsByProductId = new Map<string, VariantRow[]>();

          for (const variant of variants) {
            const current = variantsByProductId.get(variant.product_id) ?? [];
            current.push(variant);
            variantsByProductId.set(variant.product_id, current);
          }

          const next: Record<string, ProductMeta> = {};
          for (const product of products) {
            const brand = brands.get(product.brand_id) ?? "Brand";
            const chosenVariant = variantsByProductId.get(product.id)?.find((variant) => variant.is_default) ??
              variantsByProductId.get(product.id)?.[0] ??
              null;
            next[product.id] = {
              productId: product.id,
              brand,
              variant: formatVariantLabel(chosenVariant),
              slug: product.slug,
            };
          }

          setMetaByProductId(next);
        }
      }

      if (!accountId) {
        setAddresses([]);
        setSelectedAddressId("");
        setShowAddressForm(true);
        return;
      }

      const remoteAddresses = await loadUserAddresses(accountId);
      if (cancelled) {
        return;
      }

      setAddresses(remoteAddresses);

      const savedId = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEYS.addressId) ?? "" : "";
      const selected = remoteAddresses.find((address) => address.id === savedId) ?? remoteAddresses.find((address) => address.isDefault) ?? remoteAddresses[0] ?? null;
      setSelectedAddressId(selected?.id ?? "");
      setShowAddressForm(remoteAddresses.length === 0);
      if (!selected?.id) {
        setDraftAddress(buildAddressDraft(profileName, profilePhone));
      }
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [accountId, authLoading, cartLoaded, items, profileName, profilePhone, user]);

  useEffect(() => {
    let cancelled = false;

    const validateItems = async () => {
      if (!cartLoaded) {
        return;
      }

      if (items.length === 0) {
        setCartValidationLoading(false);
        setCartValidationError(null);
        return;
      }

      setCartValidationLoading(true);
      const checks = await Promise.all(items.map((item) => validateCartAddition(item, item.quantity)));
      if (cancelled) {
        return;
      }

      setCartValidationError(checks.find((check) => check.error)?.error ?? null);
      setCartValidationLoading(false);
    };

    void validateItems();

    return () => {
      cancelled = true;
    };
  }, [cartLoaded, items]);

  useEffect(() => {
    if (!showAddressForm && !hasSavedAddresses) {
      setShowAddressForm(true);
    }
  }, [hasSavedAddresses, showAddressForm]);

  const selectedAddress = useMemo(
    () => addresses.find((address) => address.id === selectedAddressId) ?? addresses[0] ?? null,
    [addresses, selectedAddressId],
  );

  const cartProducts = useMemo(
    () =>
      items.map((item) => ({
        id: item.productId,
        name: item.name,
        price: item.price,
        compareAtPrice: item.compareAtPrice,
        image: item.image || "/images/placeholders/department-plumbing.svg",
        slug: item.slug ?? item.productId,
        category: item.category ?? "",
        inStock: item.inStock ?? true,
        stockCount: item.stockCount,
        reservedCount: item.reservedCount,
        lowStockThreshold: item.lowStockThreshold,
      })) satisfies Product[],
    [items],
  );

  const deliveryEstimate = useMemo(() => formatExpectedDelivery(), []);

  const empty = items.length === 0;
  const summarySavings = Math.max(0, (pricing?.discountTotal ?? 0) + (pricing?.couponDiscount ?? 0));
  const selectedAddressLine = selectedAddress
    ? `${selectedAddress.city}, ${selectedAddress.state}`
    : "Select a delivery address";

  const validateDraftAddress = () => {
    const errors: Partial<Record<keyof DraftAddressState, string>> = {};

    if (!draftAddress.name.trim()) errors.name = "Required";
    if (!draftAddress.phone.trim()) errors.phone = "Required";
    if (!draftAddress.line1.trim()) errors.line1 = "Required";
    if (!draftAddress.city.trim()) errors.city = "Required";
    if (!draftAddress.state.trim()) errors.state = "Required";
    if (!/^\d{6}$/.test(draftAddress.pin.trim())) errors.pin = "Enter a valid 6-digit PIN";

    setAddressErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openNewAddressForm = () => {
    setEditingAddressId(null);
    setDraftAddress(buildAddressDraft(profileName, profilePhone));
    setAddressErrors({});
    setShowAddressForm(true);
  };

  const openEditAddressForm = (address: CheckoutAddress) => {
    setEditingAddressId(address.id);
    setDraftAddress({
      name: address.name,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2,
      landmark: "",
      city: address.city,
      state: address.state,
      pin: address.pin,
      type: address.type,
    });
    setAddressErrors({});
    setShowAddressForm(true);
  };

  const refreshAddresses = async (selectedId?: string) => {
    const client = getSupabaseBrowserClient();
    if (!client || !accountId) {
      return;
    }

    const remoteAddresses = await loadUserAddresses(accountId, client);
    setAddresses(remoteAddresses);

    const resolved = remoteAddresses.find((address) => address.id === selectedId) ??
      remoteAddresses.find((address) => address.isDefault) ??
      remoteAddresses[0] ??
      null;
    setSelectedAddressId(resolved?.id ?? "");

    if (typeof window !== "undefined") {
      if (resolved?.id) {
        window.localStorage.setItem(STORAGE_KEYS.addressId, resolved.id);
      } else {
        window.localStorage.removeItem(STORAGE_KEYS.addressId);
      }
    }
  };

  const saveAddress = async () => {
    if (!validateDraftAddress()) {
      toast({
        title: "Check address details",
        description: "Please complete the required fields before saving.",
        variant: "warning",
      });
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client || !accountId) {
      toast({
        title: "Supabase not ready",
        description: "Please sign in again to save the address.",
        variant: "warning",
      });
      return;
    }

    setAddressBusy(true);

    const payload = {
      full_name: draftAddress.name.trim(),
      phone: draftAddress.phone.trim(),
      line1: draftAddress.line1.trim(),
      line2: toOptionalText(draftAddress.line2),
      landmark: toOptionalText(draftAddress.landmark),
      area: null,
      city: draftAddress.city.trim(),
      state: draftAddress.state.trim(),
      country: "India",
      pin_code: draftAddress.pin.trim(),
      address_type: draftAddress.type.toLowerCase(),
      is_default: addresses.length === 0 || addresses.every((address) => !address.isDefault),
    };

    let savedId = editingAddressId;
    let errorMessage: string | null = null;

    if (editingAddressId) {
      const { error } = await client
        .from("addresses")
        .update(payload)
        .eq("id", editingAddressId)
        .eq("user_id", accountId)
        .is("deleted_at", null);
      errorMessage = error?.message ?? null;
    } else {
      const { data, error } = await client
        .from("addresses")
        .insert({ user_id: accountId, ...payload })
        .select("id")
        .single();
      savedId = (data as { id?: string } | null)?.id ?? null;
      errorMessage = error?.message ?? null;
    }

    if (errorMessage) {
      setAddressBusy(false);
      toast({
        title: "Address not saved",
        description: errorMessage,
        variant: "warning",
      });
      return;
    }

    if (payload.is_default) {
      const { data: currentAddresses } = await client
        .from("addresses")
        .select("id")
        .eq("user_id", accountId)
        .is("deleted_at", null);
      const ids = ((currentAddresses ?? []) as { id: string }[]).map((row) => row.id).filter((id) => id !== savedId);
      if (savedId && ids.length > 0) {
        await Promise.all(
          ids.map((id) =>
            client.from("addresses").update({ is_default: false }).eq("id", id).eq("user_id", accountId).is("deleted_at", null),
          ),
        );
        await client.from("addresses").update({ is_default: true }).eq("id", savedId).eq("user_id", accountId).is("deleted_at", null);
      }
    }

    await refreshAddresses(savedId ?? undefined);
    setShowAddressForm(false);
    setEditingAddressId(null);
    setAddressBusy(false);
    setDraftAddress(buildAddressDraft(profileName, profilePhone));
    toast({
      title: editingAddressId ? "Address updated" : "Address saved",
      description: "Your address is ready for checkout.",
      variant: "success",
    });
  };

  const deleteAddress = async (addressId: string) => {
    const client = getSupabaseBrowserClient();
    if (!client || !accountId) {
      return;
    }

    const confirmed = window.confirm("Delete this address?");
    if (!confirmed) {
      return;
    }

    setAddressBusy(true);
    const { error } = await client
      .from("addresses")
      .delete()
      .eq("id", addressId)
      .eq("user_id", accountId)
      .is("deleted_at", null);

    if (error) {
      setAddressBusy(false);
      toast({
        title: "Address not deleted",
        description: error.message,
        variant: "warning",
      });
      return;
    }

    const remaining = addresses.filter((address) => address.id !== addressId);
    const nextSelected = remaining.find((address) => address.isDefault) ?? remaining[0] ?? null;

    if (remaining.length > 0 && !remaining.some((address) => address.isDefault)) {
      const nextDefault = remaining[0];
      if (nextDefault) {
        await Promise.all(
          remaining.map((address) =>
            client
              .from("addresses")
              .update({ is_default: address.id === nextDefault.id })
              .eq("id", address.id)
              .eq("user_id", accountId)
              .is("deleted_at", null),
          ),
        );
      }
    }

    setAddresses(remaining);
    setSelectedAddressId(nextSelected?.id ?? "");
    setAddressBusy(false);
    if (typeof window !== "undefined") {
      if (nextSelected?.id) {
        window.localStorage.setItem(STORAGE_KEYS.addressId, nextSelected.id);
      } else {
        window.localStorage.removeItem(STORAGE_KEYS.addressId);
      }
    }
    toast({
      title: "Address deleted",
      description: "The address was removed from your account.",
      variant: "success",
    });
  };

  const handleApplyCoupon = () => {
    const code = resolveCouponCode(couponInput);
    if (code) {
      setCouponCode(code);
      toast({ title: "Coupon applied", description: `${code} will be validated against live pricing.`, variant: "success" });
      return;
    }
    setCouponCode(null);
    toast({ title: "Coupon cleared", description: "Enter a coupon code to calculate live totals.", variant: "warning" });
  };

  const buildAddressSnapshot = (address: CheckoutAddress) => ({
    name: address.name,
    full_name: address.name,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2,
    landmark: "",
    area: "",
    city: address.city,
    state: address.state,
    country: "India",
    pin_code: address.pin,
    pincode: address.pin,
  });

  const handlePlaceOrder = async () => {
    if (placingOrder || pricingLoading || cartValidationLoading || cartValidationError || pricingError) {
      return;
    }

    if (!user || !accountId) {
      toast({
        title: "Sign in required",
        description: user ? "Your account is still being prepared. Please try again in a moment." : "Please log in to place your order.",
        variant: "warning",
      });
      return;
    }

    if (!selectedAddress) {
      toast({
        title: "Select Delivery Address",
        description: "Choose a saved address or add a new one before placing the order.",
        variant: "warning",
      });
      return;
    }

    const snapshot = buildAddressSnapshot(selectedAddress);

    if (paymentMethod === "cod") {
      const client = getSupabaseBrowserClient();
      if (!client) {
        toast({
          title: "Supabase not ready",
          description: "The live checkout flow needs your database connection.",
          variant: "warning",
        });
        return;
      }

      setPlacingOrder(true);

      const orderResult = await createCheckoutOrder(client, {
        shippingAddressId: selectedAddress.id,
        billingAddressId: selectedAddress.id,
        paymentMethod: "Cash on Delivery",
        paymentReference: "COD",
        couponCode,
        notes: notes.trim() || null,
        shippingAddressSnapshot: snapshot,
        billingAddressSnapshot: snapshot,
      });

      setPlacingOrder(false);

      if (orderResult.error || !orderResult.orderId) {
        toast({
          title: "Order not placed",
          description: orderResult.error ?? "We could not complete checkout right now.",
          variant: "warning",
        });
        return;
      }

      clearCart();
      setCouponCode(null);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(STORAGE_KEYS.addressId);
        window.localStorage.removeItem(STORAGE_KEYS.notes);
        window.localStorage.removeItem(STORAGE_KEYS.couponInput);
      }

      toast({
        title: "COD order placed",
        description: `Your order ${orderResult.orderNumber ?? ""} is confirmed for delivery.`,
        variant: "success",
      });
      router.push(`/orders/${orderResult.orderId}`);
      return;
    }

    const razorpayKeyId = getRazorpayKeyId();
    if (!razorpayKeyId) {
      toast({
        title: "Razorpay not ready",
        description: "Add the Razorpay public key to enable online payments.",
        variant: "warning",
      });
      return;
    }

    setPlacingOrder(true);
    setRazorpayLoading(true);

    try {
      const createResponse = await fetch("/api/razorpay/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          couponCode,
        }),
      });

      const createData = (await createResponse.json().catch(() => null)) as
        | {
            error?: string;
            razorpayOrderId?: string;
            amount?: number;
            currency?: string;
            keyId?: string;
            customer?: { name?: string; email?: string; contact?: string };
          }
        | null;

      if (!createResponse.ok || !createData?.razorpayOrderId || !createData.amount || !createData.currency) {
        throw new Error(createData?.error ?? "Unable to create Razorpay order.");
      }

      await loadRazorpayCheckoutScript();

      const resolvedKey = createData.keyId ?? razorpayKeyId;
      if (!resolvedKey) {
        throw new Error("Razorpay key is missing.");
      }

      const paymentReference = createData.razorpayOrderId;
      const contact = formatRazorpayContact(createData.customer?.contact || selectedAddress.phone);
      const RazorpayConstructor = (window as RazorpayWindow).Razorpay;

      if (!RazorpayConstructor) {
        throw new Error("Razorpay checkout could not be loaded.");
      }

      const paymentResult = await new Promise<RazorpaySuccessResponse>((resolve, reject) => {
        const razorpay = new RazorpayConstructor({
          key: resolvedKey,
          amount: createData.amount ?? Math.round((pricing?.totalAmount ?? 0) * 100),
          currency: createData.currency ?? "INR",
          order_id: paymentReference,
          name: "UniqueShopee",
          description: `Checkout for ${items.length} item${items.length === 1 ? "" : "s"}`,
          prefill: {
            name: createData.customer?.name ?? profileName ?? selectedAddress.name,
            email: createData.customer?.email ?? user?.email ?? "",
            contact: contact || formatRazorpayContact(selectedAddress.phone),
          },
          notes: {
            coupon_code: couponCode ?? "",
            payment_method: "Razorpay",
          },
          theme: {
            color: "#1d4ed8",
          },
          retry: {
            enabled: true,
            max_count: 3,
          },
          modal: {
            confirm_close: true,
            escape: false,
            backdropclose: false,
            animation: true,
            ondismiss: () => {
              setPlacingOrder(false);
              setRazorpayLoading(false);
              reject(new Error("Payment cancelled."));
            },
          },
          handler: (response) => {
            resolve(response);
          },
        });

        razorpay.open();
      });

      const verifyResponse = await fetch("/api/razorpay/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          razorpayPaymentId: paymentResult.razorpay_payment_id,
          razorpayOrderId: paymentResult.razorpay_order_id,
          razorpaySignature: paymentResult.razorpay_signature,
          expectedAmount: createData.amount,
          currency: createData.currency,
          shippingAddressId: selectedAddress.id,
          billingAddressId: selectedAddress.id,
          paymentMethod: "Razorpay",
          couponCode,
          notes: notes.trim() || null,
          shippingAddressSnapshot: snapshot,
          billingAddressSnapshot: snapshot,
        }),
      });

      const verifyData = (await verifyResponse.json().catch(() => null)) as
        | {
            error?: string;
            orderId?: string;
            orderNumber?: string;
          }
        | null;

      if (!verifyResponse.ok || !verifyData?.orderId) {
        throw new Error(verifyData?.error ?? "Payment verified, but the order could not be finalized.");
      }

      clearCart();
      setCouponCode(null);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(STORAGE_KEYS.addressId);
        window.localStorage.removeItem(STORAGE_KEYS.notes);
        window.localStorage.removeItem(STORAGE_KEYS.couponInput);
      }

      toast({
        title: "Payment successful",
        description: `Your order ${verifyData.orderNumber ?? ""} is confirmed.`,
        variant: "success",
      });
      router.push(`/orders/${verifyData.orderId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "We could not complete the Razorpay payment.";
      toast({
        title: "Payment not completed",
        description: message,
        variant: "warning",
      });
    } finally {
      setPlacingOrder(false);
      setRazorpayLoading(false);
    }
  };

  const onToggleAddressForm = () => {
    if (showAddressForm) {
      setShowAddressForm(false);
      return;
    }
    openNewAddressForm();
  };

  if (authLoading || !cartLoaded || (user && !accountId)) {
    return (
      <section className="relative isolate overflow-hidden border-b border-border surface-texture">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:py-14">
          <div className="animate-pulse space-y-4 rounded-[1.75rem] border border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
            <div className="h-4 w-28 rounded-full bg-background-secondary" />
            <div className="h-10 w-56 rounded-2xl bg-background-secondary" />
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="space-y-4">
                <div className="h-32 rounded-[1.5rem] bg-background-secondary" />
                <div className="h-40 rounded-[1.5rem] bg-background-secondary" />
              </div>
              <div className="h-96 rounded-[1.5rem] bg-background-secondary" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <motion.section
      className="relative isolate overflow-hidden border-b border-border surface-texture"
      initial={shouldReduceMotion ? false : "hidden"}
      animate={shouldReduceMotion ? undefined : "visible"}
      variants={SECTION_VARIANTS}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-12 h-80 w-80 rounded-full bg-orange-300/6 blur-3xl" />
        <div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-sky-300/6 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-3 pb-28 sm:px-6 sm:py-4 sm:pb-32 lg:py-6">
        <motion.header
          className="mb-4 flex items-center justify-between gap-3 rounded-[1.35rem] border border-white/80 bg-white/92 px-4 py-3 shadow-[var(--shadow-lg)]"
          variants={ITEM_VARIANTS}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Button asChild size="sm" variant="ghost" className="h-9 rounded-full px-2 text-text">
                <Link href="/cart">
                  <ArrowRight className="h-4 w-4 rotate-180" aria-hidden="true" />
                </Link>
              </Button>
              <h1 className="text-lg font-bold text-text sm:text-xl">Checkout</h1>
            </div>
          </div>

        </motion.header>

        {cartValidationError ? (
          <div className="mb-4 rounded-[1.25rem] border border-danger/20 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
            {cartValidationError}
          </div>
        ) : null}

        {pricingError ? (
          <div className="mb-4 rounded-[1.25rem] border border-warning/20 bg-warning/10 px-4 py-3 text-sm font-medium text-warning">
            {pricingError}
          </div>
        ) : null}

        {empty ? (
          <motion.div variants={ITEM_VARIANTS} className="rounded-[1.65rem] border border-white/80 bg-white/92 p-6 shadow-[var(--shadow-lg)]">
            <h2 className="text-2xl font-bold text-text">Your checkout is empty</h2>
            <p className="mt-2 text-sm font-medium leading-7 text-muted">Add products to your cart to continue.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild variant="primary" size="md">
                <Link href="/products">Continue Shopping</Link>
              </Button>
              <Button asChild variant="outline" size="md">
                <Link href="/cart">Back to Cart</Link>
              </Button>
            </div>
          </motion.div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
            <div className="space-y-5">
              <motion.section variants={ITEM_VARIANTS} className="rounded-[1.65rem] border border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
                <SectionTitle eyebrow="Order Summary" title="Order Summary" />

                <div className="mt-5 space-y-3 rounded-[1.25rem] border border-border/70 bg-white p-4">
                  <SummaryRow label="Subtotal" value={formatPrice(pricing?.subtotal ?? 0)} />
                  <SummaryRow label="Discount" value={`- ${formatPrice(pricing?.discountTotal ?? 0)}`} />
                  <SummaryRow label="Coupon Discount" value={pricing?.couponDiscount && pricing.couponDiscount > 0 ? `- ${formatPrice(pricing.couponDiscount)}` : formatPrice(0)} />
                  <SummaryRow label="GST" value={formatPrice(pricing?.taxTotal ?? 0)} />
                  <SummaryRow label="Shipping" value={pricing?.shippingTotal === 0 ? "Free" : formatPrice(pricing?.shippingTotal ?? 0)} />
                  <div className="border-t border-border/70 pt-3">
                    <SummaryRow label="Grand Total" value={formatPrice(pricing?.totalAmount ?? 0)} emphasize />
                  </div>
                  <div className="rounded-[1rem] border border-success/20 bg-success/10 px-3 py-2 text-sm font-medium text-success">
                    You Saved {formatPrice(summarySavings)}
                  </div>
                </div>
              </motion.section>

              <motion.section variants={ITEM_VARIANTS} className="rounded-[1.65rem] border border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
                <SectionTitle eyebrow="Coupon" title="Coupon" />
                <div className="mt-4 flex items-center gap-2 rounded-[1.2rem] border border-border/70 bg-white p-2">
                  <Input
                    id="checkout-coupon"
                    value={couponInput}
                    onChange={(event) => setCouponInput(event.target.value)}
                    placeholder="Coupon"
                    className="h-11 flex-1 rounded-full border-0 bg-transparent px-3 shadow-none focus-visible:ring-0"
                  />
                  <Button type="button" variant="accent" size="md" className="rounded-full px-4" onClick={handleApplyCoupon}>
                    Apply
                  </Button>
                </div>
                <div className="mt-2 flex items-center gap-2 rounded-[1rem] px-1 text-sm font-medium">
                  {couponCode ? (
                    <>
                      <BadgeCheck className="h-4 w-4 text-success" aria-hidden="true" />
                      <span className="text-text">{couponCode} applied</span>
                    </>
                  ) : couponInput.trim().length > 0 ? (
                    <>
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-danger text-[10px] font-bold text-danger">!</span>
                      <span className="text-danger">Not valid</span>
                    </>
                  ) : (
                    <span className="text-muted">Enter a coupon to update totals.</span>
                  )}
                </div>
              </motion.section>

              <motion.section variants={ITEM_VARIANTS} className="rounded-[1.65rem] border border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
                <SectionTitle
                  eyebrow="Deliver To"
                  title="Choose where to deliver"
                  description="Select an existing address or add a new one. Saved addresses stay in Supabase."
                />

                <div className="mt-5 rounded-[1.25rem] border border-border/70 bg-background-secondary/25 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Deliver To</p>
                      <p className="mt-2 text-sm font-bold text-text">{selectedAddress ? selectedAddress.name : "No address selected"}</p>
                      <p className="mt-1 text-sm font-medium text-muted">{selectedAddressLine}</p>
                      <p className="mt-1 text-sm font-medium text-muted">Expected Delivery {deliveryEstimate}</p>
                      <p className="mt-1 text-sm font-medium text-muted">
                        {paymentMethod === "cod" ? "Cash on Delivery Available" : "Online payment selected"}
                      </p>
                    </div>
                    {selectedAddress ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="shrink-0 rounded-full px-2 text-muted"
                        onClick={() => openEditAddressForm(selectedAddress)}
                      >
                        <Edit3 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4">
                  <Button type="button" variant="outline" size="md" className="rounded-full" onClick={onToggleAddressForm}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add New Address
                  </Button>
                </div>

                <AnimatePresence>
                  {showAddressForm ? (
                    <motion.div key="address-form" variants={ITEM_VARIANTS} initial="hidden" animate="visible" exit="hidden" className="mt-5">
                      <AddressForm
                        value={draftAddress}
                        onChange={setDraftAddress}
                        onSave={() => void saveAddress()}
                        onCancel={() => {
                          setShowAddressForm(false);
                          setEditingAddressId(null);
                          setAddressErrors({});
                        }}
                        saving={addressBusy}
                        error={addressErrors.pin || addressErrors.phone || addressErrors.name || addressErrors.line1 || addressErrors.city || addressErrors.state || null}
                        profileName={profileName}
                        profilePhone={profilePhone}
                      />
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                {addresses.length > 0 ? (
                  <div className="mt-5 grid gap-4">
                    {addresses.map((address) => (
                      <AddressCard
                        key={address.id}
                        address={address}
                        selected={address.id === selectedAddressId}
                        onSelect={() => {
                          setSelectedAddressId(address.id);
                          setShowAddressForm(false);
                        }}
                        onEdit={() => openEditAddressForm(address)}
                        onDelete={() => void deleteAddress(address.id)}
                      />
                    ))}
                  </div>
                ) : null}
              </motion.section>

              <motion.section variants={ITEM_VARIANTS} className="rounded-[1.65rem] border border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
                <SectionTitle
                  eyebrow="Payment Method"
                  title="Choose payment"
                  description="Cash on Delivery or Razorpay. We remember your last choice."
                />

                <div className="mt-5 grid gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cod")}
                    className={cn(
                      "flex items-start gap-3 rounded-[1.25rem] border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                      paymentMethod === "cod"
                        ? "border-accent/30 bg-accent/5 shadow-[var(--shadow-sm)]"
                        : "border-border/70 bg-white hover:border-accent/20",
                    )}
                  >
                    <span className={cn("mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full border", paymentMethod === "cod" ? "border-accent bg-accent text-white" : "border-border text-transparent")}>
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <BadgeCheck className="h-4 w-4 text-accent" aria-hidden="true" />
                        <p className="text-sm font-bold text-text">Cash on Delivery</p>
                      </div>
                      <p className="mt-1 text-sm font-medium text-muted">Pay when order arrives.</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("razorpay")}
                    className={cn(
                      "flex items-start gap-3 rounded-[1.25rem] border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                      paymentMethod === "razorpay"
                        ? "border-accent/30 bg-accent/5 shadow-[var(--shadow-sm)]"
                        : "border-border/70 bg-white hover:border-accent/20",
                    )}
                  >
                    <span className={cn("mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full border", paymentMethod === "razorpay" ? "border-accent bg-accent text-white" : "border-border text-transparent")}>
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-accent" aria-hidden="true" />
                        <p className="text-sm font-bold text-text">Razorpay</p>
                      </div>
                      <p className="mt-1 text-sm font-medium text-muted">UPI, cards, wallet, and net banking.</p>
                    </div>
                  </button>
                </div>

                <div className="mt-4 rounded-[1.15rem] border border-border/70 bg-background-secondary/25 p-4">
                  <Label htmlFor="checkout-notes">Notes</Label>
                  <textarea
                    id="checkout-notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Delivery instructions, floor number, landmark, GST note..."
                    className="mt-2 min-h-24 w-full rounded-[1.15rem] border border-border/80 bg-white px-4 py-3 text-sm font-medium text-text outline-none transition-colors placeholder:text-muted focus:border-accent/25 focus:ring-2 focus:ring-accent/20"
                  />
                </div>

              </motion.section>

              <motion.section variants={ITEM_VARIANTS} className="rounded-[1.65rem] border border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
                <SectionTitle
                  eyebrow="Order Items"
                  title="Review what you are buying"
                  description="Adjust quantities, remove items, or open a product page without leaving checkout."
                />

                <div className="mt-5 grid grid-cols-2 gap-3">
                  {items.map((item, index) => {
                    const product = cartProducts[index];
                    if (!product) {
                      return null;
                    }

                    const meta = metaByProductId[item.productId];
                    const quantity = item.quantity;
                    const maxQuantity = item.stockCount ?? quantity + 10;

                    return (
                      <motion.div key={product.id} variants={ITEM_VARIANTS}>
                        <CheckoutItem
                          product={product}
                          quantity={quantity}
                          brand={meta?.brand ?? "Brand"}
                          variant={meta?.variant ?? "Standard"}
                          onIncrease={() => updateQuantity(item.productId, Math.min(maxQuantity, quantity + 1))}
                          onDecrease={() => updateQuantity(item.productId, Math.max(1, quantity - 1))}
                          onRemove={() => removeItem(item.productId)}
                        />
                      </motion.div>
                    );
                  })}
                </div>
              </motion.section>
            </div>

            <div className="space-y-5">
              <div className="lg:sticky lg:top-4">
                <Card className="rounded-[1.65rem] border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-accent" aria-hidden="true" />
                    <h3 className="text-base font-bold text-text">Order Summary</h3>
                  </div>

                  <div className="mt-4 space-y-4">
                    <div className="rounded-[1.15rem] border border-border/70 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Items</p>
                      <div className="mt-3 space-y-3">
                        {items.map((item, index) => {
                          const product = cartProducts[index];
                          if (!product) {
                            return null;
                          }
                          return (
                            <div key={item.productId} className="flex items-start justify-between gap-3 text-sm">
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-text">{product.name}</p>
                                <p className="mt-0.5 text-xs font-medium text-muted">Qty {item.quantity}</p>
                              </div>
                              <p className="shrink-0 font-bold text-text">{formatPrice(item.price * item.quantity)}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-[1.15rem] border border-border/70 bg-background-secondary/25 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Deliver To</p>
                      <p className="mt-2 text-sm font-bold text-text">{selectedAddress ? selectedAddress.name : "No address selected"}</p>
                      <p className="mt-1 text-sm font-medium text-muted">{selectedAddressLine}</p>
                      <p className="mt-1 text-sm font-medium text-muted">Expected Delivery {deliveryEstimate}</p>
                      <p className="mt-1 text-sm font-medium text-muted">
                        {paymentMethod === "cod" ? "Cash on Delivery Available" : "Online payment selected"}
                      </p>
                    </div>

                    <div className="rounded-[1.15rem] border border-border/70 bg-white p-4">
                      <SummaryRow label="Subtotal" value={formatPrice(pricing?.subtotal ?? 0)} />
                      <SummaryRow label="Discount" value={`- ${formatPrice(pricing?.discountTotal ?? 0)}`} />
                      <SummaryRow label="Coupon Discount" value={pricing?.couponDiscount && pricing.couponDiscount > 0 ? `- ${formatPrice(pricing.couponDiscount)}` : formatPrice(0)} />
                      <SummaryRow label="GST" value={formatPrice(pricing?.taxTotal ?? 0)} />
                      <SummaryRow label="Shipping" value={pricing?.shippingTotal === 0 ? "Free" : formatPrice(pricing?.shippingTotal ?? 0)} />
                      <div className="border-t border-border/70 pt-3">
                        <SummaryRow label="Grand Total" value={formatPrice(pricing?.totalAmount ?? 0)} emphasize />
                      </div>
                      <div className="mt-3 rounded-[1rem] border border-success/20 bg-success/10 px-3 py-2 text-sm font-medium text-success">
                        You Saved {formatPrice(summarySavings)}
                      </div>

                      <Button
                        type="button"
                        variant="primary"
                        size="lg"
                        className="mt-4 hidden h-12 w-full rounded-full px-4 text-sm shadow-[0_16px_30px_-16px_rgba(16,33,58,0.6)] lg:inline-flex"
                        onClick={handlePlaceOrder}
                        loading={placingOrder || razorpayLoading || addressBusy || pricingLoading}
                      >
                        Place Order
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>

      {!empty ? (
        <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-40 px-3 lg:hidden">
          <div className="mx-auto max-w-md rounded-[1.4rem] border border-border/70 bg-white/96 px-3 py-2.5 shadow-[0_-10px_30px_-18px_rgba(16,33,58,0.45)] backdrop-blur-xl">
            <div className="grid grid-cols-[minmax(0,0.34fr)_minmax(0,0.66fr)] items-center gap-2.5">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Total</p>
                <p className="truncate text-[15px] font-bold leading-none text-text">{formatPrice(pricing?.totalAmount ?? 0)}</p>
                {pricingLoading ? <p className="mt-1 text-[10px] font-medium text-muted">Calculating live totals...</p> : null}
              </div>
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="h-12 w-full rounded-full px-4 text-sm shadow-[0_16px_30px_-16px_rgba(16,33,58,0.6)]"
                onClick={handlePlaceOrder}
                loading={placingOrder || razorpayLoading || addressBusy}
              >
                Place Order
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </motion.section>
  );
}

export function CheckoutPage() {
  return <CheckoutShell />;
}
