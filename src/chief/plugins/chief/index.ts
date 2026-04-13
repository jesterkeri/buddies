import type { Plugin, Action } from '@elizaos/core';
import { logger } from '@elizaos/core';
import { agentStateManager, AgentStatus } from '../../../shared/agent-state.ts';
import { fireTrigger } from '../../../shared/triggers.ts';
import { sendAgentMessage, postToUser } from '../../../shared/agent-messenger.ts';
import { isAgentDisconnected } from '../../../shared/ai-config.ts';
import { createTask } from '../../../shared/task-provider.ts';
import { autoPickupTask } from '../../../shared/work-on-task.ts';
import { projectContextProvider } from './providers/project-context.ts';
import { generateStandup } from './actions/generate-standup.ts';
import { draftPR } from './actions/draft-pr.ts';

// Map agent roles to domains for smart assignment
// Chief is NOT in this map — he's the sender, not an assignment target.
// Explicit name mentions (e.g. "assign to Hawk") are handled by inferAssignee's name check.
const AGENT_DOMAINS: Record<string, string[]> = {
  Hawk: ['code', 'review', 'security', 'audit', 'test', 'bug', 'fix', 'pr', 'pull request', 'vulnerability'],
  Radar: ['research', 'monitor', 'docs', 'documentation', 'dependency', 'update', 'scout', 'investigate'],
  'Bounty Hunter': ['bounty', 'opportunity', 'hackathon', 'grant', 'competition', 'earn', 'money'],
  Buddy: ['wellness', 'break', 'morale', 'team', 'onboarding', 'help', 'food', 'coffee', 'restaurant', 'location'],
};

function inferAssignee(text: string): string | undefined {
  const lower = text.toLowerCase();
  // Check for explicit @mention
  for (const name of Object.keys(AGENT_DOMAINS)) {
    if (lower.includes(name.toLowerCase())) return name;
  }
  // Match by domain keywords
  let bestMatch: string | undefined;
  let bestScore = 0;
  for (const [agent, keywords] of Object.entries(AGENT_DOMAINS)) {
    const score = keywords.filter((k) => lower.includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = agent;
    }
  }
  return bestMatch;
}

function inferPriority(text: string): 'P0' | 'P1' | 'P2' | 'P3' {
  const lower = text.toLowerCase();
  if (lower.includes('critical') || lower.includes('urgent') || lower.includes('p0')) return 'P0';
  if (lower.includes('high') || lower.includes('important') || lower.includes('p1')) return 'P1';
  if (lower.includes('low') || lower.includes('minor') || lower.includes('p3')) return 'P3';
  return 'P2';
}

const assignTask: Action = {
  name: 'ASSIGN_TASK',
  similes: ['CREATE_TASK', 'DELEGATE_TASK', 'PRIORITIZE'],
  description: 'Create and assign a task to a team member with priority level. Use when the user asks to create a task, delegate work, or prioritize items.',
  validate: async () => true,
  handler: async (runtime, message, state, options, callback) => {
    agentStateManager.setState('Chief', AgentStatus.WORKING, 'Assigning task');

    const rawText = (message.content?.text as string) || '';
    // Strip enriched context injection (added by frontend for follow-up/reply messages)
    const text = rawText
      .replace(/\n\n\[Recent context from [\s\S]*$/, '')
      .replace(/\n\n\[Replying to [\s\S]*$/, '')
      .trim();
    const assignee = inferAssignee(text);
    const priority = inferPriority(text);

    // Create and persist the task
    const task = createTask(text, priority, 'Chief', assignee, undefined);

    // Auto-trigger task pickup — this sends the work prompt to the agent,
    // which serves as both notification and work request. No separate notification needed.
    if (assignee && !isAgentDisconnected(assignee)) {
      autoPickupTask(assignee, task.id).catch((err) =>
        logger.error(`[ASSIGN_TASK] Auto-pickup failed for ${assignee}: ${err}`)
      );
    }

    // Get current team status for context
    const allStates = agentStateManager.getAllStates();
    const idleAgents = allStates.filter((s) => s.status === 'IDLE').map((s) => s.agentName);
    const busyAgents = allStates.filter((s) => s.status !== 'IDLE').map((s) => `${s.agentName} (${s.status})`);

    if (callback) {
      await callback({
        text: `Task created [${priority}]: "${text}"\nAssigned to: ${assignee || 'Unassigned'}\n\nTeam availability:\n- Idle: ${idleAgents.join(', ') || 'none'}\n- Busy: ${busyAgents.join(', ') || 'none'}`,
        actions: ['ASSIGN_TASK'],
      });
    }

    agentStateManager.setState('Chief', AgentStatus.IDLE);
    return { text: `Task created and assigned to ${assignee || 'unassigned'}`, success: true };
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
