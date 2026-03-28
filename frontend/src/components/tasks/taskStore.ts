// Simple in-memory task store (persists to localStorage)
// In production, this would sync with the backend via Chief's task management

export type Priority = 'P0' | 'P1' | 'P2' | 'P3';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  assignee?: string; // agent name
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'buddies-tasks';

function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : getDefaultTasks();
  } catch {
    return getDefaultTasks();
  }
}

function saveTasks(tasks: Task[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function getDefaultTasks(): Task[] {
  const now = Date.now();
  return [
    { id: '1', title: 'Set up ElizaOS v2 monorepo', status: 'done', priority: 'P0', assignee: 'Chief', createdAt: now, updatedAt: now },
    { id: '2', title: 'Write agent character files', status: 'done', priority: 'P0', assignee: 'Chief', createdAt: now, updatedAt: now },
    { id: '3', title: 'Build Docker + deploy to Nosana', status: 'done', priority: 'P0', assignee: 'Chief', createdAt: now, updatedAt: now },
    { id: '4', title: 'Review smart contract security', status: 'in_progress', priority: 'P1', assignee: 'Hawk', createdAt: now, updatedAt: now },
    { id: '5', title: 'Research ElizaOS plugin patterns', status: 'in_progress', priority: 'P1', assignee: 'Radar', createdAt: now, updatedAt: now },
    { id: '6', title: 'Scan hackathon opportunities', status: 'todo', priority: 'P2', assignee: 'Tracker', createdAt: now, updatedAt: now },
    { id: '7', title: 'Set up break reminders', status: 'todo', priority: 'P3', assignee: 'Beans', createdAt: now, updatedAt: now },
    { id: '8', title: 'Implement onboarding flow', status: 'todo', priority: 'P1', assignee: 'Chief', createdAt: now, updatedAt: now },
    { id: '9', title: 'Add test coverage for agents', status: 'review', priority: 'P2', assignee: 'Hawk', createdAt: now, updatedAt: now },
  ];
}

// Reactive store with listeners
type Listener = () => void;
const listeners = new Set<Listener>();
let tasks = loadTasks();

export function getTasks(): Task[] {
  return tasks;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(): void {
  saveTasks(tasks);
  listeners.forEach((l) => l());
}

export function addTask(title: string, priority: Priority, assignee?: string): void {
  const task: Task = {
    id: crypto.randomUUID(),
    title,
    status: 'todo',
    priority,
    assignee,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  tasks = [...tasks, task];
  notify();
}

export function moveTask(id: string, status: TaskStatus): void {
  tasks = tasks.map((t) =>
    t.id === id ? { ...t, status, updatedAt: Date.now() } : t
  );
  notify();
}

export function deleteTask(id: string): void {
  tasks = tasks.filter((t) => t.id !== id);
  notify();
}

// React hook
import { useSyncExternalStore } from 'react';

export function useTasks(): Task[] {
  return useSyncExternalStore(subscribe, getTasks);
}
