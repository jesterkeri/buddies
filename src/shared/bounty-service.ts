import { logger } from '@elizaos/core';
import { fetchWebPage, fetchJSON } from './web-fetch.ts';

/**
 * Bounty & Hackathon aggregation service.
 * Fetches from 10+ sources — no API keys needed.
 */

export interface BountyListing {
  title: string;
  source: string;
  url: string;
  prize?: string;
  deadline?: string;
  tags?: string[];
  description?: string;
}

const cache = new Map<string, { data: BountyListing[]; expiry: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// Strip HTML tags and decode common entities from scraped data.
// IMPORTANT: decode entities FIRST, then strip tags. If you strip tags first
// then decode, an input like "&lt;img onerror=...&gt;" would become an
// executable-looking <img> tag in the output. Two passes of tag stripping
// catch any tags that emerged from decoded entities.
function stripHtml(s: any): string {
  if (!s || typeof s !== 'string') return s || '';
  return s
    // 1. Decode entities first
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_: string, n: string) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_: string, n: string) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    // 2. Strip tags (twice — catches tags that emerged from decoded entities)
    .replace(/<[^>]*>/g, '')
    .replace(/<[^>]*>/g, '')
    // 3. Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// Escape markdown metacharacters to prevent breaking link structure or
// injecting markdown into LLM context. Only the chars that affect link
// parsing and emphasis: [ ] ( ) * _ ` \ and newline.
function escapeMarkdown(s: string): string {
  if (!s) return '';
  return s.replace(/[\\\[\]()*_`]/g, '\\$&').replace(/[\r\n]+/g, ' ');
}

function cleanListing(l: BountyListing): BountyListing {
  return {
    ...l,
    title: stripHtml(l.title),
    prize: l.prize ? stripHtml(l.prize) : undefined,
    deadline: l.deadline ? stripHtml(l.deadline) : undefined,
    description: l.description ? stripHtml(l.description) : undefined,
  };
}

// ── Direct API Sources ──

async function fetchDevpost(): Promise<BountyListing[]> {
  try {
    const data = await fetchJSON('https://devpost.com/api/hackathons?status=open&page=1&per_page=10');
    if (!data?.hackathons) return [];
    return data.hackathons.map((h: any) => ({
      title: h.title,
      source: 'Devpost',
      url: h.url,
      // Devpost's prize_amount field already includes a currency symbol; don't prepend $
      prize: h.prize_amount || undefined,
      deadline: h.submission_period_dates,
      tags: h.themes?.map((t: any) => t.name) || [],
      description: h.tagline,
    }));
  } catch (err) {
    logger.error(`[BOUNTY] Source fetch failed: ${err}`);
    return [];
  }
}

async function fetchDevfolio(): Promise<BountyListing[]> {
  // Devfolio's public API only returns ancient hackathons. Scrape the live page via Jina instead.
  try {
    const content = await fetchWebPage('https://devfolio.co/hackathons');
    if (!content) return [];
    return parseMarkdownListings(content, 'Devfolio');
  } catch (err) {
    logger.error(`[BOUNTY] Devfolio fetch failed: ${err}`);
    return [];
  }
}

/**
 * Parse markdown content from Jina Reader to extract hackathon/bounty listings.
 * Looks for [### Title](URL) patterns, dedupes, filters image/asset URLs.
 */
function isContentUrl(url: string): boolean {
  // Reject image, asset, social, and tracking URLs
  const lower = url.toLowerCase();
  if (/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2)(\?|$)/.test(lower)) return false;
  if (/cloudflarestorage|googleusercontent|gravatar|cdn\./.test(lower)) return false;
  if (/x\.com\/|twitter\.com\/|discord\.gg\/|t\.me\/|instagram\.com\//.test(lower)) return false;
  if (/login|signin|signup|auth|register/.test(lower)) return false;
  return true;
}

/**
 * Extract a markdown link's URL with balanced parens, starting at the opening (.
 * Returns [url, end_index] or null if no closing paren found.
 * Handles URLs like en.wikipedia.org/wiki/Foo_(disambiguation) correctly.
 */
function extractBalancedUrl(s: string, openParenIdx: number): [string, number] | null {
  if (s[openParenIdx] !== '(') return null;
  let depth = 1;
  let i = openParenIdx + 1;
  while (i < s.length) {
    const ch = s[i];
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) {
        const url = s.slice(openParenIdx + 1, i).trim();
        return [url, i + 1];
      }
    } else if (ch === '\n' || ch === ' ') {
      // Markdown URLs don't span lines or contain whitespace at top level
      return null;
    }
    i++;
  }
  return null;
}

function parseMarkdownListings(markdown: string, source: string): BountyListing[] {
  const seen = new Set<string>();
  const listings: BountyListing[] = [];

  // Pattern: [### Title]( ... ) — Devfolio/most hackathon sites
  // We match the [### Title] portion with regex, then walk the URL with
  // balanced-paren extraction to handle URLs containing parentheses.
  const headingRe = /\[#{2,4}\s+([^\]]+?)\]/g;
  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(markdown)) !== null) {
    const title = m[1].trim().replace(/\s+/g, ' ');
    if (title.length < 4 || title.length > 150) continue;
    if (seen.has(title)) continue;

    // The next char after the closing ] must be ( for a markdown link
    const closeBracketIdx = m.index + m[0].length - 1;
    const openParenIdx = closeBracketIdx + 1;
    if (markdown[openParenIdx] !== '(') continue;

    const extracted = extractBalancedUrl(markdown, openParenIdx);
    if (!extracted) continue;
    const [url] = extracted;
    if (!url || !isContentUrl(url)) continue;

    seen.add(title);
    listings.push({ title, source, url });
    if (listings.length >= 10) return listings;
  }

  return listings;
}

async function fetchSuperteamEarn(): Promise<BountyListing[]> {
  try {
    const data = await fetchJSON('https://earn.superteam.fun/api/listings?take=10&type=bounty');
    if (!Array.isArray(data)) return [];
    return data.map((b: any) => ({
      title: b.title,
      source: 'Superteam Earn',
      url: `https://earn.superteam.fun/listings/${b.slug}`,
      prize: b.rewardAmount ? `${b.rewardAmount} ${b.token || 'USDC'}` : undefined,
      deadline: b.deadline,
      tags: b.skills?.map((s: any) => s.skills) || [],
      description: b.description?.slice(0, 150),
    }));
  } catch (err) {
    logger.error(`[BOUNTY] Source fetch failed: ${err}`);
    return [];
  }
}

