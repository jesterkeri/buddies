import { useSyncExternalStore } from 'react';

export type EventType = 'message' | 'task' | 'review' | 'opportunity' | 'break' | 'alert' | 'system';

export interface ActivityEvent {
  id: string;
  type: EventType;
  agent: string;
  content: string;
  timestamp: number;
}

const EVENT_ICONS: Record<EventType, string> = {
  message: '💬',
  task: '📋',
  review: '🔍',
  opportunity: '💰',
  break: '☕',
  alert: '⚠️',
  system: '⚙️',
};

export { EVENT_ICONS };

type Listener = () => void;
const listeners = new Set<Listener>();
let events: ActivityEvent[] = getDefaultEvents();
const MAX_EVENTS = 100;

function notify(): void {
  listeners.forEach((l) => l());
}

export function getEvents(): ActivityEvent[] {
  return events;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function pushEvent(type: EventType, agent: string, content: string): void {
  const event: ActivityEvent = {
    id: crypto.randomUUID(),
    type,
    agent,
    content,
    timestamp: Date.now(),
  };
  events = [event, ...events].slice(0, MAX_EVENTS);
  notify();
}

export function useActivityEvents(): ActivityEvent[] {
  return useSyncExternalStore(subscribe, getEvents);
}

function getDefaultEvents(): ActivityEvent[] {
  return [];
}
