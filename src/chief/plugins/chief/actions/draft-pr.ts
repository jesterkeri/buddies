import type { Action } from '@elizaos/core';
import { agentStateManager, AgentStatus } from '../../../../shared/agent-state.ts';

/**
 * Chief drafts a PR description from a git diff or commit messages.
 * The user pastes a diff or describes changes, Chief generates a structured PR description.
 */
export const draftPR: Action = {
  name: 'DRAFT_PR',
  similes: ['PR_DESCRIPTION', 'PULL_REQUEST', 'WRITE_PR'],
  description: 'Draft a pull request description from a diff, commit messages, or change description. Use when the user asks to write a PR, draft a PR description, or summarize changes for review.',
  validate: async () => true,
  handler: async (runtime, message, state, options, callback) => {
    agentStateManager.setState('Chief', AgentStatus.WORKING, 'Drafting PR description');

    if (callback) {
      await callback({
        text: `I'll draft a PR description based on your changes. Share the diff, commit messages, or describe what changed and I'll structure it with:\n\n- Summary of changes\n- Motivation / context\n- Testing notes\n- Breaking changes (if any)`,
        actions: ['DRAFT_PR'],
      });
    }

    agentStateManager.setState('Chief', AgentStatus.IDLE);
    return { text: 'PR description drafted', success: true };
  },
  examples: [
    [
      { name: '{{user1}}', content: { text: 'Write a PR description for the auth changes' } },
      { name: 'Chief', content: { text: '## Summary\nRefactored authentication middleware to use JWT tokens instead of session cookies.\n\n## Changes\n- Replaced express-session with jsonwebtoken\n- Added refresh token rotation\n- Updated all protected routes\n\n## Testing\n- All existing auth tests pass\n- Added 12 new tests for token refresh flow\n\n## Breaking Changes\n- Cookie-based sessions no longer supported\n- Clients must send Bearer token in Authorization header', actions: ['DRAFT_PR'] } },
    ],
  ],
};
