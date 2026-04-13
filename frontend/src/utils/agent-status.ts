import type { AiConfig } from '../components/settings/settingsStore';
import type { AgentInfo } from '../types';

const FREE_PROVIDERS = ['ollama', 'nosana'];

export type AgentConnectionState = 'disconnected' | 'default' | 'configured';

export interface AgentConnectionInfo {
  state: AgentConnectionState;
  label: string;
  color: string;
  detail: string;
}

/**
 * UI-level connectivity heuristic: is an agent configured and allowed to count as online?
 * Checks per-agent config + default provider/key fallback + free-provider handling.
 * Also checks `hasApiKey` boolean from backend (survives localStorage clears).
 * Shared between Sidebar and PixelOffice for consistent behavior.
 */
export function getAgentConnectionState(agentName: string, aiConfig: AiConfig, registeredAgents: AgentInfo[]): AgentConnectionState {
  // Must be registered in ElizaOS
  if (!registeredAgents.some((a) => a.name === agentName)) return 'disconnected';

  const agentConfig = aiConfig.perAgent[agentName] as any;

  // Explicitly disconnected
  if (agentConfig?.provider === 'none') return 'disconnected';

  const hasPerAgentProvider = agentConfig?.provider && agentConfig.provider !== '';

  if (hasPerAgentProvider) {
    const isFree = FREE_PROVIDERS.includes(agentConfig.provider);
    if (isFree) return 'default';

    const hasPerAgentKey = !!(agentConfig?.apiKey && agentConfig.apiKey.length > 5) || !!(agentConfig?.hasApiKey);
    return hasPerAgentKey ? 'configured' : 'disconnected';
  }

  // No per-agent config: fall back to the default provider/runtime
  const provider = aiConfig.defaultProvider;
  if (!provider || provider === 'none') return 'disconnected';

  const isFree = FREE_PROVIDERS.includes(provider);
  if (isFree) return 'default';

  const hasDefaultKey = !!(aiConfig.defaultApiKey && aiConfig.defaultApiKey.length > 5) || !!((aiConfig as any).hasDefaultApiKey);
  return hasDefaultKey ? 'configured' : 'disconnected';
}

export function isAgentConnected(agentName: string, aiConfig: AiConfig, registeredAgents: AgentInfo[]): boolean {
  return getAgentConnectionState(agentName, aiConfig, registeredAgents) !== 'disconnected';
}

export function getAgentConnectionInfo(agentName: string, aiConfig: AiConfig, registeredAgents: AgentInfo[]): AgentConnectionInfo {
  const state = getAgentConnectionState(agentName, aiConfig, registeredAgents);

  if (state === 'configured') {
    return {
      state,
      label: 'CONFIGURED',
      color: '#2BB6B3',
      detail: 'Using user-provided provider settings',
    };
  }

  if (state === 'default') {
    return {
      state,
      label: 'DEFAULT',
      color: '#22C55E',
      detail: 'Using the default runtime/provider',
    };
  }

  return {
    state,
    label: 'DISCONNECTED',
    color: '#E41937',
    detail: 'No usable provider is configured',
  };
}
