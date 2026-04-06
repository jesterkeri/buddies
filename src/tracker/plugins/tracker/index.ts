import type { Plugin, Action } from '@elizaos/core';
import { agentStateManager, AgentStatus } from '../../../shared/agent-state.ts';
import { fireTrigger } from '../../../shared/triggers.ts';
import { sendOpportunityAlert, isTelegramConfigured } from '../../../shared/integrations/telegram.ts';
import { bountyContextProvider } from './providers/bounty-context.ts';
import { fetchAllBounties, fetchCustomSource } from '../../../shared/bounty-service.ts';

const scanOpportunities: Action = {
  name: 'SCAN_OPPORTUNITIES',
  similes: ['FIND_BOUNTIES', 'FIND_HACKATHONS', 'FIND_JOBS', 'FIND_GRANTS', 'OPPORTUNITY_SCAN'],
  description: 'Scan for hackathons, bug bounties, freelance gigs, grants, and job opportunities. Use when the user asks about opportunities or wants to find work.',
  validate: async () => true,
  handler: async (runtime, message, state, options, callback) => {
    agentStateManager.setState('Bounty Hunter', AgentStatus.SCANNING, 'Scanning 10+ platforms');

    // Fetch real bounty data from all sources
    const listings = await fetchAllBounties();

    const summary = listings.length > 0
      ? listings.slice(0, 15).map((l, i) => {
          let line = `${i + 1}. **${l.title}** (${l.source})`;
          if (l.prize) line += ` — ${l.prize}`;
          if (l.deadline) line += ` | Deadline: ${l.deadline}`;
          if (l.url) line += `\n   ${l.url}`;
          return line;
        }).join('\n')
      : 'No active listings found at this time. Try again later or provide a specific URL to scan.';

    if (callback) {
      await callback({
        text: `Scanned ${listings.length} listings across Devpost, Devfolio, Superteam, Immunefi, and more:\n\n${summary}`,
        actions: ['SCAN_OPPORTUNITIES'],
      });
    }

    if (isTelegramConfigured() && listings.length > 0) {
      await sendOpportunityAlert(listings[0].title, listings[0].prize || 'TBD', listings[0].url || '');
    }

    fireTrigger('Bounty Hunter', 'SCAN_OPPORTUNITIES');
    agentStateManager.setState('Bounty Hunter', AgentStatus.IDLE);
    return { text: `Found ${listings.length} opportunities`, success: true };
  },
  examples: [
    [
      { name: '{{user1}}', content: { text: 'Any good opportunities right now?' } },
      { name: 'Bounty Hunter', content: { text: '3 hits today: 1) Nosana ElizaOS Challenge — $3K pool, 20 days left, 95% skill match. 2) Immunefi audit bounty — DeFi lending, $5K, 90% match. 3) Contract role — Solana DeFi, $150/hr, 80% match.', actions: ['SCAN_OPPORTUNITIES'] } },
    ],
  ],
};

const evaluateOpportunity: Action = {
  name: 'EVALUATE_OPPORTUNITY',
  similes: ['ASSESS_BOUNTY', 'ANALYZE_OPPORTUNITY'],
  description: 'Evaluate a specific opportunity in detail — skill match, time commitment, competition level, and recommendation.',
  validate: async () => true,
  handler: async (runtime, message, state, options, callback) => {
    agentStateManager.setState('Bounty Hunter', AgentStatus.WORKING, 'Evaluating opportunity');

    if (callback) {
      await callback({
        text: `Analyzing this opportunity in detail. I'll break down the skill match, time commitment, competition level, and give my recommendation.`,
        actions: ['EVALUATE_OPPORTUNITY'],
      });
    }

    agentStateManager.setState('Bounty Hunter', AgentStatus.IDLE);
    return { text: 'Evaluation complete', success: true };
  },
  examples: [
    [
      { name: '{{user1}}', content: { text: 'Tell me more about the Nosana challenge' } },
      { name: 'Bounty Hunter', content: { text: '$3K prize pool, deadline April 14. Judged on: technical (25%), Nosana integration (25%), UX (25%), creativity (15%), docs (10%). Your product design background gives you an edge on UX. Strongly recommended.', actions: ['EVALUATE_OPPORTUNITY'] } },
    ],
  ],
};

const draftApplication: Action = {
  name: 'DRAFT_APPLICATION',
  similes: ['WRITE_APPLICATION', 'APPLY', 'APPLICATION_TEMPLATE'],
  description: 'Draft an application or proposal for a specific bounty, hackathon, or grant opportunity.',
  validate: async () => true,
  handler: async (runtime, message, state, options, callback) => {
    agentStateManager.setState('Bounty Hunter', AgentStatus.WORKING, 'Drafting application');

    const text = (message.content?.text as string) || '';

    // Fetch the opportunity details if a URL is provided
    const urls = text.match(/https?:\/\/[^\s]+/g);
    let opportunityContext = '';
    if (urls && urls.length > 0) {
      const content = await fetchCustomSource(urls[0]);
      if (content) opportunityContext = `\n\nOpportunity details:\n${content}`;
    }

    if (callback) {
      await callback({
        text: `Drafting your application template. Here's a structured proposal you can customize:\n\n**1. Introduction** — Who you are and your relevant experience\n**2. Technical Approach** — How you'll solve the problem\n**3. Timeline** — Milestones and deliverables\n**4. Team** — Your skills and any collaborators\n**5. Budget** — How you'll use the prize/grant\n\nPaste the opportunity URL and I'll tailor it to the specific requirements.${opportunityContext}`,
        actions: ['DRAFT_APPLICATION'],
      });
    }

    agentStateManager.setState('Bounty Hunter', AgentStatus.IDLE);
    return { text: 'Application drafted', success: true };
  },
  examples: [
    [
      { name: '{{user1}}', content: { text: 'Draft an application for the Nosana hackathon' } },
      { name: 'Bounty Hunter', content: { text: 'Here\'s your application template for Nosana ElizaOS Challenge:\n\n**Project:** Buddies — Multi-agent productivity platform\n**Track:** ElizaOS Integration\n**Prize Target:** $3K\n\n**Technical Approach:** 5 specialized AI agents built on ElizaOS v2...', actions: ['DRAFT_APPLICATION'] } },
    ],
  ],
};

const trackerPlugin: Plugin = {
  name: 'tracker-plugin',
  description: 'Bounty Hunter capabilities — opportunity scanning, skill matching, application drafting, live data from 10+ sources',
  actions: [scanOpportunities, evaluateOpportunity, draftApplication],
  providers: [bountyContextProvider],
  evaluators: [],
};

export default trackerPlugin;
