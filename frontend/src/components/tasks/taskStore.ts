// Task store — persists to localStorage + syncs to backend
// Permissions: Only Chief and user can CREATE. Only user can DELETE. Chief and user can MOVE.

import { useSyncExternalStore } from 'react';
import { pushEvent } from '../activity/activityStore';

export type Priority = 'P0' | 'P1' | 'P2' | 'P3';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type Creator = 'user' | 'Chief';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  assignee?: string;
  createdBy: Creator;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'buddies-tasks';
import { CONFIG_SERVER } from '../../api/config';

function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate old tasks without createdBy
      return parsed.map((t: any) => ({ ...t, createdBy: t.createdBy || 'user' }));
    }
    return [];
  } catch {
    return [];
  }
}

function saveTasks(tasks: Task[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  // Sync to backend for agent access
  syncToBackend(tasks);
}

function syncToBackend(tasks: Task[]): void {
  try {
    const fs = typeof require !== 'undefined' ? null : null; // Frontend can't write files
    // Use config server to persist tasks
    fetch(`${CONFIG_SERVER}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tasks),
    }).catch(() => {});
  } catch {}
}

type Listener = () => void;
const listeners = new Set<Listener>();
let tasks = loadTasks();

function notify(): void {
  saveTasks(tasks);
  listeners.forEach((l) => l());
}

export function getTasks(): Task[] {
  return tasks;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ── User actions ──

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
  };
  tasks = [...tasks, task];
  notify();
  pushEvent('task', 'System', `Task created: "${title}" [${priority}]${assignee ? ` → ${assignee}` : ''}`);
}

// Chief creates tasks (called from agent response processing)
export function chiefAddTask(title: string, priority: Priority, assignee?: string): void {
  const task: Task = {
    id: crypto.randomUUID(),
    title,
    status: 'todo',
    priority,
    assignee,
    createdBy: 'Chief',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  tasks = [...tasks, task];
  notify();
  pushEvent('task', 'Chief', `Created task: "${title}" [${priority}]${assignee ? ` assigned to ${assignee}` : ''}`);
}

export function moveTask(id: string, status: TaskStatus, movedBy: string = 'user'): void {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  const oldStatus = task.status;
  tasks = tasks.map((t) =>
    t.id === id ? { ...t, status, updatedAt: Date.now() } : t
  );
  notify();
  pushEvent('task', movedBy === 'Chief' ? 'Chief' : 'System',
    `Task moved: "${task.title}" ${oldStatus.replace('_', ' ')} → ${status.replace('_', ' ')}`
  );
}

// Only user can delete
export function deleteTask(id: string): void {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  tasks = tasks.filter((t) => t.id !== id);
  notify();
  pushEvent('task', 'System', `Task deleted: "${task.title}"`);
}

export function useTasks(): Task[] {
  return useSyncExternalStore(subscribe, getTasks);
}
