import type { Provider } from '@elizaos/core';

export enum AgentStatus {
  IDLE = 'IDLE',
  WORKING = 'WORKING',
  REVIEWING = 'REVIEWING',
  RESEARCHING = 'RESEARCHING',
  SCANNING = 'SCANNING',
  MEETING = 'MEETING',
}

export interface AgentStateEntry {
  agentName: string;
  status: AgentStatus;
  currentTask?: string;
  lastUpdated: number;
}

class AgentStateManager {
  private states: Map<string, AgentStateEntry> = new Map();

  setState(agentName: string, status: AgentStatus, task?: string): void {
    this.states.set(agentName, {
      agentName,
      status,
      currentTask: task,
      lastUpdated: Date.now(),
    });
  }

  getState(agentName: string): AgentStateEntry | undefined {
    return this.states.get(agentName);
  }

  getAllStates(): AgentStateEntry[] {
    return Array.from(this.states.values());
  }
}

// Singleton — all 5 agents share one process, so this is shared memory
export const agentStateManager = new AgentStateManager();

export const agentStateProvider: Provider = {
  name: 'agentStates',
  description: 'Current status of all Buddies agents',
  get: async () => {
    const allStates = agentStateManager.getAllStates();
    if (allStates.length === 0) {
      return {
        text: '## Team Status\nNo agents registered yet.',
        values: { agentStates: [] },
        data: { agentStates: [] },
      };
    }
    const lines = allStates.map(
      (s) => `- **${s.agentName}**: ${s.status}${s.currentTask ? ` (${s.currentTask})` : ''}`
    );
    return {
      text: `## Team Status\n${lines.join('\n')}`,
      values: { agentStates: allStates },
      data: { agentStates: allStates },
    };
  },
};
