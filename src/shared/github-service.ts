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

// ── Commits & Diffs ──

export interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  date: string;
  filesChanged?: number;
}

/**
 * Fetch recent commits from the connected repo.
 */
export async function fetchCommits(limit: number = 10): Promise<CommitInfo[]> {
  const session = getSessionConfig();
  if (!session.repoConnected || !session.githubToken || !session.repoUrl) return [];

  const parsed = parseRepo(session.repoUrl);
  if (!parsed) return [];

  const cacheKey = `commits:${parsed.owner}/${parsed.repo}`;
  const cached = getCached<CommitInfo[]>(cacheKey);
  if (cached) return cached;

  try {
    const data = await ghFetch(`/repos/${parsed.owner}/${parsed.repo}/commits?per_page=${limit}`, session.githubToken);
    const commits: CommitInfo[] = data.map((c: any) => ({
      sha: c.sha,
      message: c.commit?.message || '',
      author: c.commit?.author?.name || c.author?.login || '',
      date: c.commit?.author?.date || '',
    }));
    setCache(cacheKey, commits, 2 * 60 * 1000); // 2 min cache
    return commits;
  } catch (err) {
    logger.error(`[GITHUB] Failed to fetch commits: ${err}`);
    return [];
  }
}

/**
 * Fetch the diff for a specific commit.
 */
export async function fetchCommitDiff(sha: string): Promise<string> {
  const session = getSessionConfig();
  if (!session.repoConnected || !session.githubToken || !session.repoUrl) return '';

  const parsed = parseRepo(session.repoUrl);
  if (!parsed) return '';

  try {
    const res = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits/${sha}`, {
      headers: {
        Authorization: `token ${session.githubToken}`,
        Accept: 'application/vnd.github.v3.diff',
      },
    });
    if (!res.ok) return '';
    const diff = await res.text();
    return diff.slice(0, 5000); // Truncate for LLM context
  } catch {
    return '';
  }
}

/**
 * Fetch changed files and patches for a PR.
 */
export interface PRFile {
  filename: string;
  status: string; // added, removed, modified, renamed
  additions: number;
  deletions: number;
  patch?: string; // unified diff for this file
}

export async function fetchPRFiles(prNumber: number): Promise<PRFile[]> {
  const session = getSessionConfig();
  if (!session.repoConnected || !session.githubToken || !session.repoUrl) return [];

  const parsed = parseRepo(session.repoUrl);
  if (!parsed) return [];

  try {
    const data = await ghFetch(`/repos/${parsed.owner}/${parsed.repo}/pulls/${prNumber}/files?per_page=30`, session.githubToken);
    return data.map((f: any) => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      patch: f.patch?.slice(0, 2000), // Truncate large diffs
    }));
  } catch (err) {
    logger.error(`[GITHUB] Failed to fetch PR #${prNumber} files: ${err}`);
    return [];
  }
}

/**
 * Fetch full unified diff for a PR.
 */
export async function fetchPRDiff(prNumber: number): Promise<string> {
  const session = getSessionConfig();
  if (!session.repoConnected || !session.githubToken || !session.repoUrl) return '';

  const parsed = parseRepo(session.repoUrl);
  if (!parsed) return '';

  try {
    const res = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/pulls/${prNumber}`, {
      headers: {
        Authorization: `token ${session.githubToken}`,
        Accept: 'application/vnd.github.v3.diff',
      },
    });
    if (!res.ok) return '';
    const diff = await res.text();
    return diff.slice(0, 8000); // Larger limit for PR diffs
  } catch {
    return '';
  }
}

/**
 * Get the latest commit SHA (used for polling new commits).
 */
export async function getLatestCommitSHA(): Promise<string | null> {
  const commits = await fetchCommits(1);
  return commits.length > 0 ? commits[0].sha : null;
}

/**
 * Get open PR numbers (used for polling new PRs).
 */
export async function getOpenPRNumbers(): Promise<number[]> {
  const session = getSessionConfig();
  if (!session.repoConnected || !session.githubToken || !session.repoUrl) return [];

  const parsed = parseRepo(session.repoUrl);
  if (!parsed) return [];

  try {
    const data = await ghFetch(`/repos/${parsed.owner}/${parsed.repo}/pulls?state=open&per_page=20`, session.githubToken);
    return data.map((pr: any) => pr.number);
  } catch {
    return [];
  }
}
