/**
 * Pure data collector for standup generation.
 * Reads autonomous messages, task board, and agent states.
 * Returns structured context — no formatting, no side effects.
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { DATA_DIR } from './constants.ts';
import { readTasks, type BackendTask } from './task-provider.ts';
import { agentStateManager } from './agent-state.ts';
import type { AgentMessage } from './agent-messenger.ts';

const MESSAGES_FILE = join(DATA_DIR, '.buddies-autonomous-messages.json');
const SESSION_EVENT_FILE = join(DATA_DIR, '.buddies-session-event.json');

export interface AgentStandupData {
  name: string;
  currentStatus: string;
  currentTask: string;
  recentMessages: { to: string; content: string; response?: string; timestamp: number }[];
  assignedTasks: BackendTask[];
  completedTasks: BackendTask[];
  reviewTasks: BackendTask[];
}

export interface StandupContext {
  sessionStartTime: number;
  agents: AgentStandupData[];
  boardSummary: { todo: number; inProgress: number; review: number; done: number; total: number };
  recentActivity: AgentMessage[];
}

function getSessionStartTime(): number {
  try {
    if (existsSync(SESSION_EVENT_FILE)) {
      const data = JSON.parse(readFileSync(SESSION_EVENT_FILE, 'utf-8'));
      if (data.workSessionActive && data.workSessionStartedAt) {
        return data.workSessionStartedAt;
      }
    }
  } catch {}
  return Date.now() - 8 * 60 * 60 * 1000; // fallback: last 8 hours
}

function loadRecentMessages(since: number): AgentMessage[] {
  try {
    if (!existsSync(MESSAGES_FILE)) return [];
    const all: AgentMessage[] = JSON.parse(readFileSync(MESSAGES_FILE, 'utf-8'));
    if (!Array.isArray(all)) return [];
    return all.filter((m) => m.timestamp >= since);
  } catch {
    return [];
  }
}

export function collectStandupContext(): StandupContext {
  const sessionStart = getSessionStartTime();
  const recentMessages = loadRecentMessages(sessionStart);
  const tasks = readTasks();
  const allStates = agentStateManager.getAllStates();

  // Board summary
  const todo = tasks.filter((t) => t.status === 'todo').length;
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const review = tasks.filter((t) => t.status === 'review').length;
  const done = tasks.filter((t) => t.status === 'done').length;

  // Per-agent data
  const agentNames = allStates.map((s) => s.agentName);
  const agents: AgentStandupData[] = agentNames.map((name) => {
    const state = allStates.find((s) => s.agentName === name);
    const agentMessages = recentMessages
      .filter((m) => m.from === name)
      .map((m) => ({ to: m.to, content: m.content, response: m.response, timestamp: m.timestamp }));

    return {
      name,
      currentStatus: state?.status || 'UNKNOWN',
      currentTask: state?.currentTask || '',
      recentMessages: agentMessages.slice(-5), // last 5 messages sent
      assignedTasks: tasks.filter((t) => t.assignee === name && (t.status === 'todo' || t.status === 'in_progress')),
      completedTasks: tasks.filter((t) => t.assignee === name && t.status === 'done'),
      reviewTasks: tasks.filter((t) => t.assignee === name && t.status === 'review'),
    };
  });

  return {
    sessionStartTime: sessionStart,
    agents,
    boardSummary: { todo, inProgress, review, done, total: tasks.length },
    recentActivity: recentMessages.slice(-20), // last 20 for coordination highlights
  };
}
