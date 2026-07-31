export const UI_MESSAGES = {
  auth: {
    loginSuccess: "Welcome back! You have successfully signed in.",
    accountCreated: "Your account has been created successfully.",
    registrationSuccess: "Welcome to UniqueShopee. Your account is ready.",
    otpSent: "Verification code sent successfully.",
    otpResent: "A new verification code has been sent.",
    otpVerified: "Mobile number verified successfully.",
    invalidOtp: "The verification code entered is incorrect. Please try again.",
    expiredOtp: "This verification code has expired. Request a new code and try again.",
    tooManyAttempts: "Too many verification attempts. Please wait a few minutes and try again.",
    phoneAlreadyRegistered: "An account already exists with this mobile number. Please sign in.",
    phoneNotFound: "No account was found with this mobile number.",
    loginFailed: "Unable to sign in. Please check your details and try again.",
    passwordIncorrect: "Incorrect password. Please try again.",
    accountLocked: "Your account is temporarily unavailable. Please try again later.",
    sessionExpired: "Your session has expired. Please sign in again.",
    logoutSuccess: "You have been signed out successfully.",
    emailVerificationRequired: "Please verify your email address to continue.",
    verificationEmailSent: "Verification email sent successfully.",
    emailVerified: "Your email has been verified successfully.",
    emailAlreadyRegistered: "An account already exists with this email address.",
  },
  profile: {
    updated: "Your profile has been updated successfully.",
    addressSaved: "Address saved successfully.",
    addressDeleted: "Address removed successfully.",
    passwordUpdated: "Password changed successfully.",
  },
  checkout: {
    addedToCart: "Item added to cart.",
    removedFromCart: "Item removed from cart.",
    wishlistAdded: "Added to your wishlist.",
    wishlistRemoved: "Removed from your wishlist.",
    orderCreated: "Your order has been placed successfully.",
    paymentSuccess: "Payment completed successfully.",
    paymentFailed: "Payment could not be completed. Please try again.",
    couponApplied: "Coupon applied successfully.",
    couponCleared: "Enter a coupon code to calculate live totals.",
    addressDetailsRequired: "Please complete the required fields before saving.",
    couponInvalid: "This coupon is invalid or expired.",
    stockUnavailable: "This item is currently unavailable.",
    addressRequired: "Please select a delivery address before placing your order.",
    signInRequired: "Please sign in to place your order.",
    checkoutUnavailable: "We are experiencing a temporary issue. Please try again shortly.",
  },
  generic: {
    unexpected: "Something went wrong. Please try again.",
    network: "Unable to connect right now. Please check your internet connection and try again.",
    server: "We are experiencing a temporary issue. Please try again shortly.",
  },
} as const;

type KnownErrorLike = {
  message?: string | null;
  code?: string | null;
  status?: number | null;
  name?: string | null;
};

function normalizeMessage(value: string) {
  return value.trim().toLowerCase();
}

export function getFriendlyErrorMessage(error: unknown, fallback: string = UI_MESSAGES.generic.unexpected) {
  const message =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error
        ? String((error as KnownErrorLike).message ?? "")
        : "";

  if (!message) {
    return fallback;
  }

  const normalized = normalizeMessage(message);

  if (
    normalized.includes("permission denied") ||
    normalized.includes("auth admin") ||
    normalized.includes("database error") ||
    normalized.includes("failed to insert") ||
    normalized.includes("supabase") ||
    normalized.includes("invalid rpc") ||
    normalized.includes("stack trace")
  ) {
    return UI_MESSAGES.generic.server;
  }

  if (
    normalized.includes("network error") ||
    normalized.includes("fetch failed") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("network exception")
  ) {
    return UI_MESSAGES.generic.network;
  }

  if (normalized.includes("incorrect password")) {
    return UI_MESSAGES.auth.passwordIncorrect;
  }

  if (normalized.includes("already registered") && normalized.includes("email")) {
    return UI_MESSAGES.auth.emailAlreadyRegistered;
  }

  if (normalized.includes("already registered") && normalized.includes("phone")) {
    return UI_MESSAGES.auth.phoneAlreadyRegistered;
  }

  if (normalized.includes("otp") && normalized.includes("expired")) {
    return UI_MESSAGES.auth.expiredOtp;
  }

  if (normalized.includes("otp") && (normalized.includes("invalid") || normalized.includes("incorrect"))) {
    return UI_MESSAGES.auth.invalidOtp;
  }

  if (normalized.includes("too many") || normalized.includes("rate limit")) {
    return UI_MESSAGES.auth.tooManyAttempts;
  }

  if (normalized.includes("session expired") || normalized.includes("jwt expired")) {
    return UI_MESSAGES.auth.sessionExpired;
  }

  if (normalized.includes("locked")) {
    return UI_MESSAGES.auth.accountLocked;
  }

  if (normalized.includes("not found") && normalized.includes("phone")) {
    return UI_MESSAGES.auth.phoneNotFound;
  }

  if (normalized.includes("payment") && normalized.includes("failed")) {
    return UI_MESSAGES.checkout.paymentFailed;
  }

  return fallback;
}

export function getApiErrorMessage(error: unknown, fallback = UI_MESSAGES.generic.server) {
  return getFriendlyErrorMessage(error, fallback);
}
