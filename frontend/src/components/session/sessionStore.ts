import { useSyncExternalStore } from 'react';
import { CONFIG_SERVER } from '../../api/config';

export interface SessionState {
  active: boolean;
  startTime: number | null;
  endedAt: number | null;
  breakStyle: string;
  totalBreaksTaken: number;
  lastBreakAt: number | null;
}

const STORAGE_KEY = 'buddies-session';

// Break intervals in minutes
const BREAK_INTERVALS: Record<string, { work: number; rest: number }> = {
  'pomodoro': { work: 25, rest: 5 },
  'deep-work': { work: 90, rest: 15 },
  '52-17': { work: 52, rest: 17 },
  'ultradian': { work: 120, rest: 20 },
  'flowtime': { work: 45, rest: 10 },
  'custom': { work: 30, rest: 5 },
};

function loadState(): SessionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaultState(), ...parsed };
    }
    return defaultState();
  } catch {
    return defaultState();
  }
}

function defaultState(): SessionState {
  return {
    active: false,
    startTime: null,
    endedAt: null,
    breakStyle: 'pomodoro',
    totalBreaksTaken: 0,
    lastBreakAt: null,
  };
}

function saveState(s: SessionState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

// ── Listeners (for useSyncExternalStore) ──
type Listener = () => void;
const listeners = new Set<Listener>();
let state = loadState();

function notify(): void {
  saveState(state);
  listeners.forEach((l) => l());
}

// ── Lifecycle callbacks (for hooks.ts to register without circular imports) ──
type LifecycleCallback = (event: 'start' | 'end') => void;
const lifecycleCallbacks = new Set<LifecycleCallback>();

export function registerSessionLifecycle(cb: LifecycleCallback): () => void {
  lifecycleCallbacks.add(cb);
  return () => lifecycleCallbacks.delete(cb);
}

function fireLifecycle(event: 'start' | 'end'): void {
  lifecycleCallbacks.forEach((cb) => {
    try { cb(event); } catch {}
  });
}

function notifyBackend(event: 'start' | 'end'): void {
  fetch(`${CONFIG_SERVER}/session-event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, timestamp: Date.now() }),
  }).catch(() => {});
}

// ── Public API ──

export function getSessionState(): SessionState {
  return state;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function startSession(breakStyle?: string): void {
  if (!breakStyle) {
    try {
      const onboarding = JSON.parse(localStorage.getItem('buddies-onboarding') || '{}');
      breakStyle = onboarding?.preferences?.breakStyle || 'pomodoro';
    } catch {
      breakStyle = 'pomodoro';
    }
  }
  state = {
    active: true,
    startTime: Date.now(),
    endedAt: null,
    breakStyle,
    totalBreaksTaken: 0,
    lastBreakAt: null,
  };
  notify();
  fireLifecycle('start');
  notifyBackend('start');
}

export function endSession(): void {
  state = {
    ...state,
    active: false,
    endedAt: Date.now(),
  };
  notify();
  fireLifecycle('end');
  notifyBackend('end');
}

export function takeBreak(): void {
  state = {
    ...state,
    totalBreaksTaken: state.totalBreaksTaken + 1,
    lastBreakAt: Date.now(),
  };
  notify();
}

export function getElapsedSeconds(): number {
  if (!state.active || !state.startTime) return 0;
  return Math.floor((Date.now() - state.startTime) / 1000);
}

export function getBreakInterval(): { work: number; rest: number } {
  return BREAK_INTERVALS[state.breakStyle] || BREAK_INTERVALS.pomodoro;
}

export function getNextBreakIn(): number {
  if (!state.active || !state.startTime) return 0;
  const interval = getBreakInterval();
  const workMs = interval.work * 60 * 1000;
  const lastRef = state.lastBreakAt || state.startTime;
  const elapsed = Date.now() - lastRef;
  const remaining = workMs - elapsed;
  return Math.max(0, Math.floor(remaining / 1000));
}

export function isBreakDue(): boolean {
  return state.active && getNextBreakIn() === 0;
}

export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, getSessionState);
}
