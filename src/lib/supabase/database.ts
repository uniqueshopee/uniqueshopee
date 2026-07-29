import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "./client";
import { getSupabaseServerClient } from "./server";
import type { Database } from "./types";

export type SupabaseDatabaseClient = SupabaseClient<Database>;

export async function getSupabaseDatabaseClient(): Promise<SupabaseDatabaseClient | null> {
  return getSupabaseBrowserClient() ?? (await getSupabaseServerClient());
}

export async function withSupabaseClient<T>(handler: (client: SupabaseDatabaseClient) => Promise<T>): Promise<T | null> {
  const client = await getSupabaseDatabaseClient();

  if (!client) {
    return null;
  }

  return handler(client);
}

export async function querySupabaseTable(tableName: string) {
  const client = await getSupabaseDatabaseClient();

  if (!client) {
    return null;
  }

  return client.from(tableName);
}
