import type { Plugin, Action } from '@elizaos/core';
import { agentStateManager, AgentStatus } from '../../../shared/agent-state.ts';
import { fireTrigger } from '../../../shared/triggers.ts';
import { researchContextProvider } from './providers/research-context.ts';
import { fetchWebPage, fetchJSON } from '../../../shared/web-fetch.ts';

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
      { name: 'Radar', content: { text: 'I will fetch and summarize relevant sources. Paste a URL for me to analyze, or describe what you need researched.', actions: ['RESEARCH_TOPIC'] } },
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

    // Try to fetch package.json from connected repo
    const { fetchFile } = await import('../../../shared/github-service.ts');
    const pkgJson = await fetchFile('package.json');

    let deps: Record<string, string> = {};
    if (pkgJson) {
      try {
        const parsed = JSON.parse(pkgJson);
        deps = { ...parsed.dependencies, ...parsed.devDependencies };
      } catch {}
    }

    // Also extract package names from user message
    const mentioned = text.match(/(?:@[\w-]+\/)?[\w-]+/g)?.filter((w) =>
      !['check', 'dependencies', 'deps', 'update', 'scan', 'the', 'my', 'our', 'for', 'any', 'are', 'there', 'on', 'and', 'of'].includes(w.toLowerCase())
    ) || [];

    // Combine repo deps + mentioned packages
    const packagesToCheck = Object.keys(deps).length > 0
      ? Object.entries(deps).slice(0, 15)
      : mentioned.slice(0, 10).map((n) => [n, 'unknown']);

    let depInfo = '';
    let breakingChanges: string[] = [];

    for (const [pkg, currentVer] of packagesToCheck) {
      try {
        const data = await fetchJSON(`https://registry.npmjs.org/${encodeURIComponent(pkg)}`);
        if (!data) continue;
        const latest = data['dist-tags']?.latest;
        if (!latest) continue;

        const currentMajor = String(currentVer).replace(/[\^~>=<]/g, '').split('.')[0];
        const latestMajor = latest.split('.')[0];
        const isBreaking = currentMajor !== 'unknown' && currentMajor !== latestMajor;

        let line = `- **${pkg}** ${currentVer} → v${latest}`;
        if (isBreaking) {
          line += ` ⚠️ BREAKING (major bump ${currentMajor} → ${latestMajor})`;
          breakingChanges.push(pkg);
        }
        depInfo += line + '\n';
      } catch {}
    }

    // Fetch changelogs for breaking changes
    let migrationInfo = '';
    for (const pkg of breakingChanges.slice(0, 3)) {
      const changelog = await fetchWebPage(`https://github.com/search?q=${encodeURIComponent(pkg)}+changelog&type=repositories`);
      if (changelog) {
        migrationInfo += `\n### ${pkg} migration notes:\n${changelog.slice(0, 500)}\n`;
      }
    }

    const response = depInfo
      ? `Dependency scan (${packagesToCheck.length} packages):\n\n${depInfo}${breakingChanges.length > 0 ? `\n⚠️ **${breakingChanges.length} breaking changes detected!**${migrationInfo}` : '\n✅ No breaking changes detected.'}`
      : `Connect a GitHub repo in the Session tab so I can read your package.json, or list specific packages to check.`;

    if (callback) {
      await callback({
        text: response,
        actions: ['CHECK_DEPENDENCIES'],
      });
    }

    fireTrigger('Radar', 'CHECK_DEPENDENCIES');
    agentStateManager.setState('Radar', AgentStatus.IDLE);
    return { text: `Checked ${packagesToCheck.length} deps, ${breakingChanges.length} breaking`, success: true };
  },
  examples: [
    [
      { name: '{{user1}}', content: { text: 'Any updates on our dependencies?' } },
      { name: 'Radar', content: { text: 'Scanning dependencies from the connected repo. I will check npm for updates and flag breaking changes.', actions: ['CHECK_DEPENDENCIES'] } },
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
