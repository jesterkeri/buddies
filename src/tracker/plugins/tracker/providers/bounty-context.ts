import type { Provider, IAgentRuntime, Memory, State } from '@elizaos/core';
import { fetchAllBounties } from '../../../../shared/bounty-service.ts';
import { isCasualMessage } from '../../../../shared/context-classifier.ts';

/**
 * Hint provider for Bounty Hunter — tells the agent how many opportunities
 * are available but doesn't dump the full list into context. This forces
 * the LLM to call the SCAN_OPPORTUNITIES action, which outputs the real
 * data with markdown links directly to the user (no LLM paraphrasing).
 */
export const bountyContextProvider: Provider = {
  name: 'bountyContext',
  description: 'Hint for Bounty Hunter to call SCAN_OPPORTUNITIES action when user asks about opportunities',
  get: async (_runtime: IAgentRuntime, message: Memory, _state: State) => {
    const text = (message.content?.text as string) || '';
    if (isCasualMessage(text)) {
      return { text: '', values: { hasBounties: false }, data: { hasBounties: false } };
    }

    // Just check that data is available, don't inject the full list
    try {
      const listings = await fetchAllBounties();
      if (listings.length === 0) {
        return {
          text: 'No bounties currently available from any source.',
          values: { hasBounties: false },
          data: { hasBounties: false },
        };
      }
      // Tell the LLM to use the action — the action outputs real URLs directly
      return {
        text: `# Bounty Hunter Instructions\n\n${listings.length} live opportunities are available from Devpost, Devfolio, Superteam, Immunefi, and more.\n\nWhen the user asks about opportunities, hackathons, bounties, jobs, gigs, or grants, you MUST call the SCAN_OPPORTUNITIES action. Do NOT generate the list yourself from memory. The action returns the real data with clickable links.`,
        values: { hasBounties: true, count: listings.length },
        data: { hasBounties: true, count: listings.length },
      };
    } catch {
      return { text: '', values: { hasBounties: false }, data: { hasBounties: false } };
    }
  },
};
