"use client";

import { readEnvironmentValue } from "@/lib/environment";

const RAZORPAY_SCRIPT_ID = "razorpay-checkout-js";
const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

export type RazorpaySuccessResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

export type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description?: string;
  image?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  retry?: {
    enabled?: boolean;
    max_count?: number;
  };
  modal?: {
    confirm_close?: boolean;
    escape?: boolean;
    backdropclose?: boolean;
    animation?: boolean;
    ondismiss?: () => void;
  };
  handler: (response: RazorpaySuccessResponse) => void;
};

export type RazorpayWindow = Window & {
  Razorpay?: new (options: RazorpayCheckoutOptions) => {
    open: () => void;
    on: (eventName: string, callback: (...args: unknown[]) => void) => void;
    close: () => void;
  };
};

let razorpayScriptPromise: Promise<void> | null = null;

export function getRazorpayKeyId() {
  return readEnvironmentValue("NEXT_PUBLIC_RAZORPAY_KEY_ID");
}

export function formatRazorpayContact(phone: string | null | undefined) {
  const digits = (phone ?? "").trim().replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.startsWith("91") && digits.length === 12) {
    return `+${digits}`;
  }

  if (digits.startsWith("+")) {
    return digits;
  }

  return `+${digits}`;
}

export function loadRazorpayCheckoutScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay can only be loaded in the browser."));
  }

  const existingWindow = window as RazorpayWindow;
  if (existingWindow.Razorpay) {
    return Promise.resolve();
  }

  if (razorpayScriptPromise) {
    return razorpayScriptPromise;
  }

  razorpayScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(RAZORPAY_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Razorpay checkout script.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = RAZORPAY_SCRIPT_ID;
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout script."));
    document.head.appendChild(script);
  }).catch((error) => {
    razorpayScriptPromise = null;
    throw error;
  });

  return razorpayScriptPromise;
}
