const REQUIRED_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "TWOFACTOR_API_KEY",
  "PHONE_AUTH_CREDENTIALS_SECRET",
  "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
  "NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "NEXT_PUBLIC_SITE_URL",
] as const;

export type EnvironmentKey = (typeof REQUIRED_ENV_KEYS)[number];

export type EnvironmentDiagnostic = {
  key: EnvironmentKey;
  present: boolean;
  value: string | null;
};

export function readEnvironmentValue(key: EnvironmentKey) {
  const value = (() => {
    switch (key) {
      case "NEXT_PUBLIC_SUPABASE_URL":
        return process.env.NEXT_PUBLIC_SUPABASE_URL;
      case "NEXT_PUBLIC_SUPABASE_ANON_KEY":
        return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      case "SUPABASE_SERVICE_ROLE_KEY":
        return process.env.SUPABASE_SERVICE_ROLE_KEY;
      case "NEXT_PUBLIC_RAZORPAY_KEY_ID":
        return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      case "RAZORPAY_KEY_SECRET":
        return process.env.RAZORPAY_KEY_SECRET;
      case "TWOFACTOR_API_KEY":
        return process.env.TWOFACTOR_API_KEY;
      case "PHONE_AUTH_CREDENTIALS_SECRET":
        return process.env.PHONE_AUTH_CREDENTIALS_SECRET;
      case "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME":
        return process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      case "NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET":
        return process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
      case "CLOUDINARY_CLOUD_NAME":
        return process.env.CLOUDINARY_CLOUD_NAME;
      case "CLOUDINARY_API_KEY":
        return process.env.CLOUDINARY_API_KEY;
      case "CLOUDINARY_API_SECRET":
        return process.env.CLOUDINARY_API_SECRET;
      case "NEXT_PUBLIC_SITE_URL":
        return process.env.NEXT_PUBLIC_SITE_URL;
      default:
        return null;
    }
  })()?.trim();
  return value && value.length > 0 ? value : null;
}

export function getEnvironmentDiagnostics(): EnvironmentDiagnostic[] {
  return REQUIRED_ENV_KEYS.map((key) => ({
    key,
    value: readEnvironmentValue(key),
    present: readEnvironmentValue(key) !== null,
  }));
}

export function getMissingEnvironmentKeys() {
  return getEnvironmentDiagnostics().filter((item) => !item.present).map((item) => item.key);
}

export function formatMissingEnvironmentMessage(prefix = "Missing environment variables") {
  const missing = getMissingEnvironmentKeys();

  if (missing.length === 0) {
    return null;
  }

  return `${prefix}: ${missing.join(", ")}`;
}
