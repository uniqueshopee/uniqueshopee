import { readEnvironmentValue } from "@/lib/environment";

export type CashfreeEnvironment = "sandbox" | "production";

export function getCashfreeClientId() {
  return readEnvironmentValue("CASHFREE_CLIENT_ID");
}

export function getCashfreeClientSecret() {
  return readEnvironmentValue("CASHFREE_CLIENT_SECRET");
}

export function getCashfreeEnvironment(): CashfreeEnvironment {
  return readEnvironmentValue("CASHFREE_ENVIRONMENT") === "production" ? "production" : "sandbox";
}

export function getCashfreeApiVersion() {
  return readEnvironmentValue("CASHFREE_API_VERSION") ?? "2025-01-01";
}

export function getCashfreeApiBaseUrl() {
  return getCashfreeEnvironment() === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";
}
