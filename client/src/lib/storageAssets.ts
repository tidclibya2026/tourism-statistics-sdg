export const LEGACY_STORAGE_BASE_URL = "/manus-storage";

export function buildStorageAssetUrl(
  key: string,
  baseUrl = LEGACY_STORAGE_BASE_URL
) {
  const normalizedKey = key.trim().replace(/^\/+/, "");
  const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, "");

  if (
    !normalizedKey ||
    normalizedKey.split("/").some(segment => segment === "..")
  ) {
    throw new Error("Storage key is invalid");
  }
  if (!normalizedBaseUrl) {
    throw new Error("VITE_STORAGE_PUBLIC_BASE_URL is empty");
  }

  return `${normalizedBaseUrl}/${normalizedKey}`;
}

export function storageAssetUrl(key: string) {
  return buildStorageAssetUrl(
    key,
    import.meta.env.VITE_STORAGE_PUBLIC_BASE_URL || LEGACY_STORAGE_BASE_URL
  );
}
