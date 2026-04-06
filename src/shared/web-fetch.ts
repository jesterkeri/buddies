import { logger } from '@elizaos/core';

/**
 * Universal web page fetcher via Jina Reader API.
 * Converts any URL to clean markdown text — no API key needed.
 * Used by: Bounty Hunter (scrape listings), Radar (URL research), any agent.
 */

const cache = new Map<string, { data: string; expiry: number }>();
const WEB_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_CONTENT_LENGTH = 3000; // chars to keep for LLM context

function getCached(url: string): string | null {
  const entry = cache.get(url);
  if (entry && Date.now() < entry.expiry) return entry.data;
  return null;
}

/**
 * Fetch any URL and return clean markdown text.
 * Uses Jina Reader (r.jina.ai) which strips ads, navigation, and returns readable content.
 */
export async function fetchWebPage(url: string): Promise<string> {
  const cached = getCached(url);
  if (cached) return cached;

  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { Accept: 'text/plain' },
    });

    if (!res.ok) {
      logger.warn(`[WEB-FETCH] Failed to fetch ${url}: ${res.status}`);
      return '';
    }

    const text = await res.text();
    const truncated = text.slice(0, MAX_CONTENT_LENGTH);
    cache.set(url, { data: truncated, expiry: Date.now() + WEB_CACHE_TTL_MS });
    return truncated;
  } catch (err) {
    logger.error(`[WEB-FETCH] Error fetching ${url}: ${err}`);
    return '';
  }
}

/**
 * Fetch JSON from a public API endpoint. No auth needed.
 */
export async function fetchJSON(url: string): Promise<any> {
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
