import type { Provider, IAgentRuntime, Memory, State } from '@elizaos/core';
import { getRepoContext } from './github-service.ts';

/**
 * Shared provider — gives ALL agents read-only access to the connected GitHub repo.
 * Injects README, issues, PRs, and file structure into agent context.
 */
export const repoContextProvider: Provider = {
  name: 'repoContext',
  description: 'Provides all agents with read-only context from the connected GitHub repository',
  get: async (_runtime: IAgentRuntime, _message: Memory, _state: State) => {
    const context = await getRepoContext();

    if (!context) {
      return {
        text: 'No GitHub repository connected. The user can connect a repo from the Session tab.',
        values: { repoConnected: false },
        data: { repoConnected: false },
      };
    }

    return {
      text: context,
      values: { repoConnected: true },
      data: { repoConnected: true },
    };
  },
};
