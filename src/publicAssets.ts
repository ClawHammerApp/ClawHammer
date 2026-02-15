const base = import.meta.env.VITE_PUBLIC_BLOB_BASE_URL;

if (!base) {
  // This will make missing env obvious during dev instead of silently breaking links.
  throw new Error("Missing VITE_PUBLIC_BLOB_BASE_URL in environment");
}

export function publicAssetUrl(path: string) {
  const trimmedBase = base.replace(/\/+$/, "");
  const trimmedPath = path.replace(/^\/+/, "");
  return `${trimmedBase}/${trimmedPath}`;
}