import { readEnvironmentValue } from "@/lib/environment";

const SUPABASE_URL_KEY = "NEXT_PUBLIC_SUPABASE_URL";
const SUPABASE_ANON_KEY = "NEXT_PUBLIC_SUPABASE_ANON_KEY";
const SUPABASE_SERVICE_ROLE_KEY = "SUPABASE_SERVICE_ROLE_KEY";
const SITE_URL_KEY = "NEXT_PUBLIC_SITE_URL";
const GOOGLE_OAUTH_FLAG_KEYS = ["NEXT_PUBLIC_SUPABASE_GOOGLE_OAUTH_ENABLED", "NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED"] as const;

export type SupabaseEnvironment = {
  url: string;
  anonKey: string;
  serviceRoleKey: string | null;
  siteUrl: string | null;
};

export function getSupabaseEnvironment(): SupabaseEnvironment | null {
  const url = readEnvironmentValue(SUPABASE_URL_KEY);
  const anonKey = readEnvironmentValue(SUPABASE_ANON_KEY);

  if (!url || !anonKey) {
    return null;
  }

  return {
    url,
    anonKey,
    serviceRoleKey: readEnvironmentValue(SUPABASE_SERVICE_ROLE_KEY),
    siteUrl: readEnvironmentValue(SITE_URL_KEY),
  };
}

export function hasSupabaseEnvironment() {
  return getSupabaseEnvironment() !== null;
}

export function requireSupabaseEnvironment(): SupabaseEnvironment {
  const environment = getSupabaseEnvironment();

  if (!environment) {
    const missing: string[] = [];
    if (!readEnvironmentValue(SUPABASE_URL_KEY)) missing.push(SUPABASE_URL_KEY);
    if (!readEnvironmentValue(SUPABASE_ANON_KEY)) missing.push(SUPABASE_ANON_KEY);
    throw new Error(
      `Supabase environment variables are missing: ${missing.join(", ")}. Set the public Supabase URL and anon key to enable integration.`,
    );
  }

  return environment;
}

export function hasGoogleOAuthConfiguration() {
  return GOOGLE_OAUTH_FLAG_KEYS.some((key) => {
    const value = process.env[key]?.trim().toLowerCase();
    return !!value && !["false", "0", "no", "off"].includes(value);
  });
}
