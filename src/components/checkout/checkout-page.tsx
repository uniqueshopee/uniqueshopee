"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CreditCard,
  Edit3,
  MapPin,
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
import { SharedProductCard } from "@/components/product/shared-product-card";
import {
  calculateCartPricing,
  defaultShippingResolver,
  resolveCouponCode,
} from "@/lib/checkout-pricing";
import { buildLoginRedirectPath } from "@/lib/auth";
import { cn, formatPrice } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { useCartSync } from "@/components/cart/cart-sync-provider";
import { loadUserAddresses, type CheckoutAddress } from "@/lib/address-service";
import { createCheckoutOrder, type CheckoutPricingSummary } from "@/lib/order-service";
import { ensureCurrentUserProfile } from "@/lib/supabase/auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  formatRazorpayContact,
  getRazorpayKeyId,
  loadRazorpayCheckoutScript,
  type RazorpaySuccessResponse,
  type RazorpayWindow,
} from "@/lib/razorpay";
import { toast } from "@/hooks/use-toast";
import { useCartStore } from "@/store/cart-store";
import { UI_MESSAGES, getFriendlyErrorMessage } from "@/lib/messages";
import { buildCartItemKey } from "@/lib/variant-pricing";

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
  brand: string;
  variant: string;
};

type ProductRow = {
  id: string;
  slug: string;
  brand_id: string;
};

type BrandRow = {
  id: string;
  name: string;
};

type VariantRow = {
  id: string;
  product_id: string;
  variant_name: string | null;
  option_label: string | null;
  option_value: string | null;
  shade_id: string | null;
  pack_size: string | null;
  unit: string | null;
  finish: string | null;
  shade_code_snapshot: string | null;
  shade_name_snapshot: string | null;
  is_default: boolean;
};

const SECTION_VARIANTS = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.24,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.04,
      delayChildren: 0.03,
    },
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

