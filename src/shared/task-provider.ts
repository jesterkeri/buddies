import type { Provider, IAgentRuntime } from '@elizaos/core';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { DATA_DIR } from './constants.ts';

const TASKS_PATH = join(DATA_DIR, '.buddies-tasks.json');

// ── Simple mutex for task file operations ──
// Prevents concurrent read-modify-write from clobbering each other
let lockPromise: Promise<void> = Promise.resolve();

export async function withTaskLock<T>(fn: () => T | Promise<T>): Promise<T> {
  const prev = lockPromise;
  let resolve: () => void;
  lockPromise = new Promise<void>((r) => { resolve = r; });
  await prev;
  try {
    return await fn();
  } finally {
    resolve!();
  }
}

// ── Shared task read/write utilities (used by Chief actions + config-server) ──

export interface BackendTask {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  assignee?: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  workOutput: any[];
  discussion: any[];
  statusHistory: any[];
}

export function readTasks(): BackendTask[] {
  try {
    if (existsSync(TASKS_PATH)) {
      const raw = JSON.parse(readFileSync(TASKS_PATH, 'utf-8'));
      return Array.isArray(raw) ? raw : [];
    }
  } catch {}
  return [];
}

export function writeTasks(tasks: BackendTask[]): void {
  writeFileSync(TASKS_PATH, JSON.stringify(tasks, null, 2));
}

export function createTask(
  title: string,
  priority: BackendTask['priority'],
  createdBy: string,
  assignee?: string,
  description?: string,
): BackendTask {
  const task: BackendTask = {
    id: randomUUID(),
    title,
    description,
    status: 'todo',
    priority,
    assignee,
    createdBy,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    workOutput: [],
    discussion: [],
    statusHistory: [],
  };
  const tasks = readTasks();

  // Deduplicate: skip if a task with the same title was created in the last 60s
  const recentDupe = tasks.find((t) =>
    t.title === title && (Date.now() - t.createdAt) < 60_000
  );
  if (recentDupe) return recentDupe;

  tasks.push(task);
  writeTasks(tasks);
  return task;
}

/**
 * Shared task context provider for all agents (including Chief).
 * Gives each agent visibility into their assigned tasks + compact board summary.
 */
export const taskContextProvider: Provider = {
  name: 'task-context',
  description: 'Provides task board context — assigned tasks and board summary',
  get: async (runtime) => {
    const agentName = runtime.character.name;

    try {
      if (!existsSync(TASKS_PATH)) {
        return { text: '', values: {}, data: {} };
      }

      const tasks = JSON.parse(readFileSync(TASKS_PATH, 'utf-8'));
      if (!Array.isArray(tasks) || tasks.length === 0) {
        return { text: '', values: {}, data: {} };
      }

      // Tasks assigned to this agent
      const myTasks = tasks.filter((t: any) => t.assignee === agentName);
      // Board summary
      const todo = tasks.filter((t: any) => t.status === 'todo').length;
      const inProgress = tasks.filter((t: any) => t.status === 'in_progress').length;
      const review = tasks.filter((t: any) => t.status === 'review').length;
      const done = tasks.filter((t: any) => t.status === 'done').length;

      const lines: string[] = [];

      if (myTasks.length > 0) {
        lines.push(`Your assigned tasks:`);
        for (const t of myTasks) {
          lines.push(`- [${t.priority}] ${t.title} (${t.status.replace('_', ' ')})`);
        }
      }

      lines.push(`Board: ${todo} todo, ${inProgress} active, ${review} in review, ${done} done`);

      return {
        text: lines.join('\n'),
        values: { hasAssignedTasks: myTasks.length > 0 },
        data: { assignedCount: myTasks.length, boardTotal: tasks.length },
      };
    } catch {
      return { text: '', values: {}, data: {} };
    }
  },
};
