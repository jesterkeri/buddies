// Inter-agent trigger definitions
// When one agent completes an action, these rules define which agents should be notified
// The notification happens via the shouldRespondTemplate — agents see each other's messages
// on the MESSAGE-BUS and decide to respond based on domain relevance.
//
// These triggers provide ADDITIONAL context via the agentStateProvider so agents
// know when to proactively jump in.

import { agentStateManager, AgentStatus } from './agent-state.ts';
import { logger } from '@elizaos/core';

export interface Trigger {
  sourceAgent: string;
  sourceAction: string;
  targetAgents: string[];
  description: string;
}

// Defined trigger chains
export const TRIGGERS: Trigger[] = [
  {
    sourceAgent: 'Tracker',
    sourceAction: 'SCAN_OPPORTUNITIES',
    targetAgents: ['Chief'],
    description: 'Chief evaluates bandwidth when Tracker finds opportunities',
  },
  {
    sourceAgent: 'Hawk',
    sourceAction: 'REVIEW_CODE',
    targetAgents: ['Chief', 'Radar'],
    description: 'Chief reprioritizes and Radar pulls CVEs when Hawk flags critical issues',
  },
  {
    sourceAgent: 'Radar',
    sourceAction: 'CHECK_DEPENDENCIES',
    targetAgents: ['Chief', 'Hawk'],
    description: 'Chief creates remediation task and Hawk scans affected files',
  },
  {
    sourceAgent: 'Beans',
    sourceAction: 'CHECK_WELLNESS',
    targetAgents: ['Chief'],
    description: 'Chief finds natural stopping point when Beans flags overworking',
  },
  {
    sourceAgent: 'Chief',
    sourceAction: 'CALL_MEETING',
    targetAgents: ['Hawk', 'Radar', 'Tracker', 'Beans'],
    description: 'All agents join when Chief calls a meeting',
  },
];

// Fire a trigger — sets target agents to appropriate states
export function fireTrigger(sourceAgent: string, sourceAction: string): void {
  const matching = TRIGGERS.filter(
    (t) => t.sourceAgent === sourceAgent && t.sourceAction === sourceAction
  );

  for (const trigger of matching) {
    logger.info(`[BUDDIES] Trigger fired: ${trigger.description}`);

    for (const target of trigger.targetAgents) {
      const currentState = agentStateManager.getState(target);
      // Only activate if the target is idle (don't interrupt active work)
      if (!currentState || currentState.status === 'IDLE') {
        agentStateManager.setState(target, AgentStatus.WORKING, `Responding to ${sourceAgent}`);

        // Reset to idle after a delay (simulates processing time)
        setTimeout(() => {
          const state = agentStateManager.getState(target);
          if (state?.currentTask === `Responding to ${sourceAgent}`) {
            agentStateManager.setState(target, AgentStatus.IDLE);
          }
        }, 10_000);
      }
    }

    // Meeting trigger — set all targets to MEETING state
    if (sourceAction === 'CALL_MEETING') {
      agentStateManager.setState(sourceAgent, AgentStatus.MEETING, 'Leading meeting');
      for (const target of trigger.targetAgents) {
        agentStateManager.setState(target, AgentStatus.MEETING, 'In meeting');
      }

      // End meeting after 30 seconds
      setTimeout(() => {
        agentStateManager.setState(sourceAgent, AgentStatus.IDLE);
        for (const target of trigger.targetAgents) {
          agentStateManager.setState(target, AgentStatus.IDLE);
        }
        logger.info('[BUDDIES] Meeting ended');
      }, 30_000);
    }
  }
}
