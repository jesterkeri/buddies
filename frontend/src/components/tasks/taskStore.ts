// Task store — persists to localStorage + syncs to backend
// Permissions:
//   CREATE: user, Chief, any agent
//   DELETE: user only
//   MOVE: user, Chief, assigned agent (agents NEVER move past REVIEW)
//   WORK OUTPUT: assigned agent adds work entries
//   DISCUSSION: user + assigned agent + Chief

import { useSyncExternalStore } from 'react';
import { pushEvent } from '../activity/activityStore';

export type Priority = 'P0' | 'P1' | 'P2' | 'P3';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

export interface WorkEntry {
  id: string;
  agent: string;
  content: string;
  timestamp: number;
}

export interface DiscussionMessage {
  id: string;
  from: string; // agent name or 'user'
  content: string;
  timestamp: number;
}

export interface StatusChange {
  from: TaskStatus;
  to: TaskStatus;
  by: string;
  note?: string;
  timestamp: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  assignee?: string;
  createdBy: string; // 'user' | agent name
  createdAt: number;
  updatedAt: number;
  workOutput: WorkEntry[];
  discussion: DiscussionMessage[];
  statusHistory: StatusChange[];
}

const STORAGE_KEY = 'buddies-tasks';
import { CONFIG_SERVER } from '../../api/config';

function migrateTasks(raw: any[]): Task[] {
  return raw.map((t: any) => ({
    ...t,
    createdBy: t.createdBy || 'user',
    workOutput: t.workOutput || [],
    discussion: t.discussion || [],
    statusHistory: t.statusHistory || [],
  }));
}

function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return migrateTasks(JSON.parse(raw));
    return [];
  } catch {
    return [];
  }
}

function saveTasks(tasks: Task[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  syncToBackend(tasks);
}

function syncToBackend(tasks: Task[], options?: { resumeTaskIds?: string[] }): void {
  fetch(`${CONFIG_SERVER}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tasks),
  })
    .then(async (res) => {
      if (!res.ok) return;
      const resumeTaskIds = options?.resumeTaskIds || [];
      if (resumeTaskIds.length > 0) {
        await Promise.allSettled(resumeTaskIds.map((taskId) => resumeTask(taskId)));
        await syncFromBackend();
      }
    })
    .catch(() => {});
}

export async function resumeTask(taskId: string): Promise<void> {
  const res = await fetch(`${CONFIG_SERVER}/tasks/resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || 'Could not resume task');
  }
}

type Listener = () => void;
const listeners = new Set<Listener>();
let tasks = loadTasks();

function mergeTask(local: Task, backend: Task): Task {
  if (backend.updatedAt <= local.updatedAt) return local;

  const mergedDiscussion = [...local.discussion];
  const seenDiscussion = new Set(local.discussion.map((d) => d.id));
  for (const msg of backend.discussion || []) {
    if (!seenDiscussion.has(msg.id)) {
      mergedDiscussion.push(msg);
      seenDiscussion.add(msg.id);
    }
  }

  mergedDiscussion.sort((a, b) => a.timestamp - b.timestamp);

  return {
    ...local,
    title: backend.title,
    description: backend.description,
    status: backend.status,
    priority: backend.priority,
    assignee: backend.assignee,
    createdBy: backend.createdBy,
    createdAt: backend.createdAt,
    updatedAt: backend.updatedAt,
    workOutput: [...(backend.workOutput || [])].sort((a, b) => a.timestamp - b.timestamp),
    statusHistory: [...(backend.statusHistory || [])].sort((a, b) => a.timestamp - b.timestamp),
    discussion: mergedDiscussion,
  };
}

function mergeTaskLists(localTasks: Task[], backendTasks: Task[]): { merged: Task[]; changed: boolean } {
  const localById = new Map(localTasks.map((t) => [t.id, t]));
  const backendById = new Map(backendTasks.map((t) => [t.id, t]));
  let changed = false;

  const merged = localTasks.map((local) => {
    const backend = backendById.get(local.id);
    if (!backend) return local;
    const next = mergeTask(local, backend);
    if (next !== local) changed = true;
    return next;
  });

  const newTasks = backendTasks.filter((bt) => !localById.has(bt.id));
  if (newTasks.length > 0) changed = true;

  return {
    merged: newTasks.length > 0 ? [...merged, ...newTasks] : merged,
    changed,
  };
}

// Sync from backend — runs at boot and every 5s.
// Backend wins only when its task has a newer updatedAt; local-only tasks are preserved.
let bootSyncDone = false;

