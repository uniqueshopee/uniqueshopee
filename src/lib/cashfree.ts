"use client";

import { readEnvironmentValue } from "@/lib/environment";

const CASHFREE_SCRIPT_ID = "cashfree-checkout-js";
const CASHFREE_SCRIPT_URL = "https://sdk.cashfree.com/js/v3/cashfree.js";

export type CashfreeMode = "sandbox" | "production";

type CashfreeCheckoutResult = {
  error?: string | { message?: string };
  redirect?: boolean;
};

type CashfreeInstance = {
  checkout: (options: { paymentSessionId: string; redirectTarget: "_modal" | "_self" }) => Promise<CashfreeCheckoutResult | void>;
};

export type CashfreeWindow = Window & {
  Cashfree?: (options: { mode: CashfreeMode }) => CashfreeInstance;
};

let cashfreeScriptPromise: Promise<void> | null = null;

export function getCashfreeMode(): CashfreeMode {
  return readEnvironmentValue("NEXT_PUBLIC_CASHFREE_ENVIRONMENT") === "production" ? "production" : "sandbox";
}

export function formatCashfreeContact(phone: string | null | undefined) {
  const digits = (phone ?? "").trim().replace(/\D/g, "");

  if (!digits) return "";
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  return `+${digits}`;
}

export function loadCashfreeCheckoutScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Cashfree can only be loaded in the browser."));
  }

  if ((window as CashfreeWindow).Cashfree) return Promise.resolve();
  if (cashfreeScriptPromise) return cashfreeScriptPromise;

  cashfreeScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(CASHFREE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Cashfree checkout script.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = CASHFREE_SCRIPT_ID;
    script.src = CASHFREE_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Cashfree checkout script."));
    document.head.appendChild(script);
  }).catch((error) => {
    cashfreeScriptPromise = null;
    throw error;
  });

  return cashfreeScriptPromise;
}

export function getCashfreeCheckout(mode = getCashfreeMode()) {
  const Cashfree = (window as CashfreeWindow).Cashfree;
  if (!Cashfree) return null;
  return Cashfree({ mode });
}
