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
  description: 'Current status of all Buddies agents (only connected agents with API keys)',
  get: async () => {
    // Only show agents that actually have a working API key (not disconnected)
    const { isAgentDisconnected } = await import('./ai-config.ts');
    const allStates = agentStateManager.getAllStates();
    const connectedStates = allStates.filter((s) => !isAgentDisconnected(s.agentName));
    if (connectedStates.length === 0) {
      return {
        text: '## Team Status\nNo agents connected yet. Configure API keys in Settings.',
        values: { agentStates: [], connectedCount: 0 },
        data: { agentStates: [], connectedCount: 0 },
      };
    }
    const disconnectedNames = allStates
      .filter((s) => isAgentDisconnected(s.agentName))
      .map((s) => s.agentName);
    const lines = connectedStates.map(
      (s) => `- **${s.agentName}**: ${s.status}${s.currentTask ? ` (${s.currentTask})` : ''}`
    );
    let text = `## Team Status (${connectedStates.length} connected)\n${lines.join('\n')}`;
    if (disconnectedNames.length > 0) {
      text += `\n\nOffline: ${disconnectedNames.join(', ')} (no API key)`;
    }
    return {
      text,
      values: { agentStates: connectedStates, connectedCount: connectedStates.length },
      data: { agentStates: connectedStates, connectedCount: connectedStates.length },
    };
  },
};
