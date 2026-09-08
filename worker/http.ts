import fetch from "node-fetch";

/**
 * Strips characters Node's HTTP client rejects as illegal header values —
 * notably newlines/carriage returns, which sneak in when a secret is pasted
 * into a platform's env var UI (e.g. Railway) with a trailing newline.
 */
function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    clean[key.trim()] = value.replace(/[\r\n]+/g, "").trim();
  }
  return clean;
}

/** Fetches JSON, returning null on any non-2xx or network error so one bad company never kills a poll cycle. */
export async function fetchJson<T>(url: string, headers?: Record<string, string>): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: headers ? sanitizeHeaders(headers) : undefined });
    if (!res.ok) {
      console.warn(`[http] ${url} -> ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[http] ${url} failed:`, (err as Error).message);
    return null;
  }
}

export function stripHtml(html: string | null | undefined): string | null {
  if (!html) return null;
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function logoUrl(domain: string): string {
  return `https://logo.clearbit.com/${domain}`;
}
