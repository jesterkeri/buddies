/**
 * Lightweight message classifier — determines if a message needs full context
 * or can be answered with minimal context (casual chat).
 *
 * This prevents burning tokens on "hi" when the agent's providers would
 * otherwise pack 15K+ tokens of bounty listings, repo context, etc.
 */

// Keywords that signal the user needs data/tools, not just a chat response
const TASK_KEYWORDS: Record<string, string[]> = {
  // Bounty Hunter / Tracker
  bounty: ['hackathon', 'bounty', 'bounties', 'grant', 'opportunity', 'opportunities', 'job', 'gig', 'freelance', 'competition', 'prize', 'earn', 'listing', 'scan', 'find work', 'find me'],
  // Hawk
  code: ['code', 'review', 'PR', 'pull request', 'commit', 'diff', 'security', 'audit', 'vulnerability', 'bug', 'test', 'solidity', 'contract'],
  // Radar
  research: ['research', 'dependency', 'CVE', 'docs', 'documentation', 'breaking change', 'migration', 'tutorial', 'update', 'changelog', 'readme'],
  // Chief
  tasks: ['task', 'tasks', 'priority', 'priorities', 'standup', 'sprint', 'deadline', 'plan', 'schedule', 'assign', 'delegate', 'meeting'],
  // Buddy / Beans
  places: ['food', 'restaurant', 'cafe', 'coffee', 'lunch', 'dinner', 'hotel', 'near me', 'nearby', 'location', 'recommend'],
  // Repo
  repo: ['repo', 'repository', 'github', 'issue', 'issues', 'branch', 'merge', 'file', 'codebase'],
};

/**
 * Returns true if the message is casual chat that doesn't need heavy context.
 * Returns false if the message likely needs provider data (tools, search, etc.)
 */
export function isCasualMessage(text: string): boolean {
  if (!text || text.length < 3) return true;

  const lower = text.toLowerCase();

  // Strip @mentions to analyze the actual content
  const cleaned = lower.replace(/@[\w\s]+/g, '').trim();

  // Very short messages after removing mentions are casual
  if (cleaned.length < 10) return true;

  // Check against all task keyword groups
  for (const keywords of Object.values(TASK_KEYWORDS)) {
    for (const kw of keywords) {
      if (cleaned.includes(kw)) return false;
    }
  }

  // Questions with "what", "how", "where", "find", "show", "give", "list" often need context
  if (/^(what|how|where|find|show|give|list|get|search|scan|check|review)\b/i.test(cleaned)) {
    return false;
  }

  // Default: casual
  return true;
}
