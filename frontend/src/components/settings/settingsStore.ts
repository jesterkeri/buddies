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

import { CONFIG_SERVER } from '../../api/config';

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

// Load AI config from backend on startup — merge with localStorage.
// IMPORTANT: backend GET /config now redacts apiKey values for security
// (returns hasApiKey/hasDefaultApiKey booleans instead). The real keys
// only live in localStorage on the frontend. So this function only:
//   1. Pushes local config to backend if local has keys but backend doesn't
//      (cold start: user typed keys before backend was running).
//   2. Logs a warning if backend reports keys but local has none (cold-load
//      after browser data clear) — user must re-enter their keys.
async function loadAiConfigFromBackend(): Promise<void> {
  try {
    const res = await fetch(`${CONFIG_SERVER}/config`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.data) {
        const backend = data.data;
        const local = state.aiConfig;

        // Use the backend's hasDefaultApiKey/hasApiKey booleans (post-redaction),
        // falling back to legacy raw apiKey field if booleans are missing.
        const backendHasKeys =
          backend.hasDefaultApiKey ||
          backend.defaultApiKey ||
          Object.values(backend.perAgent || {}).some((a: any) => a?.hasApiKey || a?.apiKey);
        const localHasKeys = local.defaultApiKey || Object.values(local.perAgent || {}).some((a: any) => a?.apiKey);

        if (localHasKeys && !backendHasKeys) {
          // Local has keys but backend doesn't — push local to backend
          syncAiConfigToBackend(local);
        } else if (backendHasKeys && !localHasKeys) {
          // Cold-load case: backend has keys but localStorage was cleared.
          // Backend won't return the raw values (redacted), so the user
          // must re-enter their keys via the Connect tab.
          console.warn('[buddies] Backend reports configured API keys but localStorage is empty. Re-enter your keys in the Connect tab.');
        }
        // Always merge non-secret backend metadata (provider, model, apiUrl)
        // so the frontend reflects the source of truth on disk.
        const mergedPerAgent: Record<string, any> = { ...local.perAgent };
        for (const [name, agent] of Object.entries(backend.perAgent || {})) {
          const a = agent as any;
          mergedPerAgent[name] = {
            provider: a.provider || mergedPerAgent[name]?.provider || '',
            apiUrl: a.apiUrl || mergedPerAgent[name]?.apiUrl || '',
            model: a.model || mergedPerAgent[name]?.model || '',
            apiKey: mergedPerAgent[name]?.apiKey || '', // never overwrite local key with redacted value
          };
        }
        state = {
          ...state,
          aiConfig: {
            ...local,
            defaultProvider: backend.defaultProvider || local.defaultProvider,
            defaultApiUrl: backend.defaultApiUrl || local.defaultApiUrl,
            defaultModel: backend.defaultModel || local.defaultModel,
            // Never overwrite local apiKey with redacted backend value
            defaultApiKey: local.defaultApiKey,
            perAgent: mergedPerAgent,
          },
        };
        saveState(state);
        listeners.forEach((l) => l());
      }
    }
  } catch {}
}

// Sync on startup (runs after state is initialized due to async)
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
