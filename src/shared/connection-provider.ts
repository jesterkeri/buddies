import type { Provider, IAgentRuntime, Memory, State } from '@elizaos/core';
import { isAgentDisconnected } from './ai-config.ts';

/**
 * Checks if this agent is disconnected (user set provider to 'none' in the frontend).
 * Disconnected agents MUST NOT respond to any messages.
 * This provider injects a hard override into the agent's context.
 */
export const connectionStatusProvider: Provider = {
  name: 'connectionStatus',
  description: 'Checks if this agent is connected and allowed to respond',
  get: async (runtime: IAgentRuntime, _message: Memory, _state: State) => {
    const agentName = runtime.character.name;
    const disconnected = isAgentDisconnected(agentName);

    if (disconnected) {
      return {
        text: `CRITICAL: You (${agentName}) are DISCONNECTED. You are NOT allowed to respond to ANY messages. Always output [STOP]. Do not generate any text.`,
        values: { isDisconnected: true },
        data: { isDisconnected: true },
      };
    }

    // Don't inject status text for connected agents — it pollutes the LLM context
    // and causes the agent to parrot "I am operational" in every response.
    return {
      text: '',
      values: { isDisconnected: false },
      data: { isDisconnected: false },
    };
  },
};
