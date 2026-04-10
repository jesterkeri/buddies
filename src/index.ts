// Patch fetch to strip unsupported params for Google Gemini
import './patches/google-compat.ts';

// CRITICAL: Load AI config into process.env BEFORE any plugins import.
// Plugin-openai checks process.env.OPENAI_API_KEY at init — if empty, it won't register model handlers.
// This must run before ElizaOS loads character plugins.
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
const DATA_DIR_BOOT = process.env.NODE_ENV === 'production' ? join(process.cwd(), 'data') : process.cwd();
const CONFIG_PATH_BOOT = join(DATA_DIR_BOOT, '.buddies-ai-config.json');
// Provider URL defaults — used if a per-agent config doesn't include apiUrl
const PROVIDER_URLS_BOOT: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  google: 'https://generativelanguage.googleapis.com/v1beta/openai',
  groq: 'https://api.groq.com/openai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  deepseek: 'https://api.deepseek.com/v1',
  xai: 'https://api.x.ai/v1',
};

function isUsableProvider(p: string): boolean {
  // Must be a known provider in our allowlist — typos like "openia" silently
  // resolve to the default openai URL otherwise.
  return !!p && p !== '' && p !== 'none' && p !== 'ollama' && p in PROVIDER_URLS_BOOT;
}

try {
  if (existsSync(CONFIG_PATH_BOOT)) {
    const cfg = JSON.parse(readFileSync(CONFIG_PATH_BOOT, 'utf-8'));
    // Try the DEFAULT config first. If the default isn't usable (no key OR
    // bad provider), fall back to the FIRST valid per-agent config. This is
    // required because @elizaos/plugin-openai checks process.env.OPENAI_API_KEY
    // at INIT time. Without ANY env key, it won't register model handlers and
    // all agents become no-ops.
    let key = cfg.defaultApiKey || '';
    let url = cfg.defaultApiUrl || '';
    let model = cfg.defaultModel || '';
    let provider = cfg.defaultProvider || '';

    // Default is unusable if missing key OR bad provider — try per-agent fallback
    const defaultUsable = key && isUsableProvider(provider);
    if (!defaultUsable && cfg.perAgent && typeof cfg.perAgent === 'object') {
      for (const a of Object.values(cfg.perAgent) as any[]) {
        if (a && a.apiKey && isUsableProvider(a.provider)) {
          key = a.apiKey;
          url = a.apiUrl || PROVIDER_URLS_BOOT[a.provider] || '';
          model = a.model || '';
          provider = a.provider;
          break;
        }
      }
    }

    // CRITICAL: Do NOT seed OPENAI_API_KEY / OPENAI_BASE_URL / ANTHROPIC_API_KEY
    // into process.env. ElizaOS core dumps ALL of process.env into
    // character.settings.secrets (see @elizaos/core index.node.js ~line 50941),
    // then mergeAgentSettings spreads settingsSecrets LAST over the per-agent
    // character.secrets Proxy (~line 49167), which destroys per-agent routing:
    // every agent ends up with the same global OPENAI_API_KEY.
    //
    // Per-agent routing is the source of truth. It lives in src/shared/ai-config.ts
    // via getAgentSecrets(agentName), a Proxy that returns per-agent values from
    // the config file. Leaving process.env empty means settingsSecrets doesn't
    // clobber characterSecrets, so each agent keeps its own provider/key.
    //
    // We still set OLLAMA_API_ENDPOINT because plugin-ollama (if loaded) and
    // plugin-openai (when routed via OpenAI-compat) both need a reachable
    // local endpoint, and that IS the same across agents.
    const anyAgentUsesOllama = !!(cfg.perAgent && Object.values(cfg.perAgent as any).some((a: any) => a?.provider === 'ollama'));
    if (anyAgentUsesOllama) {
      process.env.OLLAMA_API_ENDPOINT = 'http://localhost:11434/api';
    }
    console.log(`[BOOT] Per-agent secrets via Proxy (ollamaActive=${anyAgentUsesOllama}). No global OPENAI_API_KEY seeded.`);
    // Keep `key`, `url`, `model`, `provider` locally resolved for logging only:
    void key; void url; void model; void provider;
  }
} catch (err) {
  console.error('[BOOT] Failed to seed config from disk:', err);
}

import { logger, type ProjectAgent, type Project } from '@elizaos/core';
import chief from './chief/index.ts';
import hawk from './hawk/index.ts';
import radar from './radar/index.ts';
import tracker from './tracker/index.ts';
import beans from './beans/index.ts';

const allAgents: ProjectAgent[] = [chief, hawk, radar, tracker, beans];

// Support selective agent startup via CLI flags
// e.g.: elizaos start -- --chief --hawk
const rawArgs = process.argv.slice(2);
let enabledAgents = allAgents;

const agentsMap: Record<string, ProjectAgent> = {
  chief,
  hawk,
  radar,
  tracker,
  beans,
};

const doubleDashIndex = rawArgs.indexOf('--');
let potentialFlags: string[] = [];

if (doubleDashIndex !== -1) {
  potentialFlags = rawArgs.slice(doubleDashIndex + 1).filter((a) => a.startsWith('--'));
} else {
  potentialFlags = rawArgs.filter((a) => a.startsWith('--') && a !== '--');
}

if (potentialFlags.length > 0) {
  const requested = potentialFlags.map((f) => f.replace(/^--/, '').toLowerCase());
  const matched = allAgents.filter((agent) => {
    const key = Object.keys(agentsMap).find((k) => agentsMap[k] === agent);
    return key ? requested.includes(key.toLowerCase()) : false;
  });
  if (matched.length > 0) {
    enabledAgents = matched;
  } else if (potentialFlags.length > 0) {
    logger.error(`No agents found matching flags: ${potentialFlags.join(', ')}`);
    logger.error('Available agents: chief, hawk, radar, tracker, beans');
    process.exit(1);
  }
}

logger.info(
  `Buddies initialized: ${enabledAgents.length} agents — ${enabledAgents.map((a) => a.character.name).join(', ')}`
);

const project: Project = {
  agents: enabledAgents,
};

export default project;
