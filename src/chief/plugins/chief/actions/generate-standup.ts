import type { Action } from '@elizaos/core';
import { agentStateManager, AgentStatus } from '../../../../shared/agent-state.ts';

/**
 * Chief generates a daily standup summary from all agent activity and task state.
 */
export const generateStandup: Action = {
  name: 'GENERATE_STANDUP',
  similes: ['STANDUP', 'DAILY_STANDUP', 'STATUS_UPDATE', 'TEAM_STATUS'],
  description: 'Generate a daily standup summary from all agent activity and current task state. Use when the user asks for a standup, status update, or team summary.',
  validate: async () => true,
  handler: async (runtime, message, state, options, callback) => {
    agentStateManager.setState('Chief', AgentStatus.WORKING, 'Generating standup');

    // Gather team state
    const allStates = agentStateManager.getAllStates();
    const teamStatus = allStates.map((s) =>
      `${s.agentName}: ${s.status}${s.currentTask ? ` — ${s.currentTask}` : ''}`
    ).join('\n');

    if (callback) {
      await callback({
        text: `Daily standup summary:\n\nTeam Status:\n${teamStatus}\n\nI'll compile recent activity and blockers. Each agent, report your progress.`,
        actions: ['GENERATE_STANDUP'],
      });
    }

    agentStateManager.setState('Chief', AgentStatus.IDLE);
    return { text: 'Standup generated', success: true };
  },
  examples: [
    [
      { name: '{{user1}}', content: { text: 'Give me a standup update' } },
      { name: 'Chief', content: { text: 'Generating standup from current agent states and recent activity.', actions: ['GENERATE_STANDUP'] } },
    ],
  ],
};
