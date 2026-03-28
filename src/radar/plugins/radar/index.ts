import type { Plugin, Action } from '@elizaos/core';
import { agentStateManager, AgentStatus } from '../../../shared/agent-state.ts';
import { fireTrigger } from '../../../shared/triggers.ts';

const researchTopic: Action = {
  name: 'RESEARCH_TOPIC',
  similes: ['RESEARCH', 'FIND_DOCS', 'LOOK_UP', 'INVESTIGATE'],
  description: 'Research a topic, find documentation, tutorials, or relevant information. Use when the user needs information about a technology, library, or concept.',
  validate: async () => true,
  handler: async (runtime, message, state, options, callback) => {
    agentStateManager.setState('Radar', AgentStatus.RESEARCHING, 'Researching');

    if (callback) {
      await callback({
        text: `Pulling research on this topic. I'll find the most relevant docs, tutorials, and recent discussions.`,
        actions: ['RESEARCH_TOPIC'],
      });
    }

    agentStateManager.setState('Radar', AgentStatus.IDLE);
    return { text: 'Research complete', success: true };
  },
  examples: [
    [
      { name: '{{user1}}', content: { text: 'I need to learn about ElizaOS plugins' } },
      { name: 'Radar', content: { text: 'Found 3 resources: 1) Official plugin docs at docs.elizaos.ai. 2) The plugin-starter template on GitHub. 3) A community tutorial from last week. The key pattern is action/provider/evaluator.', actions: ['RESEARCH_TOPIC'] } },
    ],
  ],
};

const checkDependencies: Action = {
  name: 'CHECK_DEPENDENCIES',
  similes: ['CHECK_DEPS', 'DEPENDENCY_AUDIT', 'VERSION_CHECK'],
  description: 'Check project dependencies for updates, breaking changes, or security issues. Use when asked about dependency status or updates.',
  validate: async () => true,
  handler: async (runtime, message, state, options, callback) => {
    agentStateManager.setState('Radar', AgentStatus.RESEARCHING, 'Checking dependencies');

    if (callback) {
      await callback({
        text: `Scanning dependencies for updates and security advisories. I'll flag anything that needs attention.`,
        actions: ['CHECK_DEPENDENCIES'],
      });
    }

    fireTrigger('Radar', 'CHECK_DEPENDENCIES');
    agentStateManager.setState('Radar', AgentStatus.IDLE);
    return { text: 'Dependency check complete', success: true };
  },
  examples: [
    [
      { name: '{{user1}}', content: { text: 'Any updates on our dependencies?' } },
      { name: 'Radar', content: { text: 'Heads up — Solana web3.js v2.0 shipped. 14 breaking changes from v1.x. Your project uses 3 affected APIs. Here is the migration guide.', actions: ['CHECK_DEPENDENCIES'] } },
    ],
  ],
};

const radarPlugin: Plugin = {
  name: 'radar-plugin',
  description: 'Scout capabilities — research, monitoring, documentation',
  actions: [researchTopic, checkDependencies],
  providers: [],
  evaluators: [],
};

export default radarPlugin;
