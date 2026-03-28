import { useSyncExternalStore } from 'react';

export interface UserProfile {
  name: string;
  languages: string[];
  frameworks: string[];
  chains: string[];
  experience: 'beginner' | 'intermediate' | 'senior' | 'expert';
}

export interface TeamConfig {
  Chief: string;
  Hawk: string;
  Radar: string;
  Tracker: string;
  Beans: string;
}

export interface ApiConfig {
  defaultProvider: string;
  apiKey: string;
}

export interface Preferences {
  workHours: string;
  breakStyle: 'pomodoro' | 'deep-work' | 'custom';
  personality: 'professional' | 'casual' | 'sarcastic';
}

export interface OnboardingState {
  step: number;
  completed: boolean;
  profile: UserProfile;
  teamNames: TeamConfig;
  apiConfig: ApiConfig;
  preferences: Preferences;
}

const STORAGE_KEY = 'buddies-onboarding';

const DEFAULT_STATE: OnboardingState = {
  step: 0,
  completed: false,
  profile: {
    name: '',
    languages: [],
    frameworks: [],
    chains: [],
    experience: 'intermediate',
  },
  teamNames: {
    Chief: 'Chief',
    Hawk: 'Hawk',
    Radar: 'Radar',
    Tracker: 'Tracker',
    Beans: 'Beans',
  },
  apiConfig: {
    defaultProvider: 'qwen',
    apiKey: '',
  },
  preferences: {
    workHours: '9-5',
    breakStyle: 'pomodoro',
    personality: 'casual',
  },
};

function loadState(): OnboardingState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(s: OnboardingState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

type Listener = () => void;
const listeners = new Set<Listener>();
let state = loadState();

function notify(): void {
  saveState(state);
  listeners.forEach((l) => l());
}

export function getOnboardingState(): OnboardingState {
  return state;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setStep(step: number): void {
  state = { ...state, step };
  notify();
}

export function updateProfile(profile: Partial<UserProfile>): void {
  state = { ...state, profile: { ...state.profile, ...profile } };
  notify();
}

export function updateTeamNames(names: Partial<TeamConfig>): void {
  state = { ...state, teamNames: { ...state.teamNames, ...names } };
  notify();
}

export function updateApiConfig(config: Partial<ApiConfig>): void {
  state = { ...state, apiConfig: { ...state.apiConfig, ...config } };
  notify();
}

export function updatePreferences(prefs: Partial<Preferences>): void {
  state = { ...state, preferences: { ...state.preferences, ...prefs } };
  notify();
}

export function completeOnboarding(): void {
  state = { ...state, completed: true };
  notify();
}

export function resetOnboarding(): void {
  state = DEFAULT_STATE;
  notify();
}

export function useOnboarding(): OnboardingState {
  return useSyncExternalStore(subscribe, getOnboardingState);
}