function formatAddressType(type: CheckoutAddress["type"]) {
  if (type === "Office") return "Office";
  if (type === "Other") return "Other";
  return "Home";
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

function buildCheckoutPricingSummary(
  items: Array<{ price: number; quantity: number; compareAtPrice?: number | null }>,
  couponCode: string | null,
): CheckoutPricingSummary {
  const pricing = calculateCartPricing(
    items,
    couponCode,
    defaultShippingResolver,
    (item) => item.compareAtPrice ?? item.price,
  );

  return {
    couponId: couponCode,
    couponCode,
    subtotal: pricing.subtotal,
    discountTotal: pricing.discount,
    couponDiscount: pricing.couponDiscount,
    taxableAmount: pricing.taxableAmount,
    taxTotal: pricing.gst,
    shippingTotal: pricing.shipping,
    totalAmount: pricing.grandTotal,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

function devCheckoutLog(message: string, payload?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.debug("[checkout]", message, payload ?? "");
  }
}

function getErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
    };
  }

  return {
    name: typeof error,
    message: String(error),
    stack: null,
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
      <span className={cn("font-medium", emphasize ? "text-text" : "text-muted")}>
        {label}
      </span>
      <span className={cn("font-bold", emphasize ? "text-text text-lg" : "text-text")}>
        {value}
      </span>
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
      <p className="text-accent text-[10px] font-bold tracking-[0.22em] uppercase sm:text-[11px]">
        {eyebrow}
      </p>
      <h2 className="text-text mt-1.5 text-lg font-bold sm:mt-2 sm:text-xl">{title}</h2>
      {description ? (
        <p className="text-muted mt-1.5 text-xs leading-6 font-medium sm:mt-2 sm:text-sm sm:leading-7">
          {description}
        </p>
      ) : null}
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
        "group w-full rounded-[1.35rem] border p-3 text-left transition-all duration-200 sm:p-4",
        selected
          ? "border-accent/30 bg-accent/5 shadow-[var(--shadow-lg)]"
          : "border-border/70 hover:border-accent/20 bg-white hover:shadow-[var(--shadow-sm)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-text text-sm font-bold">
              {formatAddressType(address.type)}
            </p>
            {address.isDefault ? <Badge variant="success">Default</Badge> : null}
          </div>
          <p className="text-text mt-2 text-sm font-semibold">{address.name}</p>
          <p className="text-muted mt-1 text-xs font-medium">{address.phone}</p>
        </div>
        {selected ? (
          <span className="bg-accent text-accent-foreground inline-flex h-8 w-8 items-center justify-center rounded-full">
            <Check className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <div className="text-text mt-3 space-y-1 text-sm font-medium">
        <p>{address.line1}</p>
        {address.line2 ? <p>{address.line2}</p> : null}
        <p>
          {address.city}, {address.state} - {address.pin}
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full"
          onClick={onSelect}
        >
          Select
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full"
          onClick={onEdit}
        >
          <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
          Edit
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full"
          onClick={onDelete}
        >
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
  shadeName,
  shadeCode,
  shadeFamily,
  shadeHexColor,
  onIncrease,
  onDecrease,
  onRemove,
}: {
  product: Product;
  quantity: number;
  brand: string;
  variant: string;
  shadeName?: string;
  shadeCode?: string;
  shadeFamily?: string;
  shadeHexColor?: string;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
}) {
  return (
    <SharedProductCard
      mode="checkout"
      image={product.image}
      href={`/product/${product.slug}`}
      brand={brand}
      title={product.name}
      subtitle={variant}
      quantity={quantity}
      price={product.price}
      compareAtPrice={product.compareAtPrice}
      shadeName={shadeName}
      shadeCode={shadeCode}
      shadeFamily={shadeFamily}
      shadeHexColor={shadeHexColor}
      onIncrease={onIncrease}
      onDecrease={onDecrease}
      onRemove={onRemove}
    />
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
        <MapPin className="text-accent h-4 w-4" aria-hidden="true" />
        <h3 className="text-text text-base font-bold">Delivery address</h3>
      </div>
      <p className="text-muted mt-1 text-sm font-medium">
        Name and phone are prefilled from your profile.
      </p>

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

      {error ? <p className="text-danger mt-3 text-sm font-medium">{error}</p> : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={onSave}
          loading={saving}
        >
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
  const isDev = process.env.NODE_ENV !== "production";
  const shouldReduceMotion = useReducedMotion();
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading: authLoading } = useAuth();
  const { loaded: cartLoaded } = useCartSync();
  const items = useCartStore((state) => state.items);
  const couponCode = useCartStore((state) => state.couponCode);
  const setCouponCode = useCartStore((state) => state.setCouponCode);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clear);

  const [addresses, setAddresses] = useState<CheckoutAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [draftAddress, setDraftAddress] = useState<DraftAddressState>(
    buildAddressDraft("", ""),
  );
  const [addressErrors, setAddressErrors] = useState<
    Partial<Record<keyof DraftAddressState, string>>
  >({});
  const [addressBusy, setAddressBusy] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [couponInput, setCouponInput] = useState(couponCode ?? "");
  const [notes, setNotes] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [razorpayLoading, setRazorpayLoading] = useState(false);
  const [metaByProductId, setMetaByProductId] = useState<Record<string, ProductMeta>>({});
  const [resolvedAccountId, setResolvedAccountId] = useState<string | null>(null);
  const navigationTargetRef = useRef<string | null>(null);

  const accountId = resolvedAccountId;
  const profileName = profile?.full_name ?? "";
  const profilePhone = profile?.phone ?? "";
  const hasSavedAddresses = addresses.length > 0;

  useEffect(() => {
    devCheckoutLog("loading state changed", {
      authLoading,
      cartLoaded,
      placingOrder,
      razorpayLoading,
      addressBusy,
    });
  }, [addressBusy, authLoading, cartLoaded, placingOrder, razorpayLoading]);

  useEffect(() => {
    const expected = navigationTargetRef.current;
    if (!expected || pathname !== expected) {
      return;
    }

    if (isDev) {
      console.log("NAV_COMPLETE", { pathname, expected });
    }
    navigationTargetRef.current = null;
  }, [isDev, pathname]);

  useEffect(() => {
    if (!isDev || typeof window === "undefined") {
      return;
    }

    const handleWindowError = (event: ErrorEvent) => {
      console.error("WINDOW_ERROR", {
        message: event.message,
        source: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: getErrorDetails(event.error),
        route: pathname,
        userAgent: window.navigator.userAgent,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("UNHANDLED_REJECTION", {
        reason: getErrorDetails(event.reason),
        route: pathname,
        userAgent: window.navigator.userAgent,
      });
    };

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, [isDev, pathname]);

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
    const restoredPayment = storage.getItem(
      STORAGE_KEYS.paymentMethod,
    ) as PaymentMethod | null;
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

    const hydrateAddresses = async () => {
      if (authLoading || !cartLoaded || (user && !accountId)) {
        return;
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

      const savedId =
        typeof window !== "undefined"
          ? (window.localStorage.getItem(STORAGE_KEYS.addressId) ?? "")
          : "";
      const selected =
        remoteAddresses.find((address) => address.id === savedId) ??
        remoteAddresses.find((address) => address.isDefault) ??
        remoteAddresses[0] ??
        null;
      setSelectedAddressId(selected?.id ?? "");
      setShowAddressForm(remoteAddresses.length === 0);
      if (!selected?.id) {
        setDraftAddress(buildAddressDraft(profileName, profilePhone));
      }
    };

    void hydrateAddresses();

    return () => {
      cancelled = true;
    };
  }, [accountId, authLoading, cartLoaded, profileName, profilePhone, user]);

  useEffect(() => {
    if (!showAddressForm && !hasSavedAddresses) {
      setShowAddressForm(true);
    }
  }, [hasSavedAddresses, showAddressForm]);

  useEffect(() => {
    let cancelled = false;

    const missingMetaIds = Array.from(
      new Set(
        items
          .filter((item) => !item.brand || !item.variant)
          .map((item) => item.productId),
      ),
    );

    if (missingMetaIds.length === 0) {
      setMetaByProductId({});
      return;
    }

    const loadMissingMeta = async () => {
      const client = getSupabaseBrowserClient();
      if (!client) {
        return;
      }

      const [productResult, variantResult] = await Promise.all([
        client.from("products").select("id, slug, brand_id").in("id", missingMetaIds),
        client
          .from("product_variants")
          .select(
            "id, product_id, variant_name, option_label, option_value, shade_id, pack_size, unit, finish, shade_code_snapshot, shade_name_snapshot, is_default",
          )
          .in("product_id", missingMetaIds),
      ]);

      if (cancelled || productResult.error || variantResult.error) {
        return;
      }

      const brandIds = Array.from(
        new Set(
          ((productResult.data ?? []) as ProductRow[]).map((product) => product.brand_id),
        ),
      );
      const { data: brandData, error: brandError } =
        brandIds.length > 0
          ? await client.from("brands").select("id, name").in("id", brandIds)
          : { data: [] as BrandRow[], error: null as null };

      if (cancelled || brandError) {
        return;
      }

      const brands = new Map(
        ((brandData ?? []) as BrandRow[]).map((row) => [row.id, row.name]),
      );
      const variants = (variantResult.data ?? []) as VariantRow[];
      const variantsByProductId = new Map<string, VariantRow[]>();

      for (const variant of variants) {
        const current = variantsByProductId.get(variant.product_id) ?? [];
        current.push(variant);
        variantsByProductId.set(variant.product_id, current);
      }

      const next: Record<string, ProductMeta> = {};
      for (const product of (productResult.data ?? []) as ProductRow[]) {
        const chosenVariant =
          variantsByProductId.get(product.id)?.find((variant) => variant.is_default) ??
          variantsByProductId.get(product.id)?.[0] ??
          null;
        const shade =
          chosenVariant?.shade_name_snapshot || chosenVariant?.shade_code_snapshot
            ? [
                chosenVariant?.shade_name_snapshot,
                chosenVariant?.shade_code_snapshot
                  ? `#${chosenVariant.shade_code_snapshot}`
                  : "",
              ]
                .filter(Boolean)
                .join(" ")
            : "";
        const extra =
          chosenVariant?.option_label && chosenVariant.option_value
            ? `${chosenVariant.option_label}: ${chosenVariant.option_value}`
            : "";
        next[product.id] = {
          brand: brands.get(product.brand_id) ?? "Brand",
          variant:
            [
              shade,
              chosenVariant?.pack_size,
              chosenVariant?.finish,
              chosenVariant?.variant_name,
              extra,
            ]
              .filter(Boolean)
              .join(" • ") || "Standard",
        };
      }

      setMetaByProductId(next);
    };

    void loadMissingMeta();

    return () => {
      cancelled = true;
    };
  }, [items]);

  const selectedAddress = useMemo(
    () =>
      addresses.find((address) => address.id === selectedAddressId) ??
      addresses[0] ??
      null,
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
  const hasOutOfStockItems = useMemo(
    () => items.some((item) => (item.stockCount ?? 0) <= 0),
    [items],
  );

  const pricing = useMemo(
    () => buildCheckoutPricingSummary(items, couponCode),
    [couponCode, items],
  );

  const empty = items.length === 0;
  const summarySavings = Math.max(0, pricing.discountTotal + pricing.couponDiscount);

  const validateDraftAddress = () => {
    const errors: Partial<Record<keyof DraftAddressState, string>> = {};

    if (!draftAddress.name.trim()) errors.name = "Required";
    if (!draftAddress.phone.trim()) errors.phone = "Required";
    if (!draftAddress.line1.trim()) errors.line1 = "Required";
    if (!draftAddress.city.trim()) errors.city = "Required";
    if (!draftAddress.state.trim()) errors.state = "Required";
    if (!/^\d{6}$/.test(draftAddress.pin.trim()))
      errors.pin = "Enter a valid 6-digit PIN";

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

    const resolved =
      remoteAddresses.find((address) => address.id === selectedId) ??
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
        description: UI_MESSAGES.checkout.addressDetailsRequired,
        variant: "warning",
      });
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client || !accountId) {
      toast({
        title: "Supabase not ready",
        description: UI_MESSAGES.auth.sessionExpired,
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
      is_default:
        addresses.length === 0 || addresses.every((address) => !address.isDefault),
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
        description: getFriendlyErrorMessage(errorMessage, UI_MESSAGES.generic.server),
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
      const ids = ((currentAddresses ?? []) as { id: string }[])
        .map((row) => row.id)
        .filter((id) => id !== savedId);
      if (savedId && ids.length > 0) {
        await Promise.all(
          ids.map((id) =>
            client
              .from("addresses")
              .update({ is_default: false })
              .eq("id", id)
              .eq("user_id", accountId)
              .is("deleted_at", null),
          ),
        );
        await client
          .from("addresses")
          .update({ is_default: true })
          .eq("id", savedId)
          .eq("user_id", accountId)
          .is("deleted_at", null);
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
        description: getFriendlyErrorMessage(error, UI_MESSAGES.generic.server),
        variant: "warning",
      });
      return;
    }

    const remaining = addresses.filter((address) => address.id !== addressId);
    const nextSelected =
      remaining.find((address) => address.isDefault) ?? remaining[0] ?? null;

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
      toast({
        title: "Coupon applied",
        description: UI_MESSAGES.checkout.couponApplied,
        variant: "success",
      });
      return;
    }
    setCouponCode(null);
    toast({
      title: "Coupon cleared",
      description: UI_MESSAGES.checkout.couponCleared,
      variant: "warning",
    });
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
    if (placingOrder) {
      return;
    }

    if (hasOutOfStockItems) {
      toast({
        title: "Unable to place order",
        description: "Some items in your cart are out of stock.",
        variant: "warning",
      });
      return;
    }

    if (!user || !accountId) {
      router.push(buildLoginRedirectPath(pathname));
      return;
    }

    if (!selectedAddress) {
      toast({
        title: "Select Delivery Address",
        description: UI_MESSAGES.checkout.addressRequired,
        variant: "warning",
      });
      return;
    }

    const snapshot = buildAddressSnapshot(selectedAddress);
    const rawCheckoutMetrics = {
      userId: user?.id ?? null,
      route: pathname,
      addressId: selectedAddress.id,
      cartItemCount: items.length,
      subtotal: pricing.subtotal,
      discount: pricing.discountTotal,
      shipping: pricing.shippingTotal,
      grandTotal: pricing.totalAmount,
    };

    if (paymentMethod === "cod") {
      const client = getSupabaseBrowserClient();
      if (!client) {
        toast({
          title: "Supabase not ready",
          description: UI_MESSAGES.checkout.checkoutUnavailable,
          variant: "warning",
        });
        return;
      }

      setPlacingOrder(true);
      devCheckoutLog("order submission start", {
        method: "cod",
        itemCount: items.length,
      });
      if (isDev) {
        console.log("ORDER_START", {
          method: "cod",
          phase: "create_checkout_order",
          ...rawCheckoutMetrics,
        });
        console.log("ORDER_REQUEST", {
          component: "CheckoutShell",
          method: "cod",
          endpoint: "create_checkout_order",
          request: {
            shippingAddressId: selectedAddress.id,
            billingAddressId: selectedAddress.id,
            paymentMethod: "Cash on Delivery",
            paymentReference: "COD",
            paymentStatus: "pending",
            couponCode,
          },
          ...rawCheckoutMetrics,
        });
      }

      try {
        const orderResult = await createCheckoutOrder(client, {
          shippingAddressId: selectedAddress.id,
          billingAddressId: selectedAddress.id,
          paymentMethod: "Cash on Delivery",
          paymentReference: "COD",
          paymentStatus: "pending",
          couponCode,
          notes: notes.trim() || null,
          shippingAddressSnapshot: snapshot,
          billingAddressSnapshot: snapshot,
        });

        if (orderResult.error || !orderResult.orderId) {
          if (isDev) {
            console.error("ORDER_RESPONSE", {
              component: "CheckoutShell",
              method: "cod",
              endpoint: "create_checkout_order",
              response: orderResult,
              ...rawCheckoutMetrics,
            });
          }
          if (isDev) {
            console.error(
              "ORDER_FAILURE",
              orderResult.error ?? new Error("missing order id"),
              {
                method: "cod",
                phase: "create_checkout_order",
                ...rawCheckoutMetrics,
              },
            );
          }
          devCheckoutLog("order submission failure", {
            method: "cod",
            error: orderResult.error ?? "missing order id",
          });
          toast({
            title: "Order not placed",
            description:
              isDev && orderResult.error
                ? String(orderResult.error)
                : orderResult.error
                  ? getFriendlyErrorMessage(orderResult.error, UI_MESSAGES.generic.server)
                  : UI_MESSAGES.generic.server,
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

        const nextHref = `/orders/${orderResult.orderId}`;
        navigationTargetRef.current = nextHref;
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem("checkout.navigationTarget", nextHref);
        }

        if (isDev) {
          console.log("ORDER_RESPONSE", {
            component: "CheckoutShell",
            method: "cod",
            endpoint: "create_checkout_order",
            response: orderResult,
            ...rawCheckoutMetrics,
          });
          console.log("ORDER_SUCCESS", {
            method: "cod",
            orderId: orderResult.orderId,
            orderNumber: orderResult.orderNumber,
            ...rawCheckoutMetrics,
          });
          console.log("NAV_START", {
            to: nextHref,
            method: "cod",
            ...rawCheckoutMetrics,
          });
        }
        devCheckoutLog("order submission success", {
          method: "cod",
          orderId: orderResult.orderId,
          orderNumber: orderResult.orderNumber,
        });
        toast({
          title: "COD order placed",
          description: UI_MESSAGES.checkout.orderCreated,
          variant: "success",
        });
        router.replace(nextHref);
      } catch (error) {
        if (isDev) {
          console.error("ORDER_FAILURE", error, {
            method: "cod",
            phase: "create_checkout_order",
            ...rawCheckoutMetrics,
          });
        }
        devCheckoutLog("order submission failure", {
          method: "cod",
          error: error instanceof Error ? error.message : String(error),
        });
        toast({
          title: "Order not placed",
          description: isDev
            ? String(error instanceof Error ? error.message : error)
            : getFriendlyErrorMessage(error, UI_MESSAGES.generic.server),
          variant: "warning",
        });
      } finally {
        setPlacingOrder(false);
      }
      return;
    }

    const razorpayKeyId = getRazorpayKeyId();
    if (!razorpayKeyId) {
      toast({
        title: "Razorpay not ready",
        description: UI_MESSAGES.checkout.checkoutUnavailable,
        variant: "warning",
      });
      return;
    }

    setPlacingOrder(true);
    setRazorpayLoading(true);
    devCheckoutLog("order submission start", {
      method: "razorpay",
      itemCount: items.length,
    });
    if (isDev) {
      console.log("ORDER_START", {
        method: "razorpay",
        phase: "create_razorpay_order",
        ...rawCheckoutMetrics,
      });
    }

    try {
      if (isDev) {
        console.log("ORDER_START", {
          method: "razorpay",
          phase: "create_razorpay_order",
          ...rawCheckoutMetrics,
        });
        console.log("ORDER_REQUEST", {
          component: "CheckoutShell",
          method: "razorpay",
          endpoint: "/api/razorpay/orders",
          request: { couponCode },
          ...rawCheckoutMetrics,
        });
      }
      const createResponse = await fetch("/api/razorpay/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          couponCode,
        }),
      });

      const createResponseText = await createResponse.text();
      const createData = (
        createResponseText
          ? (() => {
              try {
                return JSON.parse(createResponseText) as {
                  error?: string;
                  razorpayOrderId?: string;
                  amount?: number;
                  currency?: string;
                  keyId?: string;
                  customer?: { name?: string; email?: string; contact?: string };
                };
              } catch {
                return null;
              }
            })()
          : null
      ) as {
        error?: string;
        razorpayOrderId?: string;
        amount?: number;
        currency?: string;
        keyId?: string;
        customer?: { name?: string; email?: string; contact?: string };
      } | null;

      if (isDev) {
        console.log("ORDER_RESPONSE", {
          component: "CheckoutShell",
          method: "razorpay",
          endpoint: "/api/razorpay/orders",
          status: createResponse.status,
          ok: createResponse.ok,
          responseText: createResponseText,
          response: createData,
          ...rawCheckoutMetrics,
        });
      }

      if (
        !createResponse.ok ||
        !createData?.razorpayOrderId ||
        !createData.amount ||
        !createData.currency
      ) {
        const requestError = new Error(createData?.error ?? UI_MESSAGES.generic.server);
        if (isDev) {
          console.error("ORDER_FAILURE", requestError, {
            method: "razorpay",
            phase: "create_razorpay_order",
            status: createResponse.status,
            response: createData,
            request: { couponCode },
            ...rawCheckoutMetrics,
          });
        }
        throw requestError;
      }

      await loadRazorpayCheckoutScript();

      const resolvedKey = createData.keyId ?? razorpayKeyId;
      if (!resolvedKey) {
        throw new Error(UI_MESSAGES.checkout.checkoutUnavailable);
      }

      const paymentReference = createData.razorpayOrderId;
      const contact = formatRazorpayContact(
        createData.customer?.contact || selectedAddress.phone,
      );
      const RazorpayConstructor = (window as RazorpayWindow).Razorpay;

      if (!RazorpayConstructor) {
        throw new Error(UI_MESSAGES.checkout.checkoutUnavailable);
      }

      const paymentResult = await new Promise<RazorpaySuccessResponse>(
        (resolve, reject) => {
          const razorpay = new RazorpayConstructor({
            key: resolvedKey,
            amount: createData.amount ?? Math.round(pricing.totalAmount * 100),
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
        },
      );

      if (isDev) {
        console.log("ORDER_START", {
          method: "razorpay",
          phase: "verify_razorpay_payment",
          ...rawCheckoutMetrics,
        });
      }
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

      const verifyResponseText = await verifyResponse.text();
      const verifyData = (
        verifyResponseText
          ? (() => {
              try {
                return JSON.parse(verifyResponseText) as {
                  error?: string;
                  orderId?: string;
                  orderNumber?: string;
                };
              } catch {
                return null;
              }
            })()
          : null
      ) as {
        error?: string;
        orderId?: string;
        orderNumber?: string;
      } | null;

      if (isDev) {
        console.log("ORDER_RESPONSE", {
          component: "CheckoutShell",
          method: "razorpay",
          endpoint: "/api/razorpay/verify",
          status: verifyResponse.status,
          ok: verifyResponse.ok,
          responseText: verifyResponseText,
          response: verifyData,
          request: {
            razorpayPaymentId: paymentResult.razorpay_payment_id,
            razorpayOrderId: paymentResult.razorpay_order_id,
          },
          ...rawCheckoutMetrics,
        });
      }

      if (!verifyResponse.ok || !verifyData?.orderId) {
        const verifyError = new Error(verifyData?.error ?? UI_MESSAGES.generic.server);
        if (isDev) {
          console.error("ORDER_FAILURE", verifyError, {
            method: "razorpay",
            phase: "verify_razorpay_payment",
            status: verifyResponse.status,
            response: verifyData,
            request: {
              razorpayPaymentId: paymentResult.razorpay_payment_id,
              razorpayOrderId: paymentResult.razorpay_order_id,
            },
            ...rawCheckoutMetrics,
          });
        }
        throw verifyError;
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
        description: UI_MESSAGES.checkout.paymentSuccess,
        variant: "success",
      });
      const nextHref = `/orders/${verifyData.orderId}`;
      navigationTargetRef.current = nextHref;
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("checkout.navigationTarget", nextHref);
      }
      if (isDev) {
        console.log("ORDER_SUCCESS", {
          method: "razorpay",
          orderId: verifyData.orderId,
          orderNumber: verifyData.orderNumber,
          ...rawCheckoutMetrics,
        });
        console.log("NAV_START", {
          to: nextHref,
          method: "razorpay",
          ...rawCheckoutMetrics,
        });
      }
      devCheckoutLog("order submission success", {
        method: "razorpay",
        orderId: verifyData.orderId,
        orderNumber: verifyData.orderNumber,
      });
      router.replace(nextHref);
    } catch (error) {
      if (isDev) {
        console.error("ORDER_FAILURE", error, {
          method: "razorpay",
          phase: "verify_razorpay_payment",
          ...rawCheckoutMetrics,
        });
      }
      devCheckoutLog("order submission failure", {
        method: "razorpay",
        error: error instanceof Error ? error.message : String(error),
      });
      const message = isDev
        ? String(error instanceof Error ? error.message : error)
        : getFriendlyErrorMessage(error, UI_MESSAGES.checkout.paymentFailed);
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
      <section className="border-border surface-texture relative isolate overflow-hidden border-b">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:py-14">
          <div className="animate-pulse space-y-4 rounded-[1.75rem] border border-white/80 bg-white/92 p-5 shadow-[var(--shadow-lg)]">
            <div className="bg-background-secondary h-4 w-28 rounded-full" />
            <div className="bg-background-secondary h-10 w-56 rounded-2xl" />
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="space-y-4">
                <div className="bg-background-secondary h-32 rounded-[1.5rem]" />
                <div className="bg-background-secondary h-40 rounded-[1.5rem]" />
              </div>
              <div className="bg-background-secondary h-96 rounded-[1.5rem]" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <motion.section
      className="border-border surface-texture relative isolate overflow-hidden border-b"
      initial={shouldReduceMotion ? false : "hidden"}
      animate={shouldReduceMotion ? undefined : "visible"}
      variants={SECTION_VARIANTS}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-12 -left-24 h-80 w-80 rounded-full bg-orange-300/6 blur-3xl" />
        <div className="absolute top-20 right-0 h-72 w-72 rounded-full bg-sky-300/6 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-2.5 pb-64 sm:px-6 sm:py-3 sm:pb-72 lg:py-6">
        <motion.header
          className="mb-3 flex items-center justify-between gap-3 rounded-[1.35rem] border border-white/80 bg-white/92 px-3 py-2.5 shadow-[var(--shadow-lg)] sm:mb-4 sm:px-4 sm:py-3"
          variants={ITEM_VARIANTS}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="text-text h-9 rounded-full px-2"
              >
                <Link href="/cart">
                  <ArrowRight className="h-4 w-4 rotate-180" aria-hidden="true" />
                </Link>
              </Button>
              <h1 className="text-text text-lg font-bold sm:text-xl">Checkout</h1>
            </div>
          </div>
        </motion.header>

        {empty ? (
          <motion.div
            variants={ITEM_VARIANTS}
            className="rounded-[1.65rem] border border-white/80 bg-white/92 p-4 shadow-[var(--shadow-lg)] sm:p-5"
          >
            <h2 className="text-text text-2xl font-bold">Your checkout is empty</h2>
            <p className="text-muted mt-2 text-sm leading-7 font-medium">
              Add products to your cart to continue.
            </p>
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
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
            <div className="space-y-3.5">
              <motion.section
                variants={ITEM_VARIANTS}
                className="rounded-[1.65rem] border border-white/80 bg-white/92 p-3 shadow-[var(--shadow-lg)] sm:p-4"
              >
                <SectionTitle eyebrow="Order Items" title="Review what you are buying" />

                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:mt-4 sm:grid-cols-2 sm:gap-3">
                  {items.map((item, index) => {
                    const product = cartProducts[index];
                    if (!product) {
                      return null;
                    }

                    const quantity = item.quantity;
                    const maxQuantity = item.stockCount ?? quantity + 10;

                    return (
                      <motion.div key={buildCartItemKey(item)} variants={ITEM_VARIANTS}>
                        <CheckoutItem
                          product={product}
                          quantity={quantity}
                          brand={
                            item.brand ??
                            metaByProductId[item.productId]?.brand ??
                            "Brand"
                          }
                          variant={
                            item.variant ??
                            metaByProductId[item.productId]?.variant ??
                            "Standard"
                          }
                          shadeName={item.shadeName}
                          shadeCode={item.shadeCode}
                          shadeFamily={item.shadeFamily}
                          shadeHexColor={item.shadeHexColor}
                          onIncrease={() =>
                            updateQuantity(
                              item.productId,
                              Math.min(maxQuantity, quantity + 1),
                              item.variantId,
                              item.shadeId,
                              item.packSize,
                              item.finish,
                            )
                          }
                          onDecrease={() =>
                            updateQuantity(
                              item.productId,
                              Math.max(1, quantity - 1),
                              item.variantId,
                              item.shadeId,
                              item.packSize,
                              item.finish,
                            )
                          }
                          onRemove={() =>
                            removeItem(
                              item.productId,
                              item.variantId,
                              item.shadeId,
                              item.packSize,
                              item.finish,
                            )
                          }
                        />
                      </motion.div>
                    );
                  })}
                </div>
              </motion.section>

              <motion.section
                variants={ITEM_VARIANTS}
                className="rounded-[1.65rem] border border-white/80 bg-white/92 p-3 shadow-[var(--shadow-lg)] sm:p-4"
              >
                <SectionTitle
                  eyebrow="Payment Method"
                  title="Choose payment"
                  description="Cash on Delivery or Razorpay. We remember your last choice."
                />

                <div className="mt-3 grid gap-2.5 sm:mt-4 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cod")}
                    className={cn(
                      "focus-visible:ring-accent flex items-start gap-3 rounded-[1.25rem] border p-4 text-left transition-all duration-200 focus-visible:ring-2 focus-visible:outline-none",
                      paymentMethod === "cod"
                        ? "border-accent/30 bg-accent/5 shadow-[var(--shadow-sm)]"
                        : "border-border/70 hover:border-accent/20 bg-white",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full border",
                        paymentMethod === "cod"
                          ? "border-accent bg-accent text-white"
                          : "border-border text-transparent",
                      )}
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <BadgeCheck className="text-accent h-4 w-4" aria-hidden="true" />
                        <p className="text-text text-sm font-bold">Cash on Delivery</p>
                      </div>
                      <p className="text-muted mt-1 text-sm font-medium">
                        Pay when order arrives.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("razorpay")}
                    className={cn(
                      "focus-visible:ring-accent flex items-start gap-3 rounded-[1.25rem] border p-4 text-left transition-all duration-200 focus-visible:ring-2 focus-visible:outline-none",
                      paymentMethod === "razorpay"
                        ? "border-accent/30 bg-accent/5 shadow-[var(--shadow-sm)]"
                        : "border-border/70 hover:border-accent/20 bg-white",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full border",
                        paymentMethod === "razorpay"
                          ? "border-accent bg-accent text-white"
                          : "border-border text-transparent",
                      )}
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <CreditCard className="text-accent h-4 w-4" aria-hidden="true" />
                        <p className="text-text text-sm font-bold">Razorpay</p>
                      </div>
                      <p className="text-muted mt-1 text-sm font-medium">
                        UPI, cards, wallet, and net banking.
                      </p>
                    </div>
                  </button>
                </div>

                <div className="border-border/70 bg-background-secondary/25 mt-3 rounded-[1.15rem] border p-3 sm:mt-4 sm:p-4">
                  <p className="text-muted text-[10px] font-semibold tracking-[0.18em] uppercase">
                    Notes
                  </p>
                  <textarea
                    id="checkout-notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Delivery instructions, floor number, landmark, GST note..."
                    className="border-border/80 text-text placeholder:text-muted focus:border-accent/25 focus:ring-accent/20 mt-2 min-h-20 w-full rounded-[1.15rem] border bg-white px-3 py-2.5 text-sm font-medium transition-colors outline-none focus:ring-2"
                  />
                </div>
              </motion.section>

              <motion.section
                variants={ITEM_VARIANTS}
                className="rounded-[1.65rem] border border-white/80 bg-white/92 p-3 shadow-[var(--shadow-lg)] sm:p-4"
              >
                <SectionTitle eyebrow="Order Summary" title="Order Summary" />

                <div className="border-border/70 mt-3 space-y-2.5 rounded-[1.25rem] border bg-white p-3 sm:mt-4 sm:space-y-3 sm:p-4">
                  <SummaryRow label="Subtotal" value={formatPrice(pricing.subtotal)} />
                  <SummaryRow
                    label="Discount"
                    value={`- ${formatPrice(pricing.discountTotal)}`}
                  />
                  <SummaryRow
                    label="Coupon Discount"
                    value={
                      pricing.couponDiscount > 0
                        ? `- ${formatPrice(pricing.couponDiscount)}`
                        : formatPrice(0)
                    }
                  />
                  <SummaryRow label="GST" value={formatPrice(pricing.taxTotal)} />
                  <SummaryRow
                    label="Shipping"
                    value={
                      pricing.shippingTotal === 0
                        ? "Free"
                        : formatPrice(pricing.shippingTotal)
                    }
                  />
                  <div className="border-border/70 border-t pt-3">
                    <SummaryRow
                      label="Grand Total"
                      value={formatPrice(pricing.totalAmount)}
                      emphasize
                    />
                  </div>
                  <div className="border-success/20 bg-success/10 text-success rounded-[1rem] border px-3 py-2 text-xs font-medium sm:text-sm">
                    You Saved {formatPrice(summarySavings)}
                  </div>
                </div>
              </motion.section>

              <motion.section
                variants={ITEM_VARIANTS}
                className="rounded-[1.65rem] border border-white/80 bg-white/92 p-3 shadow-[var(--shadow-lg)] sm:p-4"
              >
                <SectionTitle eyebrow="Promo code" title="Apply coupon" />
                <div className="border-border/70 mt-3 flex items-center gap-2 rounded-[1.2rem] border bg-white p-2 sm:mt-4">
                  <Input
                    id="checkout-coupon"
                    value={couponInput}
                    onChange={(event) => setCouponInput(event.target.value)}
                    placeholder="Coupon"
                    className="h-10 flex-1 rounded-full border-0 bg-transparent px-3 text-sm shadow-none focus-visible:ring-0"
                  />
                  <Button
                    type="button"
                    variant="accent"
                    size="sm"
                    className="rounded-full px-4"
                    onClick={handleApplyCoupon}
                  >
                    Apply
                  </Button>
                </div>
                <div className="mt-2 flex items-center gap-2 rounded-[1rem] px-1 text-xs font-medium sm:text-sm">
                  {couponCode ? (
                    <>
                      <BadgeCheck
                        className="text-success h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                      <span className="text-text">{couponCode} applied</span>
                    </>
                  ) : couponInput.trim().length > 0 ? (
                    <>
                      <span className="border-danger text-danger inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[9px] font-bold">
                        !
                      </span>
                      <span className="text-danger">Not valid</span>
                    </>
                  ) : (
                    <span className="text-muted">Enter a coupon to update totals.</span>
                  )}
                </div>
              </motion.section>

              <motion.section
                variants={ITEM_VARIANTS}
                className="rounded-[1.65rem] border border-white/80 bg-white/92 p-3 shadow-[var(--shadow-lg)] sm:p-4"
              >
                <SectionTitle
                  eyebrow="Deliver To"
                  title="Choose where to deliver"
                  description="Select an existing address or add a new one. Saved addresses stay in Supabase."
                />

                <div className="mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    className="rounded-full"
                    onClick={onToggleAddressForm}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add New Address
                  </Button>
                </div>

                <AnimatePresence>
                  {showAddressForm ? (
                    <motion.div
                      key="address-form"
                      variants={ITEM_VARIANTS}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      className="mt-3"
                    >
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
                        error={
                          addressErrors.pin ||
                          addressErrors.phone ||
                          addressErrors.name ||
                          addressErrors.line1 ||
                          addressErrors.city ||
                          addressErrors.state ||
                          null
                        }
                        profileName={profileName}
                        profilePhone={profilePhone}
                      />
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                {addresses.length > 0 ? (
                  <div className="mt-3 grid gap-3">
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
            </div>

            <div className="space-y-3.5">
              <div className="lg:sticky lg:top-4">
                <Card className="rounded-[1.65rem] border-white/80 bg-white/92 p-3 shadow-[var(--shadow-lg)] sm:p-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="text-accent h-4 w-4" aria-hidden="true" />
                    <h3 className="text-text text-base font-bold">Checkout</h3>
                  </div>
                  <p className="text-muted mt-2 text-xs leading-6 font-medium">
                    Review the items above and place your order when everything looks
                    right.
                  </p>

                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    className="mt-3 hidden h-11 w-full rounded-full px-4 text-sm shadow-[0_16px_30px_-16px_rgba(16,33,58,0.6)] lg:inline-flex"
                    onClick={handlePlaceOrder}
                    loading={placingOrder || razorpayLoading || addressBusy}
                    disabled={
                      placingOrder || razorpayLoading || addressBusy || hasOutOfStockItems
                    }
                  >
                    Place Order
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>

      {!empty ? (
        <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-40 px-3 lg:hidden">
          <div className="border-border/70 mx-auto max-w-md rounded-[1.3rem] border bg-white/96 px-3 py-2 shadow-[0_-10px_30px_-18px_rgba(16,33,58,0.45)] backdrop-blur-xl">
            <div className="grid grid-cols-[minmax(0,0.36fr)_minmax(0,0.64fr)] items-center gap-2">
              <div className="min-w-0">
                <p className="text-muted text-[10px] font-semibold tracking-[0.18em] uppercase">
                  Total
                </p>
                <p className="text-text truncate text-[15px] leading-none font-bold">
                  {formatPrice(pricing.totalAmount)}
                </p>
              </div>
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="h-11 w-full rounded-full px-4 text-sm shadow-[0_16px_30px_-16px_rgba(16,33,58,0.6)]"
                onClick={handlePlaceOrder}
                loading={placingOrder || razorpayLoading || addressBusy}
                disabled={
                  placingOrder || razorpayLoading || addressBusy || hasOutOfStockItems
                }
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
