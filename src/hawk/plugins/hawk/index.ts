import type { Plugin, Action } from '@elizaos/core';
import { agentStateManager, AgentStatus } from '../../../shared/agent-state.ts';
import { fireTrigger } from '../../../shared/triggers.ts';
import { sendSecurityAlert, isTelegramConfigured } from '../../../shared/integrations/telegram.ts';
import { codeContextProvider } from './providers/code-context.ts';
import { fetchFile, getRepoContext, fetchCommitDiff, fetchPRFiles, fetchCommits } from '../../../shared/github-service.ts';
import { securityAudit } from './actions/security-audit.ts';

const reviewCode: Action = {
  name: 'REVIEW_CODE',
  similes: ['CODE_REVIEW', 'AUDIT_CODE', 'CHECK_CODE', 'SCAN_CODE'],
  description: 'Review code for bugs, security vulnerabilities, and quality issues. Use when the user shares code, asks for a review, or mentions security concerns.',
  validate: async () => true,
  handler: async (runtime, message, state, options, callback) => {
    agentStateManager.setState('Hawk', AgentStatus.REVIEWING, 'Code review');

    const text = (message.content?.text as string) || '';
    let codeContext = '';
    let reviewType = 'file';

    // 1. Check for PR number (#123)
    const prMatch = text.match(/#(\d+)/);
    if (prMatch) {
      const prNumber = parseInt(prMatch[1]);
      const files = await fetchPRFiles(prNumber);
      if (files.length > 0) {
        reviewType = 'pr';
        const fileSummary = files.map((f) =>
          `${f.status === 'added' ? '+' : f.status === 'removed' ? '-' : '~'} ${f.filename} (+${f.additions} -${f.deletions})`
        ).join('\n');
        const patches = files
          .filter((f) => f.patch)
          .slice(0, 5)
          .map((f) => `### ${f.filename}\n\`\`\`diff\n${f.patch}\n\`\`\``)
          .join('\n\n');
        codeContext = `## PR #${prNumber} — ${files.length} files changed\n\n${fileSummary}\n\n${patches}`;
      }
    }

    // 2. Check for commit SHA (40-char hex or 7-char short)
    if (!codeContext) {
      const shaMatch = text.match(/\b([0-9a-f]{7,40})\b/);
      if (shaMatch) {
        const diff = await fetchCommitDiff(shaMatch[1]);
        if (diff) {
          reviewType = 'commit';
          codeContext = `## Commit ${shaMatch[1].slice(0, 7)} diff\n\n\`\`\`diff\n${diff}\n\`\`\``;
        }
      }
    }

    // 3. Check for "latest" or "recent" — fetch latest commit diff
    if (!codeContext && /latest|recent|last commit|new changes/i.test(text)) {
      const commits = await fetchCommits(1);
      if (commits.length > 0) {
        const diff = await fetchCommitDiff(commits[0].sha);
        if (diff) {
          reviewType = 'commit';
          codeContext = `## Latest commit: "${commits[0].message}" by ${commits[0].author}\n\n\`\`\`diff\n${diff}\n\`\`\``;
        }
      }
    }

    // 4. Check for file paths
    if (!codeContext) {
      const filePatterns = text.match(/[`"']([^`"']+\.[a-z]{1,4})[`"']/gi) || [];
      const filePaths = filePatterns.map((f) => f.replace(/[`"']/g, ''));
      for (const path of filePaths.slice(0, 3)) {
        const content = await fetchFile(path);
        if (content) {
          codeContext += `\n### File: ${path}\n\`\`\`\n${content.slice(0, 2000)}\n\`\`\`\n`;
        }
      }
    }

    // 5. Fallback to repo overview
    if (!codeContext) {
      const repoCtx = await getRepoContext();
      if (repoCtx) codeContext = repoCtx;
    }

    const reviewPrompt = codeContext
      ? `Reviewing ${reviewType === 'pr' ? 'pull request' : reviewType === 'commit' ? 'commit' : 'code'} from the connected repository:\n\n${codeContext}\n\nAnalyzing for: security vulnerabilities, code quality issues, potential bugs, and best practice violations. Rating each finding: CRITICAL / HIGH / MEDIUM / LOW.`
      : `I need code to review. Either:\n1. Connect a GitHub repo in the Session tab\n2. Mention a PR like \`#123\`\n3. Say "review latest commit"\n4. Paste code directly`;

    if (callback) {
      await callback({
        text: reviewPrompt,
        actions: ['REVIEW_CODE'],
      });
    }

    if (isTelegramConfigured() && codeContext) {
      await sendSecurityAlert('MEDIUM', `Code review (${reviewType}): ${text.slice(0, 100)}`);
    }

    fireTrigger('Hawk', 'REVIEW_CODE');
    agentStateManager.setState('Hawk', AgentStatus.IDLE);
    return { text: 'Code reviewed', success: true };
  },
  examples: [
    [
      { name: '{{user1}}', content: { text: 'Can you review this withdraw function?' } },
      { name: 'Hawk', content: { text: 'Reviewing the code from the connected repo. I will check for vulnerabilities and rate each finding by severity.', actions: ['REVIEW_CODE'] } },
    ],
  ],
};

const generateTests: Action = {
  name: 'GENERATE_TESTS',
  similes: ['WRITE_TESTS', 'CREATE_TESTS', 'TEST_COVERAGE'],
  description: 'Generate unit tests for code. Use when the user asks for tests or test coverage.',
  validate: async () => true,
  handler: async (runtime, message, state, options, callback) => {
    agentStateManager.setState('Hawk', AgentStatus.WORKING, 'Generating tests');

    const text = (message.content?.text as string) || '';

    // Try to fetch the file to generate tests for
    const filePatterns = text.match(/[`"']([^`"']+\.[a-z]{1,4})[`"']/gi) || [];
    const filePaths = filePatterns.map((f) => f.replace(/[`"']/g, ''));

    let codeContext = '';
    for (const path of filePaths.slice(0, 2)) {
      const content = await fetchFile(path);
      if (content) codeContext += `\n### ${path}\n\`\`\`\n${content.slice(0, 2000)}\n\`\`\`\n`;
    }

    if (!codeContext) {
      const repo = await getRepoContext();
      if (repo) codeContext = repo;
    }

    const response = codeContext
      ? `Generating tests for:\n${codeContext}\n\nI'll create test cases covering happy path, edge cases, and failure scenarios based on this actual code.`
      : `I need code to generate tests for. Either:\n1. Connect a GitHub repo in the Session tab\n2. Paste the code directly\n3. Mention the file path like \`src/auth.ts\``;

    if (callback) {
      await callback({
        text: response,
        actions: ['GENERATE_TESTS'],
      });
    }

    agentStateManager.setState('Hawk', AgentStatus.IDLE);
    return { text: 'Tests generated', success: true };
  },
  examples: [
    [
      { name: '{{user1}}', content: { text: 'Write tests for the staking contract' } },
      { name: 'Hawk', content: { text: 'I will generate test cases covering happy path, edge cases, and failure scenarios for the code you provide.', actions: ['GENERATE_TESTS'] } },
    ],
  ],
};

const hawkPlugin: Plugin = {
  name: 'hawk-plugin',
  description: 'Code Reviewer capabilities — code review with real repo access, security audits, testing',
  actions: [reviewCode, generateTests, securityAudit],
  providers: [codeContextProvider],
  evaluators: [],
};

export default hawkPlugin;
