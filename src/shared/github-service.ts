import { logger } from '@elizaos/core';
import { getSessionConfig } from './config-server.ts';

/**
 * Shared GitHub service — read-only access to the user's repo.
 * All agents use this to get repo context.
 */

const cache = new Map<string, { data: any; expiry: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data as T;
  return null;
}

function setCache(key: string, data: any, ttlMs: number): void {
  cache.set(key, { data, expiry: Date.now() + ttlMs });
}

async function ghFetch(path: string, token: string): Promise<any> {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  return res.json();
}

async function ghFetchRaw(path: string, token: string): Promise<string> {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3.raw',
    },
  });
  if (!res.ok) return '';
  return res.text();
}

function parseRepo(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/\s#?]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
}

/**
 * Get a summary of the connected repo for agent context.
 * Returns null if no repo is connected.
 */
export async function getRepoContext(): Promise<string | null> {
  const session = getSessionConfig();
  if (!session.repoConnected || !session.githubToken || !session.repoUrl) return null;

  const parsed = parseRepo(session.repoUrl);
  if (!parsed) return null;

  const { owner, repo } = parsed;
  const cacheKey = `context:${owner}/${repo}`;

  const cached = getCached<string>(cacheKey);
  if (cached) return cached;

  try {
    const sections: string[] = [];

    // README (truncated)
    const readme = await ghFetchRaw(`/repos/${owner}/${repo}/readme`, session.githubToken);
    if (readme) {
      sections.push(`## README\n${readme.slice(0, 2000)}`);
    }

    // Open issues (top 5)
    try {
      const issues = await ghFetch(`/repos/${owner}/${repo}/issues?state=open&per_page=5&sort=updated`, session.githubToken);
      const issueList = issues
        .filter((i: any) => !i.pull_request)
        .map((i: any) => `- #${i.number}: ${i.title} [${i.labels.map((l: any) => l.name).join(', ')}]`)
        .join('\n');
      if (issueList) sections.push(`## Open Issues\n${issueList}`);
    } catch {}

    // Recent PRs (top 5)
    try {
      const prs = await ghFetch(`/repos/${owner}/${repo}/pulls?state=all&per_page=5&sort=updated`, session.githubToken);
      const prList = prs
        .map((p: any) => `- #${p.number}: ${p.title} (${p.state}${p.draft ? ', draft' : ''}) by ${p.user?.login}`)
        .join('\n');
      if (prList) sections.push(`## Recent Pull Requests\n${prList}`);
    } catch {}

    // File tree (root level)
    try {
      const tree = await ghFetch(`/repos/${owner}/${repo}/contents`, session.githubToken);
      const files = tree.map((f: any) => `${f.type === 'dir' ? '📁' : '📄'} ${f.name}`).join(', ');
      sections.push(`## Project Structure\n${files}`);
    } catch {}

    const context = `# Repository: ${owner}/${repo}\n\n${sections.join('\n\n')}`;
    setCache(cacheKey, context, 15 * 60 * 1000); // 15 min cache
    return context;
  } catch (err) {
    logger.error(`[BUDDIES] Failed to fetch repo context: ${err}`);
    return null;
  }
}

/**
 * Fetch a specific file from the connected repo.
 */
export async function fetchFile(path: string): Promise<string | null> {
  const session = getSessionConfig();
  if (!session.repoConnected || !session.githubToken || !session.repoUrl) return null;

  const parsed = parseRepo(session.repoUrl);
  if (!parsed) return null;

  try {
    return await ghFetchRaw(`/repos/${parsed.owner}/${parsed.repo}/contents/${path}`, session.githubToken);
  } catch {
    return null;
  }
}
