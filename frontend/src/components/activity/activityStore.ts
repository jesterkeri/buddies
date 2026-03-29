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
  const now = Date.now();
  return [
    { id: '1', type: 'system', agent: 'System', content: 'Buddies initialized — 5 agents online', timestamp: now - 300000 },
    { id: '2', type: 'task', agent: 'Chief', content: 'Created task: Implement onboarding flow [P1]', timestamp: now - 240000 },
    { id: '3', type: 'review', agent: 'Hawk', content: 'Started reviewing smart contract security', timestamp: now - 180000 },
    { id: '4', type: 'message', agent: 'Radar', content: 'Researching ElizaOS plugin patterns', timestamp: now - 120000 },
    { id: '5', type: 'opportunity', agent: 'Bounty Hunter', content: 'Found 3 new hackathon matches — 95% skill overlap', timestamp: now - 60000 },
    { id: '6', type: 'break', agent: 'Buddy', content: 'Reminder: You\'ve been coding for 2 hours. Time to stretch!', timestamp: now - 30000 },
    { id: '7', type: 'review', agent: 'Hawk', content: 'CRITICAL: Reentrancy vulnerability detected in withdraw()', timestamp: now - 20000 },
    { id: '8', type: 'alert', agent: 'Chief', content: 'Bumped security fix to P0. Reshuffled priorities.', timestamp: now - 10000 },
    { id: '9', type: 'message', agent: 'Radar', content: 'Found related CVE post-mortem — OpenZeppelin ReentrancyGuard v5.2 patches this', timestamp: now - 5000 },
    { id: '10', type: 'break', agent: 'Buddy', content: 'Great work fixing that bug! You earned a coffee break ☕', timestamp: now },
  ].reverse();
}
