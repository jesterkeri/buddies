import { useSyncExternalStore } from 'react';

export interface RepoInfo {
  name: string;
  fullName: string;
  description: string;
  stars: number;
  language: string;
  lastPush: string;
  isPrivate: boolean;
  openIssuesCount: number;
  defaultBranch: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  labels: string[];
  createdAt: string;
  author: string;
}

export interface GitHubPR {
  number: number;
  title: string;
  state: string;
  author: string;
  createdAt: string;
  draft: boolean;
}

export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
}

export interface Branch {
  name: string;
  isDefault: boolean;
  isProtected: boolean;
}

export interface ProjectSessionState {
  githubToken: string;
  repoUrl: string;
  repoConnected: boolean;
  repoInfo: RepoInfo | null;
  readme: string;
  issues: GitHubIssue[];
  pullRequests: GitHubPR[];
  fileTree: FileEntry[];
  branches: Branch[];
  activeBranch: string;
  loading: boolean;
  error: string;
}

const STORAGE_KEY = 'buddies-project-session';
import { CONFIG_SERVER } from '../../api/config';

function defaultState(): ProjectSessionState {
  return {
    githubToken: '',
    repoUrl: '',
    repoConnected: false,
    repoInfo: null,
    readme: '',
    issues: [],
    pullRequests: [],
    fileTree: [],
    branches: [],
    activeBranch: '',
    loading: false,
    error: '',
  };
}

function loadState(): ProjectSessionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultState(), ...JSON.parse(raw) } : defaultState();
  } catch {
    return defaultState();
  }
}

