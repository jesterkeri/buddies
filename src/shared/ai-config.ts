import { logger } from '@elizaos/core';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const CONFIG_PATH = join(process.cwd(), '.buddies-ai-config.json');

export interface AgentAiConfig {
  provider: string;
  apiKey: string;
  apiUrl: string;
  model: string;
}

export interface AiConfigState {
  defaultProvider: string;
  defaultApiKey: string;
  defaultApiUrl: string;
  defaultModel: string;
  perAgent: Record<string, AgentAiConfig>;
}

const DEFAULT_CONFIG: AiConfigState = {
  defaultProvider: '',
  defaultApiKey: '',
  defaultApiUrl: '',
  defaultModel: '',
  perAgent: {},
};

let cachedConfig: AiConfigState | null = null;

export function loadAiConfig(): AiConfigState {
  if (cachedConfig) return cachedConfig;
  try {
    if (existsSync(CONFIG_PATH)) {
      const raw = readFileSync(CONFIG_PATH, 'utf-8');
      cachedConfig = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
      return cachedConfig;
    }
  } catch (err) {
    logger.error(`[BUDDIES] Failed to load AI config: ${err}`);
  }
  cachedConfig = DEFAULT_CONFIG;
  return cachedConfig;
}

export function saveAiConfig(config: AiConfigState): void {
  try {
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    cachedConfig = config;
    logger.info('[BUDDIES] AI config saved');
  } catch (err) {
    logger.error(`[BUDDIES] Failed to save AI config: ${err}`);
  }
}

// Force re-read from disk on next access (used after frontend saves config)
export function invalidateAiConfigCache(): void {
  cachedConfig = null;
}

// Check if an agent is explicitly disconnected (provider set to 'none')
export function isAgentDisconnected(agentName: string): boolean {
  // Always read fresh from disk, not cache
  try {
    if (existsSync(CONFIG_PATH)) {
      const raw = readFileSync(CONFIG_PATH, 'utf-8');
      const config: AiConfigState = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
      const perAgent = config.perAgent[agentName];
      return perAgent?.provider === 'none';
    }
  } catch {
    // Fall through
  }
  return false;
}

// Get the resolved config for a specific agent (per-agent override or default)
export function getAgentAiConfig(agentName: string): AgentAiConfig {
  const config = loadAiConfig();
  const perAgent = config.perAgent[agentName];

  if (perAgent && perAgent.provider && perAgent.provider !== '' && perAgent.provider !== 'none') {
    return perAgent;
  }

  return {
    provider: config.defaultProvider,
    apiKey: config.defaultApiKey,
    apiUrl: config.defaultApiUrl,
    model: config.defaultModel,
  };
}

// Map provider names to ElizaOS secret keys
export function getAgentSecrets(agentName: string): Record<string, string> {
  const config = getAgentAiConfig(agentName);
  const provider = config.provider || 'ollama';

  // Ollama uses its own plugin with different secret names
  if (provider === 'ollama') {
    const endpoint = config.apiUrl?.replace('/v1', '/api') || 'http://127.0.0.1:11434/api';
    return {
      OLLAMA_API_ENDPOINT: endpoint,
      OLLAMA_SMALL_MODEL: config.model || '',
      OLLAMA_LARGE_MODEL: config.model || '',
      OLLAMA_EMBEDDING_MODEL: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text:latest',
    };
  }

  // All other providers use OpenAI-compatible API
  // Set ALL model-related secrets to prevent any fallback to Ollama
  const secrets: Record<string, string> = {
    OPENAI_API_KEY: config.apiKey || '',
    OPENAI_BASE_URL: config.apiUrl || '',
    SMALL_OPENAI_MODEL: config.model || '',
    LARGE_OPENAI_MODEL: config.model || '',
    SMALL_MODEL: config.model || '',
    LARGE_MODEL: config.model || '',
    // Disable Ollama completely for this agent
    OLLAMA_API_ENDPOINT: 'disabled',
    OLLAMA_SMALL_MODEL: 'disabled',
    OLLAMA_LARGE_MODEL: 'disabled',
  };

  // Provider-specific URL defaults
  const PROVIDER_URLS: Record<string, string> = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com/v1',
    google: 'https://generativelanguage.googleapis.com/v1',
    groq: 'https://api.groq.com/openai/v1',
    openrouter: 'https://openrouter.ai/api/v1',
    deepseek: 'https://api.deepseek.com/v1',
    xai: 'https://api.x.ai/v1',
    kimi: 'https://api.moonshot.cn/v1',
    minimax: 'https://api.minimax.chat/v1',
    nosana: 'https://3gsrmj6gchzyws9bnc835apd4fh6t5tyeppmbxmzrzhn.node.k8s.prd.nos.ci/v1',
  };

  if (!secrets.OPENAI_BASE_URL && PROVIDER_URLS[provider]) {
    secrets.OPENAI_BASE_URL = PROVIDER_URLS[provider];
  }

  return secrets;
}

// Determine which plugins an agent should use based on its config
export function getAgentPlugins(agentName: string): string[] {
  const config = getAgentAiConfig(agentName);
  const provider = config.provider || 'ollama';

  if (!config.apiKey || provider === 'none' || provider === '') {
    // No provider configured — agent can't respond until user connects one
    return ['@elizaos/plugin-ollama'];
  }

  // OpenAI-compatible provider with a key — load both (ollama as fallback for embeddings)
  return ['@elizaos/plugin-openai'];
}

// Keep old function name for backward compat
export function getAgentPlugin(agentName: string): string {
  return getAgentPlugins(agentName)[0];
}
