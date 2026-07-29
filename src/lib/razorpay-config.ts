import { readEnvironmentValue } from "@/lib/environment";

export function getRazorpayPublicKeyId() {
  return readEnvironmentValue("NEXT_PUBLIC_RAZORPAY_KEY_ID");
}

export function getRazorpaySecretKey() {
  return readEnvironmentValue("RAZORPAY_KEY_SECRET");
}