async function fetchGitHubBounties(): Promise<BountyListing[]> {
  try {
    const data = await fetchJSON('https://api.github.com/search/issues?q=label:bounty+state:open&per_page=10&sort=created&order=desc');
    if (!data?.items) return [];
    return data.items.map((i: any) => ({
      title: i.title,
      source: 'GitHub',
      url: i.html_url,
      tags: i.labels?.map((l: any) => l.name) || [],
      description: i.body?.slice(0, 150),
    }));
  } catch (err) {
    logger.error(`[BOUNTY] Source fetch failed: ${err}`);
    return [];
  }
}

// ── Jina Reader Sources (scrape via markdown conversion) ──

const JINA_SOURCES = [
  { name: 'Immunefi', url: 'https://immunefi.com/bug-bounty/' },
  { name: 'Akindo', url: 'https://akindo.io/' },
  { name: 'ETHGlobal', url: 'https://ethglobal.com/events' },
  { name: 'DoraHacks', url: 'https://dorahacks.io/hackathon' },
  { name: 'Layer3', url: 'https://layer3.xyz/bounties' },
  { name: 'OnlyDust', url: 'https://onlydust.com/' },
];

async function fetchJinaSource(name: string, url: string): Promise<BountyListing[]> {
  const content = await fetchWebPage(url);
  if (!content) return [];

  // Only return parsed individual listings. No fallback to source-page links —
  // those clutter the results and make the demo look lazy.
  return parseMarkdownListings(content, name);
}

// ── Main API ──

/**
 * Fetch bounties and hackathons from all sources.
 * Returns aggregated listings sorted by source.
 */
export async function fetchAllBounties(): Promise<BountyListing[]> {
  const cached = cache.get('all');
  if (cached && Date.now() < cached.expiry) return cached.data;

  logger.info('[BOUNTY-SERVICE] Fetching from all sources...');

  // Fetch from all sources in parallel
  const results = await Promise.allSettled([
    fetchDevpost(),
    fetchDevfolio(),
    fetchSuperteamEarn(),
    fetchGitHubBounties(),
    ...JINA_SOURCES.map((s) => fetchJinaSource(s.name, s.url)),
  ]);

  const listings: BountyListing[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      // Strip HTML from all scraped fields before storing
      listings.push(...result.value.map(cleanListing));
    }
  }

  logger.info(`[BOUNTY-SERVICE] Found ${listings.length} listings from ${results.filter(r => r.status === 'fulfilled').length} sources`);

  cache.set('all', { data: listings, expiry: Date.now() + CACHE_TTL_MS });
  return listings;
}

/**
 * Get a formatted summary of all bounties for agent context.
 */
// Validate that a URL is well-formed http(s) before interpolating it.
function isValidHttpUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function getBountyContext(): Promise<string> {
  const listings = await fetchAllBounties();
  if (listings.length === 0) return 'No bounties or hackathons found at this time.';

  // Cap at 10 listings to stay within token budgets (Groq: 12K TPM)
  const top = listings.slice(0, 10);
  const lines = top.map((i) => {
    // Escape markdown metacharacters in title to prevent breaking link
    // structure or injecting markdown into LLM context.
    const safeTitle = escapeMarkdown(i.title || 'Untitled');
    const safeSource = escapeMarkdown(i.source || 'Unknown');
    const safePrize = i.prize ? escapeMarkdown(i.prize) : '';
    const safeDeadline = i.deadline ? escapeMarkdown(i.deadline) : '';
    // Only emit a link if the URL is a valid http(s) URL
    const titleLink = isValidHttpUrl(i.url) ? `[${safeTitle}](${i.url})` : `**${safeTitle}**`;
    let line = `- ${titleLink} (${safeSource})`;
    if (safePrize) line += ` — ${safePrize}`;
    if (safeDeadline) line += ` — Due ${safeDeadline}`;
    return line;
  }).join('\n');

  return `# Active Bounties (${listings.length} total, top 10)\n\n${lines}\n\nIMPORTANT: When listing opportunities to the user, ALWAYS preserve the markdown link format [Title](URL) so the user can click them. Do not strip URLs from your responses.`;
}

/**
 * Fetch a specific URL and return its content (for user-provided links).
 */
export async function fetchCustomSource(url: string): Promise<string> {
  return fetchWebPage(url);
}
