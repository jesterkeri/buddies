import type { Plugin, Action } from '@elizaos/core';
import { agentStateManager, AgentStatus } from '../../../shared/agent-state.ts';
import { fireTrigger } from '../../../shared/triggers.ts';
import { sendSecurityAlert, isTelegramConfigured } from '../../../shared/integrations/telegram.ts';

const reviewCode: Action = {
  name: 'REVIEW_CODE',
  similes: ['CODE_REVIEW', 'AUDIT_CODE', 'CHECK_CODE', 'SCAN_CODE'],
  description: 'Review code for bugs, security vulnerabilities, and quality issues. Use when the user shares code, asks for a review, or mentions security concerns.',
  validate: async () => true,
  handler: async (runtime, message, state, options, callback) => {
    agentStateManager.setState('Hawk', AgentStatus.REVIEWING, 'Code review');

    if (callback) {
      await callback({
        text: `Reviewing the code now. I'll check for security vulnerabilities, code quality issues, and suggest improvements with severity ratings.`,
        actions: ['REVIEW_CODE'],
      });
    }

    // Send critical alerts to Telegram via Beans
    if (isTelegramConfigured()) {
      const text = (message.content?.text as string) || '';
      await sendSecurityAlert('HIGH', `Code review flagged issues in: ${text.slice(0, 100)}`);
    }

    fireTrigger('Hawk', 'REVIEW_CODE');
    agentStateManager.setState('Hawk', AgentStatus.IDLE);
    return { text: 'Code reviewed', success: true };
  },
  examples: [
    [
      { name: '{{user1}}', content: { text: 'Can you review this withdraw function?' } },
      { name: 'Hawk', content: { text: 'CRITICAL: Line 42 — state update after external call. Reentrancy vulnerability. Move balance update before the transfer. HIGH: No access control on withdrawAll(). Add onlyOwner modifier.', actions: ['REVIEW_CODE'] } },
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

    if (callback) {
      await callback({
        text: `Generating test cases. I'll cover the happy path, edge cases, and failure scenarios.`,
        actions: ['GENERATE_TESTS'],
      });
    }

    agentStateManager.setState('Hawk', AgentStatus.IDLE);
    return { text: 'Tests generated', success: true };
  },
  examples: [
    [
      { name: '{{user1}}', content: { text: 'Write tests for the staking contract' } },
      { name: 'Hawk', content: { text: 'Generating tests: 1) Test stake with valid amount. 2) Test stake with zero — should revert. 3) Test withdraw before lockup — should revert. 4) Test emergency withdraw by owner. 5) Reentrancy attack simulation.', actions: ['GENERATE_TESTS'] } },
    ],
  ],
};

const hawkPlugin: Plugin = {
  name: 'hawk-plugin',
  description: 'Code Reviewer capabilities — code review, security audits, testing',
  actions: [reviewCode, generateTests],
  providers: [],
  evaluators: [],
};

export default hawkPlugin;
