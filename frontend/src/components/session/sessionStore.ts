import { useSyncExternalStore } from 'react';

export interface SessionState {
  active: boolean;
  startTime: number | null;
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
    return raw ? JSON.parse(raw) : defaultState();
  } catch {
    return defaultState();
  }
}

function defaultState(): SessionState {
  return {
    active: false,
    startTime: null,
    breakStyle: 'pomodoro',
    totalBreaksTaken: 0,
    lastBreakAt: null,
  };
}

function saveState(s: SessionState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

type Listener = () => void;
const listeners = new Set<Listener>();
let state = loadState();

function notify(): void {
  saveState(state);
  listeners.forEach((l) => l());
}

export function getSessionState(): SessionState {
  return state;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function startSession(breakStyle?: string): void {
  // Load break style from onboarding preferences
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
    breakStyle,
    totalBreaksTaken: 0,
    lastBreakAt: null,
  };
  notify();
}

export function endSession(): void {
  state = defaultState();
  notify();
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
