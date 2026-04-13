import type { Action } from '@elizaos/core';
import { agentStateManager, AgentStatus } from '../../../../shared/agent-state.ts';
import { readTasks } from '../../../../shared/task-provider.ts';

/**
 * Chief drafts a PR description from the user's message context.
 * Extracts change description, pulls in relevant task context, and structures
 * a PR description with summary, motivation, testing notes, and breaking changes.
 */
export const draftPR: Action = {
  name: 'DRAFT_PR',
  similes: ['PR_DESCRIPTION', 'PULL_REQUEST', 'WRITE_PR'],
  description: 'Draft a pull request description from a diff, commit messages, or change description. Use when the user asks to write a PR, draft a PR description, or summarize changes for review.',
  validate: async () => true,
  handler: async (runtime, message, state, options, callback) => {
    agentStateManager.setState('Chief', AgentStatus.WORKING, 'Drafting PR description');

    const userText = (message.content?.text as string) || '';

    // Gather related task context
    const tasks = readTasks();
    const recentDone = tasks
      .filter((t) => t.status === 'done' || t.status === 'review')
      .slice(-5)
      .map((t) => `- [${t.priority}] ${t.title}`)
      .join('\n');

    const inProgress = tasks
      .filter((t) => t.status === 'in_progress')
      .map((t) => `- ${t.title} (${t.assignee || 'unassigned'})`)
      .join('\n');

    // Build structured PR description from user input + task context
    const sections: string[] = [];

    sections.push(`## Summary\n${userText || 'Changes described in conversation context.'}`);

    if (recentDone) {
      sections.push(`## Related Tasks (Completed/In Review)\n${recentDone}`);
    }

    if (inProgress) {
      sections.push(`## In Progress (not included)\n${inProgress}`);
    }

    sections.push(`## Testing Notes\n- [ ] Verify the changes work as described\n- [ ] Check for regressions in related features\n- [ ] Run \`bun test\` to confirm all tests pass`);

    sections.push(`## Breaking Changes\nNone identified. Review the diff for any API or schema changes.`);

    const prDescription = sections.join('\n\n');

    if (callback) {
      await callback({
        text: `Here's your PR description:\n\n${prDescription}`,
        actions: ['DRAFT_PR'],
      });
    }

    agentStateManager.setState('Chief', AgentStatus.IDLE);
    return { text: 'PR description drafted from context', success: true };
  },
  examples: [
    [
      { name: '{{user1}}', content: { text: 'Write a PR description for the auth changes' } },
      { name: 'Chief', content: { text: 'I will draft a structured PR description based on the auth changes and related task context.', actions: ['DRAFT_PR'] } },
    ],
  ],
};
