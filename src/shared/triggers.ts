// Inter-agent trigger definitions
// When one agent completes an action, these rules define which agents should be notified.
// Triggers now send actual messages to the team channel, which causes ElizaOS to evaluate
// shouldRespond for all other agents — enabling real agent-to-agent conversation chains.

import { agentStateManager, AgentStatus } from './agent-state.ts';
import { sendAgentMessage } from './agent-messenger.ts';
import { logger } from '@elizaos/core';
import { TRIGGER_RESPONSE_DELAY_MS, MEETING_DURATION_MS } from './constants.ts';

export interface Trigger {
  sourceAgent: string;
  sourceAction: string;
  targetAgents: string[];
  description: string;
}

// Defined trigger chains
export const TRIGGERS: Trigger[] = [
  {
    sourceAgent: 'Bounty Hunter',
    sourceAction: 'SCAN_OPPORTUNITIES',
    targetAgents: ['Chief'],
    description: 'Chief evaluates bandwidth when Bounty Hunter finds opportunities',
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
    sourceAgent: 'Buddy',
    sourceAction: 'CHECK_WELLNESS',
    targetAgents: ['Chief'],
    description: 'Chief finds natural stopping point when Buddy flags overworking',
  },
  {
    sourceAgent: 'Chief',
    sourceAction: 'CALL_MEETING',
    targetAgents: ['Hawk', 'Radar', 'Bounty Hunter', 'Buddy'],
    description: 'All agents join when Chief calls a meeting',
  },
];

// Map trigger actions to contextual messages from the source agent
const TRIGGER_MESSAGES: Record<string, string> = {
  'Bounty Hunter:SCAN_OPPORTUNITIES':
    'Team, I found new opportunities that match our profile. @Chief, do we have bandwidth to take any of these on?',
  'Hawk:REVIEW_CODE':
    'Flagging code review findings — there are issues that need attention. @Chief, this may need reprioritization. @Radar, check for related CVEs.',
  'Radar:CHECK_DEPENDENCIES':
    'Dependency alert — found updates that need attention. @Chief, adding remediation to the board. @Hawk, scan affected files for vulnerabilities.',
  'Buddy:CHECK_WELLNESS':
    "Hey team! 🌟 Our dev has been going hard for a while. @Chief, can we find a natural stopping point soon? Everyone deserves a breather!",
  'Chief:CALL_MEETING':
    'Calling a team meeting. All agents, gather up — status updates please. @Hawk @Radar @Bounty Hunter @Buddy, sound off.',
};

// Fire a trigger — sets target agents to appropriate states AND sends a message
export async function fireTrigger(sourceAgent: string, sourceAction: string): Promise<void> {
  const matching = TRIGGERS.filter(
    (t) => t.sourceAgent === sourceAgent && t.sourceAction === sourceAction
  );

  for (const trigger of matching) {
    logger.info(`[BUDDIES] Trigger fired: ${trigger.description}`);

    for (const target of trigger.targetAgents) {
      const currentState = agentStateManager.getState(target);
      // Only activate if the target is idle (don't interrupt active work)
      if (!currentState || currentState.status === AgentStatus.IDLE) {
        agentStateManager.setState(target, AgentStatus.WORKING, `Responding to ${sourceAgent}`);

        setTimeout(() => {
          const state = agentStateManager.getState(target);
          if (state?.currentTask === `Responding to ${sourceAgent}`) {
            agentStateManager.setState(target, AgentStatus.IDLE);
          }
        }, TRIGGER_RESPONSE_DELAY_MS);
      }
    }

    // Meeting trigger — set all targets to MEETING state
    if (sourceAction === 'CALL_MEETING') {
      agentStateManager.setState(sourceAgent, AgentStatus.MEETING, 'Leading meeting');
      for (const target of trigger.targetAgents) {
        agentStateManager.setState(target, AgentStatus.MEETING, 'In meeting');
      }

      setTimeout(() => {
        agentStateManager.setState(sourceAgent, AgentStatus.IDLE);
        for (const target of trigger.targetAgents) {
          agentStateManager.setState(target, AgentStatus.IDLE);
        }
        logger.info('[BUDDIES] Meeting ended');
      }, MEETING_DURATION_MS);
    }

    // Send a message from the source agent to each target agent via sessions
    const messageKey = `${sourceAgent}:${sourceAction}`;
    const messageText = TRIGGER_MESSAGES[messageKey];
    if (messageText) {
      for (const target of trigger.targetAgents) {
        await sendAgentMessage(sourceAgent, messageText, target);
      }
    }
  }
}
