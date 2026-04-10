import { logger } from '@elizaos/core';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { DATA_DIR } from './constants.ts';

const CONFIG_PATH = join(DATA_DIR, '.buddies-ai-config.json');

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

let cachedConfig: AiConfigState | null = DEFAULT_CONFIG;

export function loadAiConfig(): AiConfigState {
  try {
    if (existsSync(CONFIG_PATH)) {
      const raw = readFileSync(CONFIG_PATH, 'utf-8');
      const loaded = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
      cachedConfig = loaded;
      return loaded;
    }
  } catch (err) {
    logger.error(`[BUDDIES] Failed to load AI config: ${err}`);
  }
  return cachedConfig ?? DEFAULT_CONFIG;
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
// Last-known-good config for fault tolerance. If the config file is being
// rewritten by the frontend and we read a partial/corrupt JSON, we fall back
// to this snapshot instead of marking every agent as disconnected.
let lastGoodConfig: AiConfigState | null = null;

function checkAgentDisconnected(config: AiConfigState, agentName: string): boolean {
  const perAgent = config.perAgent[agentName];

  // Explicitly disconnected
  if (perAgent?.provider === 'none') return true;

  // Provider set but no API key = broken, treat as disconnected
  if (perAgent?.provider && perAgent.provider !== '' && !perAgent.apiKey) return true;

  // No per-agent config: check if a default provider+key exists
  if (!perAgent || !perAgent.provider || perAgent.provider === '') {
    const hasDefault = config.defaultProvider && config.defaultProvider !== 'none' && config.defaultApiKey;
    return !hasDefault;
  }

  // Agent has valid provider + key = connected
  return false;
}

export function isAgentDisconnected(agentName: string): boolean {
  // Try to read fresh from disk
  if (existsSync(CONFIG_PATH)) {
    try {
      const raw = readFileSync(CONFIG_PATH, 'utf-8');
      const config: AiConfigState = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
      lastGoodConfig = config; // snapshot for fault tolerance
      return checkAgentDisconnected(config, agentName);
    } catch (err) {
      // Parse/read error — config file may be mid-write. Fall back to last good.
      logger.warn(`[BUDDIES] isAgentDisconnected: config read failed (${err}), using last known good`);
      if (lastGoodConfig) {
        return checkAgentDisconnected(lastGoodConfig, agentName);
      }
      return false;
    }
  }
  // File missing — could be a transient mid-rewrite where the writer
  // unlinked the old file before writing the new one. Use last known good
  // if we have one. Only treat as "fresh install, no config" if we have
  // never successfully read a config in this process.
  if (lastGoodConfig) {
    return checkAgentDisconnected(lastGoodConfig, agentName);
  }
  return true;
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

// Provider-specific OpenAI-compatible URL defaults
const PROVIDER_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  google: 'https://generativelanguage.googleapis.com/v1beta/openai',
  groq: 'https://api.groq.com/openai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  deepseek: 'https://api.deepseek.com/v1',
  xai: 'https://api.x.ai/v1',
  kimi: 'https://api.moonshot.cn/v1',
  minimax: 'https://api.minimax.chat/v1',
  nosana: 'https://3gsrmj6gchzyws9bnc835apd4fh6t5tyeppmbxmzrzhn.node.k8s.prd.nos.ci/v1',
};

// Provider-specific embedding config (only providers that SUPPORT embeddings)
const PROVIDER_EMBEDDING_MODELS: Record<string, string> = {
  google: 'gemini-embedding-001',
  openai: 'text-embedding-3-small',
};

// Provider-specific embedding dimensions (must match what the model returns)
const PROVIDER_EMBEDDING_DIMS: Record<string, string> = {
  google: '3072',   // gemini-embedding-001 returns 3072-dim vectors
  openai: '1536',   // text-embedding-3-small returns 1536-dim vectors
};

// Providers that do NOT support embeddings (no /embeddings endpoint)
const NO_EMBEDDING_PROVIDERS = ['groq', 'deepseek', 'xai', 'kimi', 'minimax', 'ollama'];

function buildSecrets(agentName: string): Record<string, string> {
  const config = getAgentAiConfig(agentName);
  const provider = config.provider || '';

  // No provider configured yet — return empty (will use process.env fallback).
  // Returning {} means character.secrets has nothing for this agent, and the
  // plugin-openai init warning will fire but model handlers still register
  // at the plugin level, so other agents aren't affected.
  if (!provider || provider === 'none') {
    return {};
  }

  // Ollama is routed through plugin-openai's OpenAI-compatible endpoint
  // (localhost:11434/v1). No character in this project has plugin-ollama
  // in its plugin list, so plugin-openai is the only text-generation path.
  // Treat ollama like any other OpenAI-compat provider with a dummy apiKey
  // (ollama ignores the Authorization header).
  const isOllama = provider === 'ollama';
  const apiUrl = config.apiUrl || (isOllama ? 'http://localhost:11434/v1' : PROVIDER_URLS[provider] || '');
  const apiKey = isOllama ? (config.apiKey || 'ollama') : (config.apiKey || '');

  const secrets: Record<string, string> = {
    OPENAI_API_KEY: apiKey,
    OPENAI_BASE_URL: apiUrl,
    SMALL_OPENAI_MODEL: config.model || '',
    LARGE_OPENAI_MODEL: config.model || '',
    SMALL_MODEL: config.model || '',
    LARGE_MODEL: config.model || '',
    // We deliberately do NOT set OLLAMA_API_ENDPOINT here. plugin-ollama is
    // not in any character's plugin list, so these env vars are a no-op on
    // the agent runtime. The global process.env.OLLAMA_API_ENDPOINT handled
    // in config-server.ts / src/index.ts covers the boot-time needs.
  };

  // Embedding config: use this provider if it supports embeddings, otherwise
  // find another connected agent's provider that does.
  if (!NO_EMBEDDING_PROVIDERS.includes(provider)) {
    secrets.OPENAI_EMBEDDING_API_KEY = config.apiKey || '';
    secrets.OPENAI_EMBEDDING_URL = apiUrl;
    const embeddingModel = PROVIDER_EMBEDDING_MODELS[provider];
    if (embeddingModel) secrets.OPENAI_EMBEDDING_MODEL = embeddingModel;
    const embeddingDims = PROVIDER_EMBEDDING_DIMS[provider];
    if (embeddingDims) secrets.OPENAI_EMBEDDING_DIMENSIONS = embeddingDims;
  } else {
    // Provider doesn't support embeddings — find a fallback from another agent
    const fullConfig = loadAiConfig();
    let fallbackFound = false;
    for (const [name, agentCfg] of Object.entries(fullConfig.perAgent || {})) {
      if (name === agentName) continue;
      if (agentCfg.apiKey && agentCfg.provider && !NO_EMBEDDING_PROVIDERS.includes(agentCfg.provider) && agentCfg.provider !== 'none') {
        const fbUrl = agentCfg.apiUrl || PROVIDER_URLS[agentCfg.provider] || '';
        secrets.OPENAI_EMBEDDING_API_KEY = agentCfg.apiKey;
        secrets.OPENAI_EMBEDDING_URL = fbUrl;
        const fbModel = PROVIDER_EMBEDDING_MODELS[agentCfg.provider];
        if (fbModel) secrets.OPENAI_EMBEDDING_MODEL = fbModel;
        const fbDims = PROVIDER_EMBEDDING_DIMS[agentCfg.provider];
        if (fbDims) secrets.OPENAI_EMBEDDING_DIMENSIONS = fbDims;
        fallbackFound = true;
        break;
      }
    }
    if (!fallbackFound) {
      // No fallback available — embeddings will fail but text gen will work
      secrets.OPENAI_EMBEDDING_API_KEY = config.apiKey || '';
      secrets.OPENAI_EMBEDDING_URL = apiUrl;
    }
  }

  // Provider-specific overrides
  if (provider === 'google') {
    secrets.FREQUENCY_PENALTY = '0';
    secrets.PRESENCE_PENALTY = '0';
  }

  if (provider === 'anthropic') {
    secrets.ANTHROPIC_API_KEY = config.apiKey || '';
    secrets.ANTHROPIC_SMALL_MODEL = config.model || '';
    secrets.ANTHROPIC_LARGE_MODEL = config.model || '';
  }

  return secrets;
}

/**
 * Returns a Proxy-backed secrets object that reads fresh from the config file
 * on every property access. This is critical because character.secrets is set
 * once at module load, but the user may configure API keys later via the frontend.
 *
 * ElizaOS runtime.getSetting(key) reads character.secrets[key], so the Proxy
 * ensures it always gets the latest value without needing a process restart.
 */
export function getAgentSecrets(agentName: string): Record<string, string> {
  return new Proxy({} as Record<string, string>, {
    get(_target, prop: string) {
      const secrets = buildSecrets(agentName);
      return secrets[prop];
    },
    has(_target, prop: string) {
      const secrets = buildSecrets(agentName);
      return prop in secrets;
    },
    ownKeys() {
      const secrets = buildSecrets(agentName);
      return Object.keys(secrets);
    },
    getOwnPropertyDescriptor(_target, prop: string) {
      const secrets = buildSecrets(agentName);
      if (prop in secrets) {
        return { configurable: true, enumerable: true, value: secrets[prop] };
      }
      return undefined;
    },
  });
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
