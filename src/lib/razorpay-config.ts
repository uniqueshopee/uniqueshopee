export function getRazorpayPublicKeyId() {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim() || null;
}

export function getRazorpaySecretKey() {
  return process.env.RAZORPAY_KEY_SECRET?.trim() || null;
}
