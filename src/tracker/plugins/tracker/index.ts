import type { Plugin, Action } from '@elizaos/core';
import { agentStateManager, AgentStatus } from '../../../shared/agent-state.ts';

const scanOpportunities: Action = {
  name: 'SCAN_OPPORTUNITIES',
  similes: ['FIND_BOUNTIES', 'FIND_HACKATHONS', 'FIND_JOBS', 'FIND_GRANTS', 'OPPORTUNITY_SCAN'],
  description: 'Scan for hackathons, bug bounties, freelance gigs, grants, and job opportunities. Use when the user asks about opportunities or wants to find work.',
  validate: async () => true,
  handler: async (runtime, message, state, options, callback) => {
    agentStateManager.setState('Tracker', AgentStatus.SCANNING, 'Scanning opportunities');

    if (callback) {
      await callback({
        text: `Scanning platforms for opportunities matching your skill profile. I'll return the top matches with skill overlap percentage, prize pool, and deadline.`,
        actions: ['SCAN_OPPORTUNITIES'],
      });
    }

    agentStateManager.setState('Tracker', AgentStatus.IDLE);
    return { text: 'Scan complete', success: true };
  },
  examples: [
    [
      { name: '{{user1}}', content: { text: 'Any good opportunities right now?' } },
      { name: 'Tracker', content: { text: '3 hits today: 1) Nosana ElizaOS Challenge — $3K pool, 20 days left, 95% skill match. 2) Immunefi audit bounty — DeFi lending, $5K, 90% match. 3) Contract role — Solana DeFi, $150/hr, 80% match.', actions: ['SCAN_OPPORTUNITIES'] } },
    ],
  ],
};

const evaluateOpportunity: Action = {
  name: 'EVALUATE_OPPORTUNITY',
  similes: ['ASSESS_BOUNTY', 'ANALYZE_OPPORTUNITY'],
  description: 'Evaluate a specific opportunity in detail — skill match, time commitment, competition level, and recommendation.',
  validate: async () => true,
  handler: async (runtime, message, state, options, callback) => {
    agentStateManager.setState('Tracker', AgentStatus.WORKING, 'Evaluating opportunity');

    if (callback) {
      await callback({
        text: `Analyzing this opportunity in detail. I'll break down the skill match, time commitment, competition level, and give my recommendation.`,
        actions: ['EVALUATE_OPPORTUNITY'],
      });
    }

    agentStateManager.setState('Tracker', AgentStatus.IDLE);
    return { text: 'Evaluation complete', success: true };
  },
  examples: [
    [
      { name: '{{user1}}', content: { text: 'Tell me more about the Nosana challenge' } },
      { name: 'Tracker', content: { text: '$3K prize pool, deadline April 14. Judged on: technical (25%), Nosana integration (25%), UX (25%), creativity (15%), docs (10%). Your product design background gives you an edge on UX. Strongly recommended.', actions: ['EVALUATE_OPPORTUNITY'] } },
    ],
  ],
};

const trackerPlugin: Plugin = {
  name: 'tracker-plugin',
  description: 'Bounty Hunter capabilities — opportunity scanning, skill matching',
  actions: [scanOpportunities, evaluateOpportunity],
  providers: [],
  evaluators: [],
};

export default trackerPlugin;
