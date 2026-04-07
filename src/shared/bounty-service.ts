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

// ── Direct API Sources ──

async function fetchDevpost(): Promise<BountyListing[]> {
  try {
    const data = await fetchJSON('https://devpost.com/api/hackathons?status=open&page=1&per_page=10');
    if (!data?.hackathons) return [];
    return data.hackathons.map((h: any) => ({
      title: h.title,
      source: 'Devpost',
      url: h.url,
      prize: h.prize_amount ? `$${h.prize_amount}` : undefined,
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
  try {
    const data = await fetchJSON('https://api.devfolio.co/api/hackathons?page=1&limit=10');
    if (!data?.results) return [];
    return data.results.map((h: any) => ({
      title: h.name,
      source: 'Devfolio',
      url: `https://devfolio.co/hackathons/${h.slug}`,
      prize: h.prize_amount ? `$${h.prize_amount}` : undefined,
      deadline: h.ends_at,
      tags: h.themes || [],
      description: h.tagline,
    }));
  } catch (err) {
    logger.error(`[BOUNTY] Source fetch failed: ${err}`);
    return [];
  }
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

  // Return as a single listing with the scraped content — the LLM will parse it
  return [{
    title: `${name} — Latest Listings`,
    source: name,
    url,
    description: content.slice(0, 500),
  }];
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
      listings.push(...result.value);
    }
  }

  logger.info(`[BOUNTY-SERVICE] Found ${listings.length} listings from ${results.filter(r => r.status === 'fulfilled').length} sources`);

  cache.set('all', { data: listings, expiry: Date.now() + CACHE_TTL_MS });
  return listings;
}

/**
 * Get a formatted summary of all bounties for agent context.
 */
export async function getBountyContext(): Promise<string> {
  const listings = await fetchAllBounties();
  if (listings.length === 0) return 'No bounties or hackathons found at this time.';

  const bySource = new Map<string, BountyListing[]>();
  for (const l of listings) {
    const arr = bySource.get(l.source) || [];
    arr.push(l);
    bySource.set(l.source, arr);
  }

  const sections: string[] = [];
  for (const [source, items] of bySource) {
    const lines = items.map((i) => {
      let line = `- ${i.title}`;
      if (i.prize) line += ` | Prize: ${i.prize}`;
      if (i.deadline) line += ` | Deadline: ${i.deadline}`;
      if (i.url) line += ` | ${i.url}`;
      return line;
    }).join('\n');
    sections.push(`### ${source}\n${lines}`);
  }

  return `# Active Bounties & Hackathons\n\n${sections.join('\n\n')}`;
}

/**
 * Fetch a specific URL and return its content (for user-provided links).
 */
export async function fetchCustomSource(url: string): Promise<string> {
  return fetchWebPage(url);
}
