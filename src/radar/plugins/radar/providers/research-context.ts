import type { Provider, IAgentRuntime, Memory, State } from '@elizaos/core';
import { fetchWebPage } from '../../../../shared/web-fetch.ts';
import { isCasualMessage } from '../../../../shared/context-classifier.ts';

/**
 * Radar's research provider — fetches and summarizes URLs from the user's message.
 * Also checks npm registry for dependency info.
 */

const URL_PATTERN = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;

async function checkNpmPackage(packageName: string): Promise<string | null> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}`);
    if (!res.ok) return null;
    const data = await res.json();
    const latest = data['dist-tags']?.latest;
    const desc = data.description;
    const homepage = data.homepage;
    return `**${packageName}** v${latest} — ${desc}${homepage ? ` | ${homepage}` : ''}`;
  } catch {
    return null;
  }
}

export const researchContextProvider: Provider = {
  name: 'researchContext',
  description: 'Fetches URLs and npm package info from the user message for research',
  get: async (_runtime: IAgentRuntime, message: Memory, _state: State) => {
    const text = (message.content?.text as string) || '';
    if (isCasualMessage(text)) {
      return { text: '', values: { hasResearch: false }, data: { hasResearch: false } };
    }
    const sections: string[] = [];

    // Fetch any URLs in the message
    const urls = text.match(URL_PATTERN);
    if (urls) {
      for (const url of urls.slice(0, 3)) { // max 3 URLs
        const content = await fetchWebPage(url);
        if (content) {
          sections.push(`### Source: ${url}\n${content}`);
        }
      }
    }

    // Check for npm package names (word after "package" or "dependency")
    const npmPattern = /(?:package|dependency|dep|module)\s+[@\w/-]+/gi;
    const npmMatches = text.match(npmPattern);
    if (npmMatches) {
      for (const match of npmMatches.slice(0, 5)) {
        const pkgName = match.split(/\s+/).pop() || '';
        if (pkgName) {
          const info = await checkNpmPackage(pkgName);
          if (info) sections.push(`### npm: ${info}`);
        }
      }
    }

    if (sections.length === 0) {
      return {
        text: '',
        values: { hasResearch: false },
        data: { hasResearch: false },
      };
    }

    return {
      text: `# Research Context\n\n${sections.join('\n\n')}`,
      values: { hasResearch: true },
      data: { hasResearch: true },
    };
  },
};
