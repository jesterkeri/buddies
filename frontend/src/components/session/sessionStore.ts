import { useSyncExternalStore } from 'react';
import { CONFIG_SERVER } from '../../api/config';

export interface SessionState {
  active: boolean;
  startTime: number | null;
  endedAt: number | null;
  breakStyle: string;
  totalBreaksTaken: number;
  lastBreakAt: number | null;
  // User-configurable values for the "custom" break style
  customWorkMin: number;
  customRestMin: number;
}

const STORAGE_KEY = 'buddies-session';

// Default break intervals in minutes
const BREAK_INTERVALS: Record<string, { work: number; rest: number }> = {
  'pomodoro': { work: 25, rest: 5 },
  'deep-work': { work: 90, rest: 15 },
  '52-17': { work: 52, rest: 17 },
  'ultradian': { work: 120, rest: 20 },
  'flowtime': { work: 45, rest: 10 },
  'custom': { work: 30, rest: 5 }, // overridden by state.customWorkMin / customRestMin
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
    customWorkMin: 30,
    customRestMin: 5,
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
  // Preserve customWorkMin/customRestMin across sessions — without the spread,
  // the new state literal would drop these and break custom break style
  // (getBreakInterval would return { work: undefined, rest: undefined } → NaN timer).
  state = {
    ...state,
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

/**
 * Switch session type WITHOUT losing elapsed work time.
 * The current cycle's start point (lastBreakAt or startTime) is preserved,
 * so a switch from pomodoro at 20 min into deep-work shows 70 min remaining,
 * not 90. The total session duration is also unaffected.
 */
export function setBreakStyle(breakStyle: string): void {
  if (!BREAK_INTERVALS[breakStyle]) return;
  state = {
    ...state,
    breakStyle,
    // Intentionally do NOT touch lastBreakAt or startTime — we want the
    // existing elapsed time to carry over into the new interval.
  };
  notify();
}

/**
 * Set custom work/rest durations and switch to the custom style in one call.
 */
export function setCustomDurations(workMin: number, restMin: number): void {
  // Sanity bounds
  const work = Math.max(1, Math.min(480, Math.round(workMin)));
  const rest = Math.max(1, Math.min(120, Math.round(restMin)));
  state = {
    ...state,
    customWorkMin: work,
    customRestMin: rest,
    breakStyle: 'custom',
  };
  notify();
}

export function getAvailableBreakStyles(): string[] {
  return Object.keys(BREAK_INTERVALS);
}

export function getElapsedSeconds(): number {
  if (!state.active || !state.startTime) return 0;
  return Math.floor((Date.now() - state.startTime) / 1000);
}

export function getBreakInterval(): { work: number; rest: number } {
  if (state.breakStyle === 'custom') {
    return { work: state.customWorkMin, rest: state.customRestMin };
  }
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
