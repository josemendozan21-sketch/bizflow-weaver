import { supabase } from "@/integrations/supabase/client";

/**
 * Parse a Supabase storage URL (public or signed) and return its bucket + path.
 * Returns null if the URL doesn't match a Supabase storage URL pattern.
 */
export function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  if (!url) return null;
  // Matches /storage/v1/object/{public,sign,authenticated}/<bucket>/<path>
  const m = url.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+?)(?:\?.*)?$/);
  if (!m) return null;
  return { bucket: decodeURIComponent(m[1]), path: decodeURIComponent(m[2]) };
}

/**
 * Resolve a stored URL to a short-lived signed URL when it points to a private
 * bucket. Falls back to the original URL otherwise.
 */
export async function getSignedFileUrl(url: string, expiresInSec = 300): Promise<string> {
  const parsed = parseStorageUrl(url);
  if (!parsed) return url;
  const { data, error } = await supabase.storage.from(parsed.bucket).createSignedUrl(parsed.path, expiresInSec);
  if (error || !data?.signedUrl) return url;
  return data.signedUrl;
}

/**
 * Open a (potentially private) storage URL in a new tab using a freshly minted
 * signed URL. Use as the onClick handler for proof / receipt links.
 */
export async function openSignedUrl(url: string) {
  const signed = await getSignedFileUrl(url);
  window.open(signed, "_blank", "noopener,noreferrer");
}