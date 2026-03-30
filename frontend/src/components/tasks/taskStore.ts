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
  return [];
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
