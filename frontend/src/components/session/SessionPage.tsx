import { useState } from 'react';
import {
  useProjectSession,
  setGithubToken,
  setRepoUrl,
  connectRepo,
  disconnectRepo,
  switchBranch,
  fetchDirectory,
  fetchFileContent,
  type FileEntry,
} from './sessionProjectStore';
import { AGENT_NAMES, getAgentColor } from '../../types';

// Per-agent access level (stored in component state, not persisted yet)
type AccessLevel = 'read' | 'write';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function SessionPage() {
  const session = useProjectSession();
  const [showToken, setShowToken] = useState(false);
  const [agentAccess, setAgentAccess] = useState<Record<string, AccessLevel>>(
    Object.fromEntries(AGENT_NAMES.map((n) => [n, 'read' as AccessLevel]))
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-4">

          {/* Header */}
          <div className="panel p-3 border-2 border-[--color-ink]" style={{ backgroundColor: '#2BB6B3' }}>
            <p className="font-display text-lg text-[--color-ink]">PROJECT SESSION</p>
            <p className="text-[10px] font-mono text-[--color-ink]/60 mt-0.5">
              Connect a GitHub repo — all agents get read-only access
            </p>
          </div>

          {/* GitHub Connection Card */}
          <div className="border-2 border-[--color-ink] shadow-[3px_3px_0px_var(--color-ink)] overflow-hidden" style={{ backgroundColor: '#0d1117' }}>
            <div className="px-4 py-3 border-b-2 border-[--color-ink] flex items-center justify-between" style={{ backgroundColor: '#161b22' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 border-2 border-[--color-ink] flex items-center justify-center text-sm" style={{ backgroundColor: '#1f6feb', boxShadow: '2px 2px 0px #0a0a0a' }}>
                  G
                </div>
                <div>
                  <span className="font-display text-sm text-white tracking-wider">GITHUB</span>
                  {session.repoConnected && (
                    <span className="ml-2 text-[8px] font-mono font-bold px-1.5 py-0.5 bg-[#22c55e] text-[#0a0a0a] border border-[--color-ink]">
                      CONNECTED
                    </span>
                  )}
                  <p className="text-[9px] font-mono text-white/40">
                    {session.repoConnected ? session.repoInfo?.fullName : 'Connect your repository'}
                  </p>
                </div>
              </div>
              {session.repoConnected && (
                <button
                  onClick={disconnectRepo}
                  className="px-2 py-0.5 text-[9px] font-display uppercase border-2 border-[#E41937] hover:bg-[#E41937] hover:text-white transition-all"
                  style={{ color: '#E41937' }}
                >
                  DISCONNECT
                </button>
              )}
            </div>

            {!session.repoConnected && (
              <div className="px-5 py-5 space-y-4">
                {/* How it works */}
                <div className="p-4 border-2" style={{ borderColor: '#1f6feb', backgroundColor: 'rgba(31,111,235,0.08)' }}>
                  <p className="font-display text-sm mb-2" style={{ color: '#1f6feb' }}>HOW IT WORKS</p>
                  <ol className="space-y-2 text-sm font-mono text-white/70 list-decimal pl-4">
                    <li>Create a <strong style={{ color: '#F9D616' }}>Personal Access Token</strong> on GitHub with <code className="px-1 py-0.5 bg-white/10 text-xs">repo</code> scope</li>
                    <li>Paste your token and repository URL below</li>
                    <li>Click <strong style={{ color: '#1f6feb' }}>Connect Repo</strong> — all 5 agents get read-only access</li>
                    <li>Agents can now see your README, issues, PRs, and file structure</li>
                  </ol>
                  <details className="mt-3" open>
                    <summary className="text-xs font-mono cursor-pointer hover:text-white/70" style={{ color: '#1f6feb' }}>
                      How to create a Personal Access Token
                    </summary>
                    <ol className="mt-2 space-y-1.5 pl-4 text-xs font-mono text-white/50 list-decimal">
                      <li>Go to <strong>GitHub.com</strong> &gt; click your avatar &gt; <strong>Settings</strong></li>
                      <li>Scroll down to <strong>Developer settings</strong> &gt; <strong>Personal access tokens</strong> &gt; <strong>Tokens (classic)</strong></li>
                      <li>Click <strong>"Generate new token (classic)"</strong></li>
                      <li>Give it a name like <strong>"Buddies"</strong></li>
                      <li>Select scope: <strong>repo</strong> (full control of private repositories)</li>
                      <li>Click <strong>Generate token</strong> and copy it</li>
                    </ol>
                  </details>
                </div>

                {/* PAT input */}
                <div>
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-white/40 block mb-1.5">
                    PERSONAL ACCESS TOKEN
                  </label>
                  <div className="flex gap-2">
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={session.githubToken}
                      onChange={(e) => setGithubToken(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="flex-1 px-3 py-2 text-sm font-mono border-2 border-white/15 bg-black/30 text-white placeholder-white/20 focus:outline-none focus:border-[#1f6feb] rounded"
                    />
                    <button
                      onClick={() => setShowToken(!showToken)}
                      className="px-3 text-xs font-mono font-bold border-2 border-white/15 text-white/40 hover:text-white hover:border-white/30 transition-colors"
                    >
                      {showToken ? 'HIDE' : 'SHOW'}
                    </button>
                  </div>
                </div>

                {/* Repo URL input */}
                <div>
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-white/40 block mb-1.5">
                    REPOSITORY URL
                  </label>
                  <input
                    type="text"
                    value={session.repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/owner/repo"
                    className="w-full px-3 py-2 text-sm font-mono border-2 border-white/15 bg-black/30 text-white placeholder-white/20 focus:outline-none focus:border-[#1f6feb] rounded"
                  />
                </div>

                {/* Error */}
                {session.error && (
                  <p className="text-sm font-mono" style={{ color: '#E41937' }}>{session.error}</p>
                )}

                {/* Connect button */}
                <button
                  onClick={connectRepo}
                  disabled={session.loading || !session.githubToken || !session.repoUrl}
                  className="w-full py-3 font-display text-base uppercase border-2 border-[--color-ink] shadow-[3px_3px_0px_var(--color-ink)] hover:shadow-[1px_1px_0px_var(--color-ink)] hover:translate-x-[2px] hover:translate-y-[2px] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  style={{ backgroundColor: '#1f6feb', color: 'white' }}
                >
                  {session.loading ? 'CONNECTING...' : 'CONNECT REPO'}
                </button>
              </div>
            )}
          </div>

          {/* Connected: Repo Overview */}
          {session.repoConnected && session.repoInfo && (
            <>
              {/* Repo Info Card */}
              <div className="border-2 border-[--color-ink] shadow-[3px_3px_0px_var(--color-ink)] overflow-hidden" style={{ backgroundColor: '#1a1d27' }}>
                <div className="px-4 py-2 border-b-2 border-[--color-ink]" style={{ backgroundColor: '#0a0a0a' }}>
                  <span className="font-display text-sm" style={{ color: '#F9D616' }}>REPO OVERVIEW</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-sm font-display text-white">{session.repoInfo.fullName}</span>
                    {session.repoInfo.isPrivate && (
                      <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 border" style={{ borderColor: '#F9D616', color: '#F9D616' }}>PRIVATE</span>
                    )}
                    <span className="text-[10px] font-mono text-white/40">{session.repoInfo.language}</span>
                    <span className="text-[10px] font-mono text-white/40">{session.repoInfo.stars} stars</span>
                    <span className="text-[10px] font-mono text-white/40">Last push: {timeAgo(session.repoInfo.lastPush)}</span>
                  </div>
                  {session.repoInfo.description && (
                    <p className="text-[11px] font-mono text-white/60">{session.repoInfo.description}</p>
                  )}
                </div>
              </div>

              {/* Branches */}
              {session.branches.length > 0 && (
                <div className="border-2 border-[--color-ink] shadow-[3px_3px_0px_var(--color-ink)] overflow-hidden" style={{ backgroundColor: '#1a1d27' }}>
                  <div className="px-4 py-2 border-b-2 border-[--color-ink]" style={{ backgroundColor: '#0a0a0a' }}>
                    <span className="font-display text-sm" style={{ color: '#22c55e' }}>BRANCHES</span>
                    <span className="text-xs font-mono text-white/30 ml-2">{session.branches.length}</span>
                  </div>
                  <div className="p-3 flex flex-wrap gap-2">
                    {session.branches.map((b) => {
                      const isActive = session.activeBranch
                        ? session.activeBranch === b.name
                        : b.isDefault;
                      return (
                        <button
                          key={b.name}
                          onClick={() => switchBranch(b.name)}
                          className="text-xs font-mono px-2.5 py-1 border-2 cursor-pointer hover:opacity-80 transition-all"
                          style={{
                            borderColor: isActive ? '#F9D616' : b.isDefault ? '#22c55e' : 'rgba(255,255,255,0.15)',
                            color: isActive ? '#F9D616' : b.isDefault ? '#22c55e' : 'rgba(255,255,255,0.6)',
                            backgroundColor: isActive ? 'rgba(249,214,22,0.15)' : b.isDefault ? 'rgba(34,197,94,0.05)' : 'transparent',
                            boxShadow: isActive ? '2px 2px 0px #0a0a0a' : 'none',
                          }}
                        >
                          {b.name}{b.isDefault ? ' (default)' : ''}{b.isProtected ? ' 🔒' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* File Tree */}
              {session.fileTree.length > 0 && (
                <div className="border-2 border-[--color-ink] shadow-[3px_3px_0px_var(--color-ink)] overflow-hidden" style={{ backgroundColor: '#1a1d27' }}>
                  <div className="px-4 py-2 border-b-2 border-[--color-ink]" style={{ backgroundColor: '#0a0a0a' }}>
                    <span className="font-display text-sm" style={{ color: '#2BB6B3' }}>FILE TREE</span>
                  </div>
                  <div className="p-3">
                    <FileTreeView entries={session.fileTree} depth={0} />
                  </div>
                </div>
              )}

              {/* Two column: Issues + PRs */}
              <div className="grid grid-cols-2 gap-4">
                {/* Open Issues */}
                <div className="border-2 border-[--color-ink] shadow-[3px_3px_0px_var(--color-ink)] overflow-hidden" style={{ backgroundColor: '#1a1d27' }}>
                  <div className="px-4 py-2 border-b-2 border-[--color-ink]" style={{ backgroundColor: '#0a0a0a' }}>
                    <span className="font-display text-sm" style={{ color: '#E41937' }}>OPEN ISSUES</span>
                    <span className="text-[9px] font-mono text-white/30 ml-2">{session.issues.length}</span>
                  </div>
                  <div className="p-2 space-y-1 max-h-60 overflow-y-auto">
                    {session.issues.length === 0 && (
                      <p className="text-[10px] font-mono text-white/20 text-center py-4">No open issues</p>
                    )}
                    {session.issues.map((issue) => (
                      <div key={issue.number} className="px-2 py-1.5 border border-white/5 hover:border-white/15 transition-colors">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[9px] font-mono text-white/30">#{issue.number}</span>
                          <span className="text-[11px] font-mono text-white/80">{issue.title}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {issue.labels.map((l) => (
                            <span key={l} className="text-[8px] font-mono px-1 py-0.5 border border-white/15 text-white/40">{l}</span>
                          ))}
                          <span className="text-[8px] font-mono text-white/20 ml-auto">{timeAgo(issue.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent PRs */}
                <div className="border-2 border-[--color-ink] shadow-[3px_3px_0px_var(--color-ink)] overflow-hidden" style={{ backgroundColor: '#1a1d27' }}>
                  <div className="px-4 py-2 border-b-2 border-[--color-ink]" style={{ backgroundColor: '#0a0a0a' }}>
                    <span className="font-display text-sm" style={{ color: '#a855f7' }}>PULL REQUESTS</span>
                    <span className="text-[9px] font-mono text-white/30 ml-2">{session.pullRequests.length}</span>
                  </div>
                  <div className="p-2 space-y-1 max-h-60 overflow-y-auto">
                    {session.pullRequests.length === 0 && (
                      <p className="text-[10px] font-mono text-white/20 text-center py-4">No pull requests</p>
                    )}
                    {session.pullRequests.map((pr) => (
                      <div key={pr.number} className="px-2 py-1.5 border border-white/5 hover:border-white/15 transition-colors">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[9px] font-mono text-white/30">#{pr.number}</span>
                          <span className="text-[11px] font-mono text-white/80">{pr.title}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[8px] font-mono px-1 py-0.5 border" style={{
                            borderColor: pr.state === 'open' ? '#22c55e' : '#a855f7',
                            color: pr.state === 'open' ? '#22c55e' : '#a855f7',
                          }}>
                            {pr.draft ? 'DRAFT' : pr.state.toUpperCase()}
                          </span>
                          <span className="text-[8px] font-mono text-white/20">by {pr.author}</span>
                          <span className="text-[8px] font-mono text-white/20 ml-auto">{timeAgo(pr.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* README Preview */}
              {session.readme && (
                <div className="border-2 border-[--color-ink] shadow-[3px_3px_0px_var(--color-ink)] overflow-hidden" style={{ backgroundColor: '#1a1d27' }}>
                  <div className="px-4 py-2 border-b-2 border-[--color-ink]" style={{ backgroundColor: '#0a0a0a' }}>
                    <span className="font-display text-sm text-white">README.md</span>
                  </div>
                  <div className="p-4 max-h-80 overflow-y-auto">
                    <pre className="text-[11px] font-mono text-white/60 whitespace-pre-wrap">{session.readme}</pre>
                  </div>
                </div>
              )}

              {/* Agent Access */}
              <div className="border-2 border-[--color-ink] shadow-[3px_3px_0px_var(--color-ink)] overflow-hidden" style={{ backgroundColor: '#1a1d27' }}>
                <div className="px-4 py-2 border-b-2 border-[--color-ink]" style={{ backgroundColor: '#0a0a0a' }}>
                  <span className="font-display text-sm" style={{ color: '#F9D616' }}>AGENT ACCESS</span>
                  <span className="text-[9px] font-mono text-white/30 ml-2">read-only</span>
                </div>
                <div className="p-3 space-y-2">
                  {AGENT_NAMES.map((name) => {
                    const access = agentAccess[name] || 'read';
                    return (
                      <div
                        key={name}
                        className="flex items-center justify-between px-3 py-2 border-2 border-[--color-ink]"
                        style={{ borderLeftWidth: '4px', borderLeftColor: getAgentColor(name) }}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 border-2 border-[--color-ink] flex items-center justify-center text-[10px] font-display"
                            style={{ backgroundColor: getAgentColor(name), color: '#0a0a0a' }}
                          >
                            {name[0]}
                          </div>
                          <span className="text-xs font-display text-white tracking-wider">{name.toUpperCase()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setAgentAccess({ ...agentAccess, [name]: 'read' })}
                            className="text-[10px] font-mono font-bold px-2 py-0.5 border-2 transition-all"
                            style={{
                              borderColor: access === 'read' ? '#22c55e' : 'rgba(255,255,255,0.15)',
                              color: access === 'read' ? '#0a0a0a' : 'rgba(255,255,255,0.4)',
                              backgroundColor: access === 'read' ? '#22c55e' : 'transparent',
                            }}
                          >
                            READ
                          </button>
                          <button
                            onClick={() => setAgentAccess({ ...agentAccess, [name]: 'write' })}
                            className="text-[10px] font-mono font-bold px-2 py-0.5 border-2 transition-all"
                            style={{
                              borderColor: access === 'write' ? '#F9D616' : 'rgba(255,255,255,0.15)',
                              color: access === 'write' ? '#0a0a0a' : 'rgba(255,255,255,0.4)',
                              backgroundColor: access === 'write' ? '#F9D616' : 'transparent',
                            }}
                          >
                            WRITE
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-[10px] font-mono text-white/30 mt-1">
                    Write access allows agents to create issues, PRs, and commit changes when you explicitly ask them to.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Expandable File Tree ──

function FileTreeView({ entries, depth }: { entries: FileEntry[]; depth: number }) {
  return (
    <div style={{ paddingLeft: depth > 0 ? 16 : 0 }}>
      {entries.map((entry) => (
        <FileTreeItem key={entry.path} entry={entry} depth={depth} />
      ))}
    </div>
  );
}

function FileTreeItem({ entry, depth }: { entry: FileEntry; depth: number }) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileContent, setFileContent] = useState<string | null>(null);

  const handleClick = async () => {
    if (entry.type === 'dir') {
      if (expanded) {
        setExpanded(false);
        return;
      }
      if (children.length === 0) {
        setLoading(true);
        const entries = await fetchDirectory(entry.path);
        setChildren(entries);
        setLoading(false);
      }
      setExpanded(true);
    } else {
      // Toggle file content preview
      if (fileContent !== null) {
        setFileContent(null);
        return;
      }
      if (entry.size && entry.size > 100000) return; // Skip large files
      setLoading(true);
      const content = await fetchFileContent(entry.path);
      setFileContent(content.slice(0, 2000)); // First 2000 chars
      setLoading(false);
    }
  };

  const icon = entry.type === 'dir' ? (expanded ? '📂' : '📁') : '📄';

  return (
    <div>
      <div
        onClick={handleClick}
        className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-white/5 transition-colors rounded"
      >
        <span className="text-sm">{icon}</span>
        <span className="text-xs font-mono" style={{ color: entry.type === 'dir' ? '#2BB6B3' : 'rgba(255,255,255,0.6)' }}>
          {entry.name}
        </span>
        {entry.type === 'file' && entry.size && (
          <span className="text-[9px] font-mono text-white/20 ml-auto">
            {entry.size > 1024 ? `${(entry.size / 1024).toFixed(1)}KB` : `${entry.size}B`}
          </span>
        )}
        {loading && <span className="text-[9px] font-mono text-white/30 ml-auto">loading...</span>}
      </div>

      {/* Directory children */}
      {expanded && children.length > 0 && (
        <FileTreeView entries={children} depth={depth + 1} />
      )}

      {/* File content preview */}
      {fileContent !== null && (
        <div className="ml-6 mt-1 mb-2 p-2 border border-white/10 rounded max-h-48 overflow-y-auto" style={{ backgroundColor: '#0d1117' }}>
          <pre className="text-[10px] font-mono text-white/50 whitespace-pre-wrap">{fileContent}</pre>
        </div>
      )}
    </div>
  );
}
