import type { Provider, IAgentRuntime, Memory, State } from '@elizaos/core';
import { getBountyContext } from '../../../../shared/bounty-service.ts';

/**
 * Injects live bounty/hackathon listings into Bounty Hunter's context.
 * Data comes from 10+ sources — no API keys needed.
 */
export const bountyContextProvider: Provider = {
  name: 'bountyContext',
  description: 'Live hackathon and bounty listings from Devpost, Devfolio, Superteam, Immunefi, and more',
  get: async (_runtime: IAgentRuntime, _message: Memory, _state: State) => {
    const context = await getBountyContext();

    return {
      text: context,
      values: { hasBounties: context.length > 50 },
      data: { hasBounties: context.length > 50 },
    };
  },
};
