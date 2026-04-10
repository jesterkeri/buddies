import { logger } from '@elizaos/core';
import { promises as dns } from 'dns';

/**
 * Universal web page fetcher via Jina Reader API.
 * Converts any URL to clean markdown text — no API key needed.
 * Used by: Bounty Hunter (scrape listings), Radar (URL research), any agent.
 */

const cache = new Map<string, { data: string; expiry: number }>();
const WEB_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_CONTENT_LENGTH = 12000; // chars to keep — enough for parsing listings
const CACHE_MAX_ENTRIES = 200; // bound the cache so /fetch can't OOM the process

function getCached(url: string): string | null {
  const entry = cache.get(url);
  if (entry && Date.now() < entry.expiry) return entry.data;
  return null;
}

function setCached(url: string, data: string): void {
  // Simple LRU-ish: drop oldest entries when over capacity
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(url, { data, expiry: Date.now() + WEB_CACHE_TTL_MS });
}

/**
 * Return true if a literal IPv4 string is in a private/loopback/link-local
 * range we should never let an LLM-controlled URL reach. Covers the metadata
 * service IPs and the standard RFC1918/loopback/link-local ranges.
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return false;
  const [a, b] = parts;
  if (a === 10) return true;                                      // 10/8
  if (a === 127) return true;                                     // 127/8 loopback
  if (a === 169 && b === 254) return true;                         // 169.254/16 link-local + AWS metadata
  if (a === 172 && b >= 16 && b <= 31) return true;                // 172.16/12
  if (a === 192 && b === 168) return true;                         // 192.168/16
  if (a === 100 && b >= 64 && b <= 127) return true;               // 100.64/10 CGNAT
  if (a === 0) return true;                                        // 0.0.0.0/8
  return false;
}

/**
 * Return true if a literal IPv6 string is loopback / link-local / ULA /
 * IPv4-mapped private. Covers ::1, fe80::/10, fc00::/7, ::ffff:127.0.0.1.
 */
function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase().replace(/^\[|\]$/g, '');
  if (lower === '::' || lower === '::1') return true;
  if (lower.startsWith('fe80:') || lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true; // fe80::/10
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // fc00::/7 ULA
  // IPv4-mapped IPv6 (::ffff:a.b.c.d) — extract the IPv4 portion and check it
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return false;
}

function isPrivateAddress(addr: string): boolean {
  if (!addr) return true;
  if (addr.includes(':')) return isPrivateIPv6(addr);
  return isPrivateIPv4(addr);
}

/**
 * Resolve a hostname and check that NO returned address is private.
 * This catches DNS-rebinding-style attacks where attacker.com resolves
 * to 127.0.0.1 (or to an internal IP) only at fetch time.
 */
async function hostResolvesToPrivate(hostname: string): Promise<boolean> {
  // Literal IPs short-circuit
  if (/^(\d+\.){3}\d+$/.test(hostname)) return isPrivateIPv4(hostname);
  if (hostname.includes(':')) return isPrivateIPv6(hostname);
  try {
    const addrs = await dns.lookup(hostname, { all: true });
    if (!addrs || addrs.length === 0) return true; // refuse to fetch unresolvable hosts
    return addrs.some((a) => isPrivateAddress(a.address));
  } catch {
    return true; // if DNS fails, treat as unsafe
  }
}

/**
 * Synchronous URL pre-check — catches the obvious cases without DNS.
 * The async hostResolvesToPrivate() call is the real security boundary.
 */
function isObviouslyUnsafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return true;
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '0' || host === '0.0.0.0') return true;
    // Reject decimal/octal/hex IP encodings (e.g., http://2130706433 = 127.0.0.1)
    if (/^\d+$/.test(host)) return true;                             // pure decimal
    if (/^0x[0-9a-f]+$/i.test(host)) return true;                    // hex
    if (/^0[0-7]+$/.test(host)) return true;                         // octal
    return false;
  } catch {
    return true;
  }
}

async function isUnsafeUrl(url: string): Promise<boolean> {
  if (isObviouslyUnsafeUrl(url)) return true;
  try {
    const hostname = new URL(url).hostname;
    return await hostResolvesToPrivate(hostname);
  } catch {
    return true;
  }
}

/**
 * Fetch any URL and return clean markdown text.
 * Uses Jina Reader (r.jina.ai) which strips ads, navigation, and returns readable content.
 */
export async function fetchWebPage(url: string): Promise<string> {
  if (await isUnsafeUrl(url)) {
    logger.warn(`[WEB-FETCH] Blocked unsafe URL: ${url}`);
    return '';
  }

  // Normalize the cache key so foo.com/x and foo.com/x?utm=... don't bloat
  // the cache with duplicate entries.
  let cacheKey = url;
  try {
    const u = new URL(url);
    u.hash = '';
    cacheKey = u.toString();
  } catch {}

  const cached = getCached(cacheKey);
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
    setCached(cacheKey, truncated);
    return truncated;
  } catch (err) {
    logger.error(`[WEB-FETCH] Error fetching ${url}: ${err}`);
    return '';
  }
}

/**
 * Fetch JSON from a public API endpoint. No auth needed.
 * Same SSRF guard as fetchWebPage — without it, an LLM-controlled URL
 * passed here could reach localhost / internal IPs.
 */
export async function fetchJSON(url: string): Promise<any> {
  if (await isUnsafeUrl(url)) {
    logger.warn(`[WEB-FETCH] Blocked unsafe JSON URL: ${url}`);
    return null;
  }
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
