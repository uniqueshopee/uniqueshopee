import { readEnvironmentValue } from "@/lib/environment";

const PUBLIC_CLOUD_NAME_KEY = "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME";
const SERVER_CLOUD_NAME_KEY = "CLOUDINARY_CLOUD_NAME";
const UPLOAD_PRESET_KEY = "NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET";
const DEFAULT_FOLDER_KEY = "NEXT_PUBLIC_CLOUDINARY_FOLDER";
const API_KEY_KEY = "CLOUDINARY_API_KEY";
const API_SECRET_KEY = "CLOUDINARY_API_SECRET";

export type CloudinaryEnvironment = {
  cloudName: string;
  uploadPreset: string;
  folder: string;
};

export type CloudinaryEnvironmentReport = {
  cloudName: string | null;
  uploadPreset: string | null;
  folder: string;
  apiKey: string | null;
  apiSecret: string | null;
  missing: string[];
};

export type CloudinaryUploadResult = {
  url: string | null;
  error: string | null;
};

function cleanFolder(value: string | undefined | null) {
  return value?.trim().replace(/^\/+|\/+$/g, "") || "uniqueshopee/categories";
}

export function getCloudinaryEnvironment(): CloudinaryEnvironment | null {
  const cloudName = readEnvironmentValue(PUBLIC_CLOUD_NAME_KEY) ?? readEnvironmentValue(SERVER_CLOUD_NAME_KEY);
  const uploadPreset = readEnvironmentValue(UPLOAD_PRESET_KEY);

  if (!cloudName || !uploadPreset) {
    return null;
  }

  return {
    cloudName,
    uploadPreset,
    folder: cleanFolder(process.env[DEFAULT_FOLDER_KEY]),
  };
}

export function getCloudinaryEnvironmentReport(): CloudinaryEnvironmentReport {
  const publicCloudName = readEnvironmentValue(PUBLIC_CLOUD_NAME_KEY);
  const serverCloudName = readEnvironmentValue(SERVER_CLOUD_NAME_KEY);
  const cloudName = publicCloudName ?? serverCloudName;
  const uploadPreset = readEnvironmentValue(UPLOAD_PRESET_KEY);
  const apiKey = readEnvironmentValue(API_KEY_KEY);
  const apiSecret = readEnvironmentValue(API_SECRET_KEY);
  const missing = [
    ...(cloudName ? [] : [PUBLIC_CLOUD_NAME_KEY, SERVER_CLOUD_NAME_KEY]),
    ...(uploadPreset ? [] : [UPLOAD_PRESET_KEY]),
    ...(apiKey ? [] : [API_KEY_KEY]),
    ...(apiSecret ? [] : [API_SECRET_KEY]),
  ];

  return {
    cloudName,
    uploadPreset,
    folder: cleanFolder(process.env[DEFAULT_FOLDER_KEY]),
    apiKey,
    apiSecret,
    missing,
  };
}

export async function uploadCloudinaryImage(file: File): Promise<CloudinaryUploadResult> {
  const environment = getCloudinaryEnvironment();

  if (!environment) {
    return {
      url: null,
      error:
        "Cloudinary is not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME (or CLOUDINARY_CLOUD_NAME) and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.",
    };
  }

  const payload = new FormData();
  payload.append("file", file);
  payload.append("upload_preset", environment.uploadPreset);
  payload.append("folder", environment.folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${environment.cloudName}/image/upload`, {
    method: "POST",
    body: payload,
  });

  if (!response.ok) {
    return {
      url: null,
      error: "Cloudinary upload failed. Please try again.",
    };
  }

  const data = (await response.json()) as { secure_url?: string };

  if (!data.secure_url) {
    return {
      url: null,
      error: "Cloudinary did not return an image URL.",
    };
  }

  return {
    url: data.secure_url,
    error: null,
  };
}
