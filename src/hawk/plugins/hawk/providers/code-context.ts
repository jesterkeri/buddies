import type { Provider, IAgentRuntime, Memory, State } from '@elizaos/core';
import { fetchFile, getRepoContext, fetchCommits, getOpenPRNumbers } from '../../../../shared/github-service.ts';
import { isCasualMessage } from '../../../../shared/context-classifier.ts';

/**
 * Hawk's code context provider — fetches relevant code files from the connected repo
 * based on what the user is asking about.
 */

const CODE_KEYWORDS = ['review', 'code', 'file', 'function', 'class', 'module', 'component', 'auth', 'api', 'route', 'handler', 'contract', 'test', 'security', 'vulnerability', 'bug'];

function extractFileHints(text: string): string[] {
  const hints: string[] = [];

  // Extract quoted file names
  const quoted = text.match(/[`"']([^`"']+\.[a-z]+)[`"']/gi);
  if (quoted) hints.push(...quoted.map((q) => q.replace(/[`"']/g, '')));

  // Extract file-like patterns (word.ext)
  const fileLike = text.match(/\b[\w/-]+\.\w{1,4}\b/g);
  if (fileLike) hints.push(...fileLike);

  return [...new Set(hints)];
}

export const codeContextProvider: Provider = {
  name: 'codeContext',
  description: 'Fetches relevant code files from the connected GitHub repo for code review',
  get: async (_runtime: IAgentRuntime, message: Memory, _state: State) => {
    const text = (message.content?.text as string) || '';
    const lower = text.toLowerCase();

    // Skip for casual messages and non-code messages
    if (isCasualMessage(text) || !CODE_KEYWORDS.some((k) => lower.includes(k))) {
      return {
        text: '',
        values: { hasCode: false },
        data: { hasCode: false },
      };
    }

    const sections: string[] = [];

    // Try to fetch specific files mentioned
    const fileHints = extractFileHints(text);
    for (const hint of fileHints.slice(0, 3)) { // max 3 files
      const content = await fetchFile(hint);
      if (content) {
        sections.push(`### File: ${hint}\n\`\`\`\n${content.slice(0, 2000)}\n\`\`\``);
      }
    }

    // Add recent commit activity
    try {
      const commits = await fetchCommits(5);
      if (commits.length > 0) {
        const commitList = commits.map((c) => `- \`${c.sha.slice(0, 7)}\` ${c.message.split('\n')[0]} (${c.author})`).join('\n');
        sections.push(`### Recent Commits\n${commitList}`);
      }
    } catch {}

    // Add open PR count
    try {
      const prs = await getOpenPRNumbers();
      if (prs.length > 0) {
        sections.push(`### Open PRs: ${prs.map((n) => `#${n}`).join(', ')}`);
      }
    } catch {}

    // If no specific files, get repo overview
    if (sections.length <= 2) { // Only has commits/PRs, no actual code
      const repoCtx = await getRepoContext();
      if (repoCtx) {
        sections.push(repoCtx);
      }
    }

    const contextText = sections.length > 0
      ? `# Code Context for Review\n\n${sections.join('\n\n')}`
      : 'No code context available. Ask the user to connect a GitHub repo in the Session tab, or paste code directly.';

    return {
      text: contextText,
      values: { hasCode: sections.length > 0 },
      data: { hasCode: sections.length > 0 },
    };
  },
};
