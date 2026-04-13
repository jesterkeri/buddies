import type { Action } from '@elizaos/core';
import { agentStateManager, AgentStatus } from '../../../../shared/agent-state.ts';
import { collectStandupContext, type AgentStandupData } from '../../../../shared/standup-context.ts';

function formatAgentSection(agent: AgentStandupData): string {
  const lines: string[] = [];
  lines.push(`### ${agent.name} — ${agent.currentStatus}${agent.currentTask ? ` (${agent.currentTask})` : ''}`);

  // Active + assigned tasks
  if (agent.assignedTasks.length > 0) {
    for (const t of agent.assignedTasks) {
      lines.push(`- [${t.priority}] ${t.title} (${t.status.replace('_', ' ')})`);
    }
  }

  // Items in review
  if (agent.reviewTasks.length > 0) {
    lines.push(`- Awaiting review: ${agent.reviewTasks.map((t) => t.title).join(', ')}`);
  }

  // Recently completed
  if (agent.completedTasks.length > 0) {
    lines.push(`- Completed: ${agent.completedTasks.map((t) => t.title).join(', ')}`);
  }

  // Recent autonomous activity
  if (agent.recentMessages.length > 0) {
    const summaries = agent.recentMessages.slice(-3).map((m) =>
      `→ ${m.to}: ${m.content.slice(0, 80)}${m.content.length > 80 ? '...' : ''}`
    );
    lines.push(`- Recent comms:\n  ${summaries.join('\n  ')}`);
  }

  if (agent.assignedTasks.length === 0 && agent.reviewTasks.length === 0 && agent.recentMessages.length === 0) {
    lines.push(`- No active work or recent activity`);
  }

  return lines.join('\n');
}

/**
 * Chief generates a standup from real runtime data:
 * agent states, task board, autonomous message history, session context.
 */
export const generateStandup: Action = {
  name: 'GENERATE_STANDUP',
  similes: ['STANDUP', 'DAILY_STANDUP', 'STATUS_UPDATE', 'TEAM_STATUS'],
  description: 'Generate a daily standup summary from all agent activity and current task state. Use when the user asks for a standup, status update, or team summary.',
  validate: async () => true,
  handler: async (runtime, message, state, options, callback) => {
    agentStateManager.setState('Chief', AgentStatus.WORKING, 'Generating standup');

    const ctx = collectStandupContext();
    const sections: string[] = [];

    // Header
    const sessionDuration = Math.round((Date.now() - ctx.sessionStartTime) / 60000);
    sections.push(`# Standup Report\nSession: ${sessionDuration} minutes`);

    // Per-agent reports
    sections.push('## Team Status');
    for (const agent of ctx.agents) {
      sections.push(formatAgentSection(agent));
    }

    // Board overview
    const b = ctx.boardSummary;
    sections.push(`## Task Board (${b.total} total)\n- TODO: ${b.todo} | Active: ${b.inProgress} | Review: ${b.review} | Done: ${b.done}`);

    // Urgent items
    const urgentTodo = ctx.agents.flatMap((a) => a.assignedTasks).filter((t) => t.priority === 'P0' || t.priority === 'P1');
    if (urgentTodo.length > 0) {
      sections.push(`## Urgent\n${urgentTodo.map((t) => `- [${t.priority}] ${t.title} (${t.assignee || 'unassigned'})`).join('\n')}`);
    }

    // Coordination highlights (cross-agent messages)
    const crossAgent = ctx.recentActivity.filter((m) => m.from !== 'user' && m.to !== 'user');
    if (crossAgent.length > 0) {
      const highlights = crossAgent.slice(-5).map((m) =>
        `- ${m.from} → ${m.to}: ${m.content.slice(0, 60)}${m.content.length > 60 ? '...' : ''}`
      );
      sections.push(`## Coordination\n${highlights.join('\n')}`);
    }

    const standup = sections.join('\n\n');

    if (callback) {
      await callback({ text: standup, actions: ['GENERATE_STANDUP'] });
    }

    agentStateManager.setState('Chief', AgentStatus.IDLE);
    return { text: 'Standup compiled from session data', success: true };
  },
  examples: [
    [
      { name: '{{user1}}', content: { text: 'Give me a standup update' } },
      { name: 'Chief', content: { text: 'Compiling standup from agent activity, task board, and session data.', actions: ['GENERATE_STANDUP'] } },
    ],
  ],
};
