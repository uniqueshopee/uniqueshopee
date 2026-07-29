import { getSupabaseEnvironment } from "./env";

export function hasSupabaseStorage() {
  return getSupabaseEnvironment() !== null;
}

export function joinStoragePath(...segments: Array<string | number | null | undefined>) {
  return segments
    .filter((segment): segment is string | number => segment !== null && segment !== undefined && segment !== "")
    .map(String)
    .map((segment) => segment.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
}

export function getPublicStorageUrl(bucket: string, path: string) {
  const environment = getSupabaseEnvironment();

  if (!environment) {
    return null;
  }

  const normalizedPath = path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${environment.url}/storage/v1/object/public/${encodeURIComponent(bucket)}/${normalizedPath}`;
}

export function getStorageUploadHint(bucket: string, path: string) {
  return {
    bucket,
    path: joinStoragePath(path),
    publicUrl: getPublicStorageUrl(bucket, path),
  };
}
