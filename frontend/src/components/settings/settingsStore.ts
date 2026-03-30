import { useSyncExternalStore } from 'react';

export interface IntegrationConfig {
  telegram: {
    enabled: boolean;
    botToken: string;
    chatId: string;
    connected: boolean;
  };
  whatsapp: {
    enabled: boolean;
    phoneNumber: string;
    connected: boolean;
  };
  email: {
    enabled: boolean;
    address: string;
    connected: boolean;
  };
  discord: {
    enabled: boolean;
    webhookUrl: string;
    connected: boolean;
  };
}

export interface AgentModelConfig {
  provider: string;
  apiKey: string;
  apiUrl: string;
  model: string;
}

export interface AiConfig {
  defaultProvider: string;
  defaultApiKey: string;
  defaultApiUrl: string;
  defaultModel: string;
  perAgent: Record<string, AgentModelConfig>;
}

export interface SettingsState {
  integrations: IntegrationConfig;
  aiConfig: AiConfig;
  notifications: {
    breakReminders: boolean;
    securityAlerts: boolean;
    opportunityAlerts: boolean;
    celebrations: boolean;
    standupSummary: boolean;
  };
}

const STORAGE_KEY = 'buddies-settings';

function defaultState(): SettingsState {
  return {
    integrations: {
      telegram: { enabled: false, botToken: '', chatId: '', connected: false },
      whatsapp: { enabled: false, phoneNumber: '', connected: false },
      email: { enabled: false, address: '', connected: false },
      discord: { enabled: false, webhookUrl: '', connected: false },
    },
    aiConfig: {
      defaultProvider: '',
      defaultApiKey: '',
      defaultApiUrl: '',
      defaultModel: '',
      perAgent: {},
    },
    notifications: {
      breakReminders: true,
      securityAlerts: true,
      opportunityAlerts: true,
      celebrations: true,
      standupSummary: true,
    },
  };
}

function loadState(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultState(), ...JSON.parse(raw) } : defaultState();
  } catch {
    return defaultState();
  }
}

function saveState(s: SettingsState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

// Config server runs on port 3001 alongside ElizaOS
// Use the same hostname as the page so it works on any domain (localhost, Nosana, Vercel, etc.)
const CONFIG_SERVER = `${window.location.protocol}//${window.location.hostname}:3001`;

// Sync AI config to the backend so agents actually use it
function syncAiConfigToBackend(aiConfig: AiConfig): void {
  fetch(`${CONFIG_SERVER}/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(aiConfig),
  }).catch(() => {
    // Config server might not be running yet
  });
}

// Load AI config from backend on startup
async function loadAiConfigFromBackend(): Promise<void> {
  try {
    const res = await fetch(`${CONFIG_SERVER}/config`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.data && data.data.defaultProvider) {
        state = { ...state, aiConfig: { ...state.aiConfig, ...data.data } };
        saveState(state);
        listeners.forEach((l) => l());
      }
    }
  } catch {
    // Config server not available
  }
}

// Sync on startup
loadAiConfigFromBackend();

type Listener = () => void;
const listeners = new Set<Listener>();
let state = loadState();

function notify(): void {
  saveState(state);
  // Push AI config to backend whenever it changes
  syncAiConfigToBackend(state.aiConfig);
  listeners.forEach((l) => l());
}

export function getSettingsState(): SettingsState {
  return state;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function updateIntegration(
  platform: keyof IntegrationConfig,
  update: Partial<IntegrationConfig[keyof IntegrationConfig]>
): void {
  state = {
    ...state,
    integrations: {
      ...state.integrations,
      [platform]: { ...state.integrations[platform], ...update },
    },
  };
  notify();
}

export function updateAiConfig(update: Partial<AiConfig>): void {
  state = {
    ...state,
    aiConfig: { ...state.aiConfig, ...update },
  };
  notify();
}

export function updateAgentModel(agentName: string, update: Partial<AgentModelConfig>): void {
  const current = state.aiConfig.perAgent[agentName] || {
    provider: '', apiKey: '', apiUrl: '', model: '',
  };
  state = {
    ...state,
    aiConfig: {
      ...state.aiConfig,
      perAgent: {
        ...state.aiConfig.perAgent,
        [agentName]: { ...current, ...update },
      },
    },
  };
  notify();
}

export function updateNotifications(update: Partial<SettingsState['notifications']>): void {
  state = {
    ...state,
    notifications: { ...state.notifications, ...update },
  };
  notify();
}

export function useSettings(): SettingsState {
  return useSyncExternalStore(subscribe, getSettingsState);
}
