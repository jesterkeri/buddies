import type { Plugin, Action } from '@elizaos/core';
import { agentStateManager, AgentStatus } from '../../../shared/agent-state.ts';
import { fireTrigger } from '../../../shared/triggers.ts';
import { projectContextProvider } from './providers/project-context.ts';
import { generateStandup } from './actions/generate-standup.ts';
import { draftPR } from './actions/draft-pr.ts';

const assignTask: Action = {
  name: 'ASSIGN_TASK',
  similes: ['CREATE_TASK', 'DELEGATE_TASK', 'PRIORITIZE'],
  description: 'Create and assign a task to a team member with priority level. Use when the user asks to create a task, delegate work, or prioritize items.',
  validate: async () => true,
  handler: async (runtime, message, state, options, callback) => {
    agentStateManager.setState('Chief', AgentStatus.WORKING, 'Assigning task');

    if (callback) {
      await callback({
        text: `Task noted. I'll add it to the mission board and assign the right agent. Let me evaluate the team's current workload and priorities.`,
        actions: ['ASSIGN_TASK'],
      });
    }

    agentStateManager.setState('Chief', AgentStatus.IDLE);
    return { text: 'Task assigned', success: true };
  },
  examples: [
    [
      { name: '{{user1}}', content: { text: 'Create a task to review the staking contract' } },
      { name: 'Chief', content: { text: 'Creating task: Review staking contract. Assigning to Hawk at P1 priority. I blocked 2 hours this afternoon for the review.', actions: ['ASSIGN_TASK'] } },
    ],
  ],
};

const callMeeting: Action = {
  name: 'CALL_MEETING',
  similes: ['TEAM_MEETING', 'STANDUP', 'SYNC'],
  description: 'Call a team meeting or standup. Use when coordination across multiple agents is needed.',
  validate: async () => true,
  handler: async (runtime, message, state, options, callback) => {
    agentStateManager.setState('Chief', AgentStatus.MEETING, 'Team meeting');

    if (callback) {
      await callback({
        text: `Calling a team meeting. All agents, let's sync up. I'll go around the room — each of you give a quick status update.`,
        actions: ['CALL_MEETING'],
      });
    }

    fireTrigger('Chief', 'CALL_MEETING');
    return { text: 'Meeting called', success: true };
  },
  examples: [
    [
      { name: '{{user1}}', content: { text: 'Can we do a standup?' } },
      { name: 'Chief', content: { text: 'Morning standup. Let me go around the room. Hawk, Radar, Bounty Hunter, Buddy — status updates please.', actions: ['CALL_MEETING'] } },
    ],
  ],
};

const chiefPlugin: Plugin = {
  name: 'chief-plugin',
  description: 'Team Lead capabilities — task management, coordination, scheduling, standups, PR drafts',
  actions: [assignTask, callMeeting, generateStandup, draftPR],
  providers: [projectContextProvider],
  evaluators: [],
};

export default chiefPlugin;
