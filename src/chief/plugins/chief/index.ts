import type { Plugin, Action } from '@elizaos/core';
import { agentStateManager, AgentStatus } from '../../../shared/agent-state.ts';
import { fireTrigger } from '../../../shared/triggers.ts';
import { sendAgentMessage, postToUser } from '../../../shared/agent-messenger.ts';
import { isAgentDisconnected } from '../../../shared/ai-config.ts';
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

    const text = (message.content?.text as string) || '';

    // Get current team status for context
    const allStates = agentStateManager.getAllStates();
    const idleAgents = allStates.filter((s) => s.status === 'IDLE').map((s) => s.agentName);
    const busyAgents = allStates.filter((s) => s.status !== 'IDLE').map((s) => `${s.agentName} (${s.status})`);

    if (callback) {
      await callback({
        text: `Task received: "${text}"\n\nTeam availability:\n- Idle: ${idleAgents.join(', ') || 'none'}\n- Busy: ${busyAgents.join(', ') || 'none'}\n\nI'll assign this based on who's available and whose domain matches best.`,
        actions: ['ASSIGN_TASK'],
      });
    }

    agentStateManager.setState('Chief', AgentStatus.IDLE);
    return { text: 'Task assigned', success: true };
  },
  examples: [
    [
      { name: '{{user1}}', content: { text: 'Create a task to review the staking contract' } },
      { name: 'Chief', content: { text: 'Task created and assigned. I will evaluate team workload and set the priority.', actions: ['ASSIGN_TASK'] } },
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

    // Actually ask each connected agent for a status update
    const agents = ['Hawk', 'Radar', 'Bounty Hunter', 'Buddy'];
    const responses: string[] = [];

    for (const agent of agents) {
      if (isAgentDisconnected(agent)) continue;
      const result = await sendAgentMessage('Chief', `Team meeting. ${agent}, quick status — what are you working on and any blockers?`, agent);
      if (result.sent && result.response) {
        responses.push(`**${agent}:** ${result.response}`);
      }
    }

    const summary = responses.length > 0
      ? `Team meeting — ${responses.length} agent(s) reporting:\n\n${responses.join('\n\n')}`
      : `Team meeting called but no agents responded. Make sure agents are connected in the Connect tab.`;

    if (callback) {
      await callback({ text: summary, actions: ['CALL_MEETING'] });
    }

    fireTrigger('Chief', 'CALL_MEETING');
    agentStateManager.setState('Chief', AgentStatus.IDLE);
    return { text: 'Meeting complete', success: true };
  },
  examples: [
    [
      { name: '{{user1}}', content: { text: 'Can we do a standup?' } },
      { name: 'Chief', content: { text: 'Calling a team meeting. All connected agents, status updates please.', actions: ['CALL_MEETING'] } },
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