async function syncFromBackend(): Promise<void> {
  try {
    const res = await fetch(`${CONFIG_SERVER}/tasks`);
    if (res.ok) {
      const json = await res.json();
      const backendTasks = json?.data ?? json;
      if (Array.isArray(backendTasks)) {
        const migrated = migrateTasks(backendTasks);

        if (!bootSyncDone) {
          const { merged, changed } = mergeTaskLists(tasks, migrated);
          tasks = merged;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
          if (changed || migrated.length !== tasks.length) {
            listeners.forEach((l) => l());
          }
          bootSyncDone = true;
          return;
        }

        const { merged, changed } = mergeTaskLists(tasks, migrated);

        if (changed) {
          tasks = merged;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
          listeners.forEach((l) => l());
        }
      }
    }
  } catch {}
}

syncFromBackend();
setInterval(syncFromBackend, 5000);

function notify(): void {
  saveTasks(tasks);
  listeners.forEach((l) => l());
}

export function getTasks(): Task[] {
  return tasks;
}

export function getTask(id: string): Task | undefined {
  return tasks.find((t) => t.id === id);
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ── Create ──

export function addTask(title: string, priority: Priority, assignee?: string, description?: string): void {
  const task: Task = {
    id: crypto.randomUUID(),
    title,
    description,
    status: 'todo',
    priority,
    assignee,
    createdBy: 'user',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    workOutput: [],
    discussion: [],
    statusHistory: [],
  };
  tasks = [...tasks, task];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  syncToBackend(tasks, { resumeTaskIds: assignee ? [task.id] : [] });
  listeners.forEach((l) => l());
  pushEvent('task', 'System', `Task created: "${title}" [${priority}]${assignee ? ` → ${assignee}` : ''}`);
}

export function agentCreateTask(agentName: string, title: string, priority: Priority, assignee?: string, description?: string): void {
  const task: Task = {
    id: crypto.randomUUID(),
    title,
    description,
    status: 'todo',
    priority,
    assignee: assignee || agentName,
    createdBy: agentName,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    workOutput: [],
    discussion: [],
    statusHistory: [],
  };
  tasks = [...tasks, task];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  syncToBackend(tasks, { resumeTaskIds: (assignee || agentName) ? [task.id] : [] });
  listeners.forEach((l) => l());
  pushEvent('task', agentName, `Created task: "${title}" [${priority}]`);
}

// Keep backward compat
export function chiefAddTask(title: string, priority: Priority, assignee?: string): void {
  agentCreateTask('Chief', title, priority, assignee);
}

// ── Move ──

export function moveTask(id: string, status: TaskStatus, movedBy: string = 'user', note?: string): void {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  // Agents can NEVER move past REVIEW
  if (movedBy !== 'user' && status === 'done') return;

  const oldStatus = task.status;
  const change: StatusChange = {
    from: oldStatus,
    to: status,
    by: movedBy,
    note,
    timestamp: Date.now(),
  };

  tasks = tasks.map((t) =>
    t.id === id ? {
      ...t,
      status,
      updatedAt: Date.now(),
      statusHistory: [...t.statusHistory, change],
    } : t
  );
  notify();
  pushEvent('task', movedBy === 'user' ? 'System' : movedBy,
    `Task moved: "${task.title}" ${oldStatus.replace('_', ' ')} → ${status.replace('_', ' ')}`
  );
}

// ── Delete (user only) ──

export function deleteTask(id: string): void {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  tasks = tasks.filter((t) => t.id !== id);
  notify();
  pushEvent('task', 'System', `Task deleted: "${task.title}"`);
}

// ── Work Output ──

export function addWorkOutput(taskId: string, agentName: string, content: string): void {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;

  const entry: WorkEntry = {
    id: crypto.randomUUID(),
    agent: agentName,
    content,
    timestamp: Date.now(),
  };

  tasks = tasks.map((t) =>
    t.id === taskId ? {
      ...t,
      workOutput: [...t.workOutput, entry],
      updatedAt: Date.now(),
    } : t
  );
  notify();
  pushEvent('task', agentName, `Work submitted on "${task.title}"`);
}

// ── Discussion ──

export function addDiscussionMessage(taskId: string, from: string, content: string): void {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;

  const msg: DiscussionMessage = {
    id: crypto.randomUUID(),
    from,
    content,
    timestamp: Date.now(),
  };

  tasks = tasks.map((t) =>
    t.id === taskId ? {
      ...t,
      discussion: [...t.discussion, msg],
      updatedAt: Date.now(),
    } : t
  );
  notify();
}

// ── Review Actions ──

export function approveTask(id: string): void {
  moveTask(id, 'done', 'user', 'Approved');
}

export function requestChanges(id: string, note: string): void {
  moveTask(id, 'in_progress', 'user', note);
}

// ── Update fields ──

export function updateTask(id: string, updates: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'assignee'>>): void {
  tasks = tasks.map((t) =>
    t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
  );
  notify();
}

// ── Hook ──

export function useTasks(): Task[] {
  return useSyncExternalStore(subscribe, getTasks);
}
