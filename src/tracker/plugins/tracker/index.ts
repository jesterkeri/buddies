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

    // Read user skills from config for match scoring
    const { getSessionConfig } = await import('../../../shared/config-server.ts');
    let userSkills: string[] = [];
    try {
      const session = getSessionConfig();
      // Try to read onboarding profile from config
      const fs = await import('fs');
      const path = await import('path');
      const onboardingPath = path.join(process.cwd(), '.buddies-onboarding.json');
      if (fs.existsSync(onboardingPath)) {
        const profile = JSON.parse(fs.readFileSync(onboardingPath, 'utf-8'));
        userSkills = [
          ...(profile.languages || []),
          ...(profile.frameworks || []),
          ...(profile.chains || []),
        ].map((s: string) => s.toLowerCase());
      }
    } catch {}

    // Score listings by skill match
    function scoreMatch(listing: typeof listings[0]): number {
      if (userSkills.length === 0) return 0;
      const tags = (listing.tags || []).map((t) => t.toLowerCase());
      const titleWords = listing.title.toLowerCase().split(/\s+/);
      const allWords = [...tags, ...titleWords];
      const matches = userSkills.filter((s) => allWords.some((w) => w.includes(s) || s.includes(w)));
      return Math.min(100, Math.round((matches.length / userSkills.length) * 100));
    }

    // Sort by match score if user has skills
    const scored = listings.map((l) => ({ ...l, matchScore: scoreMatch(l) }));
    if (userSkills.length > 0) {
      scored.sort((a, b) => b.matchScore - a.matchScore);
    }

    const summary = scored.length > 0
      ? scored.slice(0, 15).map((l, i) => {
          let line = `${i + 1}. **${l.title}** (${l.source})`;
          if (l.matchScore > 0) line += ` — ${l.matchScore}% match`;
          if (l.prize) line += ` | ${l.prize}`;
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
      { name: 'Bounty Hunter', content: { text: 'Scanning Devpost, Devfolio, Superteam, Immunefi, and more for live opportunities. Results will show real listings with match scores.', actions: ['SCAN_OPPORTUNITIES'] } },
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

    const text = (message.content?.text as string) || '';

    // Extract URL from message
    const urls = text.match(/https?:\/\/[^\s]+/g);
    let opportunityDetails = '';

    if (urls && urls.length > 0) {
      const content = await fetchCustomSource(urls[0]);
      if (content) {
        opportunityDetails = `\n\nOpportunity details from ${urls[0]}:\n${content}`;
      } else {
        opportunityDetails = `\n\nFailed to fetch ${urls[0]} — the site may be blocking automated access.`;
      }
    }

    const response = opportunityDetails
      ? `Evaluating this opportunity:${opportunityDetails}\n\nI'll analyze the requirements, prize structure, and how it matches your skills.`
      : `Paste the opportunity URL and I'll fetch the real details — prize, deadline, requirements, and how it matches your skills. Without a URL, I can only work with what you describe.`;

    if (callback) {
      await callback({
        text: response,
        actions: ['EVALUATE_OPPORTUNITY'],
      });
    }

    agentStateManager.setState('Bounty Hunter', AgentStatus.IDLE);
    return { text: 'Evaluation complete', success: true };
  },
  examples: [
    [
      { name: '{{user1}}', content: { text: 'Tell me more about the Nosana challenge' } },
      { name: 'Bounty Hunter', content: { text: 'Analyzing this opportunity. Paste the URL and I will fetch the real details — prize, deadline, requirements, and skill match.', actions: ['EVALUATE_OPPORTUNITY'] } },
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
      { name: 'Bounty Hunter', content: { text: 'I will draft a structured application template. Paste the opportunity URL for a tailored proposal.', actions: ['DRAFT_APPLICATION'] } },
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
