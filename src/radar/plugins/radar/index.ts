import type { Plugin, Action } from '@elizaos/core';
import { agentStateManager, AgentStatus } from '../../../shared/agent-state.ts';
import { fireTrigger } from '../../../shared/triggers.ts';
import { researchContextProvider } from './providers/research-context.ts';
import { fetchWebPage } from '../../../shared/web-fetch.ts';

const researchTopic: Action = {
  name: 'RESEARCH_TOPIC',
  similes: ['RESEARCH', 'FIND_DOCS', 'LOOK_UP', 'INVESTIGATE'],
  description: 'Research a topic, find documentation, tutorials, or relevant information. Use when the user needs information about a technology, library, or concept.',
  validate: async () => true,
  handler: async (runtime, message, state, options, callback) => {
    agentStateManager.setState('Radar', AgentStatus.RESEARCHING, 'Researching');

    const text = (message.content?.text as string) || '';

    // Extract URLs from the message
    const urls = text.match(/https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi) || [];
    let researchContent = '';

    // Fetch any URLs the user provided
    for (const url of urls.slice(0, 3)) {
      const content = await fetchWebPage(url);
      if (content) {
        researchContent += `\n### Source: ${url}\n${content}\n`;
      }
    }

    const response = researchContent
      ? `Here's what I found:\n${researchContent}\n\nI've pulled the key content from ${urls.length} source(s). Let me know if you need me to dig deeper into any of these.`
      : `I'll research this topic for you. If you have specific URLs you'd like me to analyze, paste them and I'll extract the key information. Otherwise I'll use the context from our connected repo and project to provide relevant insights.`;

    if (callback) {
      await callback({
        text: response,
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

    const text = (message.content?.text as string) || '';

    // Extract package names from message
    const packageNames = text.match(/(?:@[\w-]+\/)?[\w-]+/g)?.filter((w) =>
      !['check', 'dependencies', 'deps', 'update', 'scan', 'the', 'my', 'our', 'for', 'any', 'are', 'there'].includes(w.toLowerCase())
    ) || [];

    let depInfo = '';
    for (const pkg of packageNames.slice(0, 5)) {
      try {
        const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkg)}`);
        if (res.ok) {
          const data = await res.json();
          const latest = data['dist-tags']?.latest;
          const desc = data.description || '';
          depInfo += `- **${pkg}** v${latest} — ${desc}\n`;
        }
      } catch {}
    }

    const response = depInfo
      ? `Dependency check results:\n\n${depInfo}\nI've checked the npm registry for the latest versions. Let me know if you want me to check for security advisories on any of these.`
      : `I'll scan your project dependencies for updates and security issues. Connect a GitHub repo in the Session tab so I can read your package.json, or list the packages you want me to check.`;

    if (callback) {
      await callback({
        text: response,
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
  description: 'Scout capabilities — web research, URL summarization, npm monitoring, documentation',
  actions: [researchTopic, checkDependencies],
  providers: [researchContextProvider],
  evaluators: [],
};

export default radarPlugin;