function saveState(s: ProjectSessionState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

type Listener = () => void;
const listeners = new Set<Listener>();
let state = loadState();

// Boot-time hydration from backend (backend is canonical for session config)
// If backend says connected but localStorage is missing repo data, re-fetch from GitHub.
(async () => {
  try {
    const res = await fetch(`${CONFIG_SERVER}/session`);
    if (res.ok) {
      const json = await res.json();
      const backend = json?.data;
      if (backend && backend.repoUrl) {
        // Always restore the repo URL
        state = { ...state, repoUrl: backend.repoUrl || state.repoUrl };

        if (backend.repoConnected && state.githubToken && !state.repoInfo) {
          // Backend says connected, we have a token, but missing repo data — re-fetch
          saveState(state);
          listeners.forEach((l) => l());
          try {
            await connectRepo();
          } catch {}
        } else if (backend.repoConnected && !state.githubToken) {
          // Backend says connected but no local token — can't restore.
          // Don't show "CONNECTED" badge if we can't actually fetch repo data.
          // User needs to re-enter their token.
          state = { ...state, repoConnected: false };
          saveState(state);
          listeners.forEach((l) => l());
        } else {
          // Token + data already in localStorage — just sync the URL
          state = { ...state, repoConnected: backend.repoConnected ?? state.repoConnected };
          saveState(state);
          listeners.forEach((l) => l());
        }
      }
    }
  } catch {}
})();

function notify(): void {
  saveState(state);
  listeners.forEach((l) => l());
}

export function getProjectState(): ProjectSessionState {
  return state;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useProjectSession(): ProjectSessionState {
  return useSyncExternalStore(subscribe, getProjectState);
}

// ── GitHub API helpers ──

function parseRepo(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/\s#?]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
}

async function ghFetch(path: string, token: string): Promise<any> {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${res.statusText}`);
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

// ── Actions ──

export function setGithubToken(token: string): void {
  state = { ...state, githubToken: token };
  notify();
}

export function setRepoUrl(url: string): void {
  state = { ...state, repoUrl: url };
  notify();
}

export async function connectRepo(): Promise<void> {
  const parsed = parseRepo(state.repoUrl);
  if (!parsed) {
    state = { ...state, error: 'Invalid GitHub URL. Use format: https://github.com/owner/repo' };
    notify();
    return;
  }

  if (!state.githubToken) {
    state = { ...state, error: 'Enter a GitHub Personal Access Token first.' };
    notify();
    return;
  }

  state = { ...state, loading: true, error: '' };
  notify();

  try {
    const { owner, repo } = parsed;

    // Fetch repo info
    const info = await ghFetch(`/repos/${owner}/${repo}`, state.githubToken);
    const repoInfo: RepoInfo = {
      name: info.name,
      fullName: info.full_name,
      description: info.description || '',
      stars: info.stargazers_count,
      language: info.language || 'Unknown',
      lastPush: info.pushed_at,
      isPrivate: info.private,
      openIssuesCount: info.open_issues_count,
      defaultBranch: info.default_branch,
    };

    // Fetch README
    const readme = await ghFetchRaw(`/repos/${owner}/${repo}/readme`, state.githubToken);

    // Fetch open issues (first 10)
    const issuesData = await ghFetch(`/repos/${owner}/${repo}/issues?state=open&per_page=10&sort=updated`, state.githubToken);
    const issues: GitHubIssue[] = issuesData
      .filter((i: any) => !i.pull_request) // exclude PRs from issues endpoint
      .map((i: any) => ({
        number: i.number,
        title: i.title,
        state: i.state,
        labels: i.labels.map((l: any) => l.name),
        createdAt: i.created_at,
        author: i.user?.login || '',
      }));

    // Fetch recent PRs (first 10)
    const prsData = await ghFetch(`/repos/${owner}/${repo}/pulls?state=all&per_page=10&sort=updated`, state.githubToken);
    const pullRequests: GitHubPR[] = prsData.map((p: any) => ({
      number: p.number,
      title: p.title,
      state: p.state,
      author: p.user?.login || '',
      createdAt: p.created_at,
      draft: p.draft,
    }));

    // Fetch file tree (root level)
    let fileTree: FileEntry[] = [];
    try {
      const treeData = await ghFetch(`/repos/${owner}/${repo}/contents`, state.githubToken);
      fileTree = treeData.map((f: any) => ({
        name: f.name,
        path: f.path,
        type: f.type === 'dir' ? 'dir' as const : 'file' as const,
        size: f.size,
      }));
      // Sort: dirs first, then files
      fileTree.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    } catch {}

    // Fetch branches
    let branches: Branch[] = [];
    try {
      const branchData = await ghFetch(`/repos/${owner}/${repo}/branches?per_page=20`, state.githubToken);
      branches = branchData.map((b: any) => ({
        name: b.name,
        isDefault: b.name === repoInfo.defaultBranch,
        isProtected: b.protected,
      }));
    } catch {}

    state = {
      ...state,
      repoConnected: true,
      repoInfo,
      readme: readme.slice(0, 3000),
      issues,
      pullRequests,
      fileTree,
      branches,
      loading: false,
      error: '',
    };
    notify();

    // Sync to backend config server
    syncToBackend();
  } catch (err: any) {
    state = {
      ...state,
      loading: false,
      error: err.message || 'Failed to connect to repository',
      repoConnected: false,
    };
    notify();
  }
}

export async function switchBranch(branchName: string): Promise<void> {
  const parsed = parseRepo(state.repoUrl);
  if (!parsed || !state.githubToken) return;

  state = { ...state, loading: true, activeBranch: branchName };
  notify();

  const { owner, repo } = parsed;

  try {
    // Refetch file tree for this branch
    const treeData = await ghFetch(`/repos/${owner}/${repo}/contents?ref=${branchName}`, state.githubToken);
    const fileTree: FileEntry[] = treeData.map((f: any) => ({
      name: f.name,
      path: f.path,
      type: f.type === 'dir' ? 'dir' as const : 'file' as const,
      size: f.size,
    }));
    fileTree.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    // Refetch README for this branch
    let readme = '';
    try {
      readme = await ghFetchRaw(`/repos/${owner}/${repo}/readme?ref=${branchName}`, state.githubToken);
    } catch {}

    state = { ...state, fileTree, readme: readme.slice(0, 3000), loading: false };
    notify();
  } catch {
    state = { ...state, loading: false, error: `Failed to load branch: ${branchName}` };
    notify();
  }
}

export async function fetchDirectory(dirPath: string): Promise<FileEntry[]> {
  const parsed = parseRepo(state.repoUrl);
  if (!parsed || !state.githubToken) return [];

  const ref = state.activeBranch ? `?ref=${state.activeBranch}` : '';
  try {
    const data = await ghFetch(`/repos/${parsed.owner}/${parsed.repo}/contents/${dirPath}${ref}`, state.githubToken);
    const entries: FileEntry[] = data.map((f: any) => ({
      name: f.name,
      path: f.path,
      type: f.type === 'dir' ? 'dir' as const : 'file' as const,
      size: f.size,
    }));
    entries.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return entries;
  } catch {
    return [];
  }
}

export async function fetchFileContent(filePath: string): Promise<string> {
  const parsed = parseRepo(state.repoUrl);
  if (!parsed || !state.githubToken) return '';

  const ref = state.activeBranch ? `?ref=${state.activeBranch}` : '';
  try {
    return await ghFetchRaw(`/repos/${parsed.owner}/${parsed.repo}/contents/${filePath}${ref}`, state.githubToken);
  } catch {
    return '';
  }
}

export function disconnectRepo(): void {
  state = {
    ...defaultState(),
    githubToken: state.githubToken, // Keep token for reconnecting
  };
  notify();
  syncToBackend();
}

function syncToBackend(): void {
  fetch(`${CONFIG_SERVER}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      githubToken: state.githubToken,
      repoUrl: state.repoUrl,
      repoConnected: state.repoConnected,
      repoFullName: state.repoInfo?.fullName || '',
    }),
  }).catch(() => {
    // Config server might not be running
  });
}
