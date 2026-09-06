import "server-only";

import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { joinStoragePath } from "@/lib/supabase/storage";

const APPROVED_BUCKETS = ["users", "room-visualizer"] as const;
type ApprovedBucket = (typeof APPROVED_BUCKETS)[number];

function isApprovedBucket(bucket: string): bucket is ApprovedBucket {
  return (APPROVED_BUCKETS as readonly string[]).includes(bucket);
}

function isOwnedObjectPath(userId: string, path: string) {
  return path.startsWith(`${userId}/`) && path.length > userId.length + 1;
}

async function listOwnedObjectPaths(bucket: ApprovedBucket, userId: string, prefix: string): Promise<string[]> {
  const client = getSupabaseServiceRoleClient();
  if (!client) {
    throw new Error("Storage service is unavailable.");
  }

  const { data, error } = await client.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) {
    throw new Error("Unable to inspect user storage.");
  }

  const paths: string[] = [];
  for (const item of data ?? []) {
    const path = joinStoragePath(prefix, item.name);
    if (!isOwnedObjectPath(userId, path)) {
      throw new Error("Storage ownership validation failed.");
    }

    if (item.id === null && item.metadata === null) {
      paths.push(...(await listOwnedObjectPaths(bucket, userId, path)));
    } else {
      paths.push(path);
    }
  }

  return paths;
}

export async function cleanupApprovedUserStorage(userId: string) {
  const client = getSupabaseServiceRoleClient();
  if (!client) {
    return { completed: false, error: "Storage service is unavailable." };
  }

  try {
    for (const bucket of APPROVED_BUCKETS) {
      if (!isApprovedBucket(bucket)) {
        return { completed: false, error: "Storage bucket validation failed." };
      }

      const paths = await listOwnedObjectPaths(bucket, userId, userId);
      for (let index = 0; index < paths.length; index += 100) {
        const batch = paths.slice(index, index + 100);
        const { error } = await client.storage.from(bucket).remove(batch);
        if (error) {
          return { completed: false, error: "Unable to clean user storage." };
        }
      }
    }

    return { completed: true, error: null };
  } catch {
    return { completed: false, error: "Unable to clean user storage." };
  }
}
