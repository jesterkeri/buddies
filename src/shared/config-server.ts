import { createServer } from 'http';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from '@elizaos/core';
import { loadAiConfig, saveAiConfig, invalidateAiConfigCache, type AiConfigState } from './ai-config.ts';
import { triggerStandupIfNeeded } from './autonomous-loops.ts';

import { DATA_DIR } from './constants.ts';

const CONFIG_PORT = 3001;

// Provider name → OpenAI-compatible base URL
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

/**
 * Inject AI config into process.env so ElizaOS picks it up at runtime.
 * This is critical for Docker — agents boot before any config exists,
 * and ElizaOS reads secrets from process.env as a fallback.
 */
// Env vars we manage so we can clear stale ones on config switch
const MANAGED_ENV_KEYS = [
  'OPENAI_API_KEY', 'OPENAI_BASE_URL',
  'SMALL_OPENAI_MODEL', 'LARGE_OPENAI_MODEL', 'SMALL_MODEL', 'LARGE_MODEL',
  'ANTHROPIC_API_KEY', 'ANTHROPIC_SMALL_MODEL', 'ANTHROPIC_LARGE_MODEL',
  'FREQUENCY_PENALTY', 'PRESENCE_PENALTY',
];

function isUsableProvider(p: string): boolean {
  // Must be a known provider in our allowlist — typos like "openia" silently
  // resolve to the default openai URL otherwise, and the user sees a confusing
  // 401 from the wrong provider.
  return !!p && p !== '' && p !== 'none' && p !== 'ollama' && p in PROVIDER_URLS;
}

/**
 * Validate an apiUrl is a safe, expected target before persisting.
 * Empty is allowed (we fall back to PROVIDER_URLS[provider]).
 * Otherwise:
 *   - For 'ollama': must be http(s)://localhost or 127.0.0.1 (any port).
 *     Local-only by definition; the security boundary is "loopback only".
 *   - For all other providers: must be https://, hostname must match
 *     the known URL for that provider in PROVIDER_URLS.
 * Without this guard, an attacker who can POST /config can set apiUrl to
 * https://attacker.com/v1, and the next LLM call sends the user's API key
 * in `Authorization: Bearer ...` to the attacker.
 */
function isValidApiUrl(provider: string, apiUrl: string): boolean {
  if (!apiUrl || apiUrl.trim() === '') return true; // empty falls back to default
  let parsed: URL;
  try { parsed = new URL(apiUrl); } catch { return false; }

  // Ollama special case: local-only, allow http:// to loopback addresses
  if (provider === 'ollama') {
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '::1';
  }

  if (parsed.protocol !== 'https:') return false;
  // Must match the known URL for this provider exactly (host portion).
  // We compare hostnames to allow path differences (some providers use /v1, /openai/v1, etc).
  const expected = PROVIDER_URLS[provider];
  if (!expected) return false;
  let expectedHost: string;
  try { expectedHost = new URL(expected).hostname; } catch { return false; }
  return parsed.hostname === expectedHost;
}

/**
 * Validate the AiConfigState we're about to persist. Reject anything that
 * could be used to redirect LLM calls to an attacker-controlled host.
 * Returns null on success, or a string describing the first violation.
 */
function isKnownProvider(p: string): boolean {
  // 'none' (explicit disconnect) and 'ollama' (local, no apiUrl) are accepted
  // even though they're not in PROVIDER_URLS. Empty is accepted (means unset).
  if (!p || p === '' || p === 'none' || p === 'ollama' || p === 'nosana') return true;
  return p in PROVIDER_URLS;
}

function validateConfigSafe(config: any): string | null {
  if (!config || typeof config !== 'object') return 'Config must be an object';
  // Default provider+url
  if (config.defaultProvider) {
    if (typeof config.defaultProvider !== 'string') return 'defaultProvider must be a string';
    if (!isKnownProvider(config.defaultProvider)) {
      return `Unknown provider "${config.defaultProvider}". Known providers: ${Object.keys(PROVIDER_URLS).join(', ')}`;
    }
    if (config.defaultApiUrl && !isValidApiUrl(config.defaultProvider, config.defaultApiUrl)) {
      return `defaultApiUrl must be https:// and match the known host for provider "${config.defaultProvider}"`;
    }
  }
  // Per-agent
  if (config.perAgent && typeof config.perAgent === 'object') {
    for (const [name, agent] of Object.entries(config.perAgent) as [string, any][]) {
      if (!agent || typeof agent !== 'object') continue;
      if (agent.provider && typeof agent.provider !== 'string') return `perAgent.${name}.provider must be a string`;
      if (agent.provider && !isKnownProvider(agent.provider)) {
        return `perAgent.${name}.provider "${agent.provider}" is unknown. Known providers: ${Object.keys(PROVIDER_URLS).join(', ')}`;
      }
      if (agent.provider && agent.apiUrl && !isValidApiUrl(agent.provider, agent.apiUrl)) {
        return `perAgent.${name}.apiUrl must be https:// and match the known host for provider "${agent.provider}"`;
      }
    }
  }
  return null;
}

function applyConfigToEnv(config: AiConfigState): void {
  // CRITICAL: Do NOT seed OPENAI_* / ANTHROPIC_* / SMALL_MODEL / LARGE_MODEL
  // into process.env. ElizaOS core dumps ALL of process.env into
  // character.settings.secrets (see @elizaos/core index.node.js ~line 50941),
  // then mergeAgentSettings (~line 49167) spreads settingsSecrets LAST over
  // the per-agent character.secrets Proxy. Any OPENAI_API_KEY in process.env
  // overrides the per-agent Proxy values for EVERY agent. That's the bug
  // where all agents end up calling the same provider.
  //
  // Per-agent routing is the source of truth. It lives in ai-config.ts via
  // getAgentSecrets(agentName), a Proxy that returns per-agent values. Leaving
  // process.env empty means settingsSecrets doesn't clobber characterSecrets,
  // so each agent keeps its own provider/key across the merge.
  //
  // We DO clear any stale managed vars in case a previous buddies build left
  // them populated. We also set OLLAMA_API_ENDPOINT when any agent uses ollama,
  // because plugin-openai (routed at localhost:11434/v1) and plugin-ollama
  // both need a reachable local endpoint, and that IS the same across agents.

  // Clear stale managed vars so previous buddies builds / user shell env don't
  // leak into character.settings.secrets.
  for (const k of MANAGED_ENV_KEYS) delete process.env[k];

  const anyAgentUsesOllama = !!(config.perAgent && Object.values(config.perAgent).some((a) => a?.provider === 'ollama'));
  if (anyAgentUsesOllama) {
    process.env.OLLAMA_API_ENDPOINT = 'http://localhost:11434/api';
  }

  const connectedAgents = config.perAgent
    ? Object.entries(config.perAgent)
        .filter(([_, a]) => a?.apiKey && a?.provider && a.provider !== 'none')
        .map(([name, a]) => `${name}=${a.provider}`)
    : [];
  logger.info(
    `[BUDDIES] Per-agent secrets via Proxy. Connected: ${connectedAgents.length > 0 ? connectedAgents.join(', ') : 'none'}. ollamaActive=${anyAgentUsesOllama}`
  );
}
const SESSION_PATH = join(DATA_DIR, '.buddies-session-config.json');
const TASKS_PATH = join(DATA_DIR, '.buddies-tasks.json');
const ONBOARDING_PATH = join(DATA_DIR, '.buddies-onboarding.json');
const SESSION_EVENT_PATH = join(DATA_DIR, '.buddies-session-event.json');
let started = false;

function loadSession(): any {
  try {
    if (existsSync(SESSION_PATH)) return JSON.parse(readFileSync(SESSION_PATH, 'utf-8'));
  } catch {}
  return {};
}

function saveSession(data: any): void {
  writeFileSync(SESSION_PATH, JSON.stringify(data, null, 2));
}

// Expose user profile for agents to read (skills, preferences)
export function getUserProfile(): { name: string; languages: string[]; frameworks: string[]; chains: string[]; experience: string } {
  try {
    if (existsSync(ONBOARDING_PATH)) {
      const d = JSON.parse(readFileSync(ONBOARDING_PATH, 'utf-8'));
      return {
        name: d.name || '',
        languages: d.languages || [],
        frameworks: d.frameworks || [],
        chains: d.chains || [],
        experience: d.experience || '',
      };
    }
  } catch {}
  return { name: '', languages: [], frameworks: [], chains: [], experience: '' };
}

// Expose for other modules to read GitHub config
export function getSessionConfig(): { githubToken: string; repoUrl: string; repoConnected: boolean; repoFullName: string } {
  const d = loadSession();
  return {
    githubToken: d.githubToken || '',
    repoUrl: d.repoUrl || '',
    repoConnected: d.repoConnected || false,
    repoFullName: d.repoFullName || '',
  };
}

/**
 * Standalone HTTP server for config + session management.
 * Runs on port 3001 alongside ElizaOS (port 3000).
 */
export function startConfigServer(): void {
  if (started) return;
  started = true;

  const MAX_BODY_SIZE = 1024 * 1024; // 1MB request body limit

  /**
   * Read a request body up to MAX_BODY_SIZE. Returns the body string on
   * success, or null if the limit was exceeded (in which case this helper
   * has already written a 413 response and the caller must NOT touch res).
   * Fixes the previous race where the inline pattern wrote 413 in the
   * 'data' handler and then ran the JSON.parse path in 'end', causing
   * ERR_HTTP_HEADERS_SENT and a stuck handler.
   */
  function readBody(req: any, res: any): Promise<string | null> {
    return new Promise((resolve) => {
      let body = '';
      let limitExceeded = false;
      req.on('data', (chunk: Buffer) => {
        if (limitExceeded) return;
        body += chunk;
        if (body.length > MAX_BODY_SIZE) {
          limitExceeded = true;
          res.writeHead(413);
          res.end(JSON.stringify({ success: false, error: 'Payload too large' }));
          req.destroy();
          resolve(null);
        }
      });
      req.on('end', () => {
        if (limitExceeded) return; // already resolved
        resolve(body);
      });
      req.on('error', () => {
        if (!limitExceeded) resolve(null);
      });
    });
  }

  const server = createServer((req, res) => {
    const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'];
    const origin = req.headers.origin || '';
    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // CSRF defense: POST requests must declare application/json so the browser
    // is forced to send a CORS preflight (which our origin allowlist then
    // rejects for cross-site contexts). Without this, a malicious page could
    // POST text/plain as a CORS simple request and bypass the Origin check.
    if (req.method === 'POST') {
      const ct = (req.headers['content-type'] || '').toLowerCase();
      if (!ct.startsWith('application/json')) {
        res.writeHead(415);
        res.end(JSON.stringify({ success: false, error: 'Content-Type must be application/json' }));
        return;
      }
    }

    // ── AI Config ──
    if (req.method === 'GET' && req.url === '/config') {
      // Redact apiKey values — return empty string + a hasApiKey boolean.
      // Defense in depth on top of the 127.0.0.1 bind: even local processes
      // that read GET /config never see the raw key, only that one is set.
      // Frontend uses hasApiKey for "is configured" UI; the real key still
      // lives in localStorage on the frontend side and on disk on the backend.
      const raw = loadAiConfig();
      const redactedPerAgent: Record<string, any> = {};
      for (const [name, agent] of Object.entries(raw.perAgent || {})) {
        redactedPerAgent[name] = {
          provider: agent.provider,
          apiUrl: agent.apiUrl,
          model: agent.model,
          apiKey: '',
          hasApiKey: !!agent.apiKey,
        };
      }
      const redacted = {
        defaultProvider: raw.defaultProvider,
        defaultApiUrl: raw.defaultApiUrl,
        defaultModel: raw.defaultModel,
        defaultApiKey: '',
        hasDefaultApiKey: !!raw.defaultApiKey,
        perAgent: redactedPerAgent,
      };
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, data: redacted }));
      return;
    }

    if (req.method === 'POST' && req.url === '/config') {
      readBody(req, res).then((body) => {
        if (body === null) return; // 413 already sent
        try {
          const config = JSON.parse(body);
          const violation = validateConfigSafe(config);
          if (violation) {
            res.writeHead(400);
            res.end(JSON.stringify({ success: false, error: violation }));
            logger.warn(`[BUDDIES] Rejected config save: ${violation}`);
            return;
          }
          saveAiConfig(config);
          invalidateAiConfigCache();
          applyConfigToEnv(config);
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, message: 'Config saved.' }));
          logger.info(`[BUDDIES] AI config saved. hasKey=${!!process.env.OPENAI_API_KEY} provider=${config?.defaultProvider || 'none'}`);
          triggerStandupIfNeeded();
        } catch {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
        }
      });
      return;
    }

    // ── Session (GitHub + project tracking) ──
    if (req.method === 'GET' && req.url === '/session') {
      // Redact githubToken — return empty + hasGithubToken boolean.
      // Same rationale as /config redaction. Frontend uses hasGithubToken
      // for "is connected" UI and stores the real token in localStorage.
      const raw = loadSession();
      const redacted = {
        ...raw,
        githubToken: '',
        hasGithubToken: !!raw.githubToken,
      };
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, data: redacted }));
      return;
    }

    if (req.method === 'POST' && req.url === '/session') {
      readBody(req, res).then((body) => {
        if (body === null) return;
        try {
          const data = JSON.parse(body);
          saveSession(data);
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, message: 'Session config saved.' }));
          logger.info('[BUDDIES] Session config saved (repo: ' + (data.repoFullName || 'none') + ')');
        } catch {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
        }
      });
      return;
    }

    // ── Onboarding (user profile/skills) ──
    if (req.method === 'GET' && req.url === '/onboarding') {
      try {
        if (existsSync(ONBOARDING_PATH)) {
          res.writeHead(200);
          res.end(readFileSync(ONBOARDING_PATH, 'utf-8'));
        } else {
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, data: {} }));
        }
      } catch {
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, data: {} }));
      }
      return;
    }

    if (req.method === 'POST' && req.url === '/onboarding') {
      readBody(req, res).then((body) => {
        if (body === null) return;
        try {
          const data = JSON.parse(body);
          writeFileSync(ONBOARDING_PATH, JSON.stringify(data, null, 2));
          res.writeHead(200);
          res.end(JSON.stringify({ success: true }));
          logger.info(`[BUDDIES] Onboarding profile saved for: ${data.name || 'unknown'}`);
        } catch {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
        }
      });
      return;
    }

    // ── Code Reviews ──
    if (req.method === 'GET' && req.url === '/reviews') {
      const reviewsPath = join(DATA_DIR, '.buddies-reviews.json');
      try {
        if (existsSync(reviewsPath)) {
          res.writeHead(200);
          res.end(readFileSync(reviewsPath, 'utf-8'));
        } else {
          res.writeHead(200);
          res.end('[]');
        }
      } catch {
        res.writeHead(200);
        res.end('[]');
      }
      return;
    }

    // ── Autonomous Messages (agent-to-agent) ──
    if (req.method === 'GET' && req.url === '/autonomous-messages') {
      const msgsPath = join(DATA_DIR, '.buddies-autonomous-messages.json');
      try {
        if (existsSync(msgsPath)) {
          res.writeHead(200);
          res.end(readFileSync(msgsPath, 'utf-8'));
        } else {
          res.writeHead(200);
          res.end('[]');
        }
      } catch {
        res.writeHead(200);
        res.end('[]');
      }
      return;
    }

    // ── Tasks ──
    if (req.method === 'GET' && req.url === '/tasks') {
      try {
        if (existsSync(TASKS_PATH)) {
          const tasks = JSON.parse(readFileSync(TASKS_PATH, 'utf-8'));
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, data: tasks }));
        } else {
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, data: [] }));
        }
      } catch {
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, data: [] }));
      }
      return;
    }

    if (req.method === 'POST' && req.url === '/tasks') {
      readBody(req, res).then((body) => {
        if (body === null) return;
        try {
          const tasks = JSON.parse(body);
          writeFileSync(TASKS_PATH, JSON.stringify(tasks, null, 2));
          res.writeHead(200);
          res.end(JSON.stringify({ success: true }));
        } catch {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
        }
      });
      return;
    }

    // ── Session Events (frontend notifies backend of START/END) ──
    if (req.method === 'POST' && req.url === '/session-event') {
      readBody(req, res).then((body) => {
        if (body === null) return;
        try {
          const data = JSON.parse(body);
          const event = data.event;
          if (event !== 'start' && event !== 'end') {
            res.writeHead(400);
            res.end(JSON.stringify({ success: false, error: 'Invalid event type' }));
            return;
          }
          const timestamp = data.timestamp || Date.now();
          const state = {
            workSessionActive: event === 'start',
            workSessionStartedAt: event === 'start' ? timestamp : undefined,
            workSessionEndedAt: event === 'end' ? timestamp : undefined,
            lastEvent: event,
            lastEventAt: timestamp,
          };
          writeFileSync(SESSION_EVENT_PATH, JSON.stringify(state, null, 2));
          res.writeHead(200);
          res.end(JSON.stringify({ success: true }));
          logger.info(`[BUDDIES] Session event: ${event}`);
        } catch {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
        }
      });
      return;
    }

    if (req.method === 'GET' && req.url === '/session-event') {
      try {
        if (existsSync(SESSION_EVENT_PATH)) {
          res.writeHead(200);
          res.end(readFileSync(SESSION_EVENT_PATH, 'utf-8'));
        } else {
          res.writeHead(200);
          res.end(JSON.stringify({ workSessionActive: false }));
        }
      } catch {
        res.writeHead(200);
        res.end(JSON.stringify({ workSessionActive: false }));
      }
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  // Apply any existing config from disk (e.g., after container restart with persisted volume)
  const existingConfig = loadAiConfig();
  applyConfigToEnv(existingConfig);

  // Bind to 127.0.0.1 by default. The config server has no auth and stores
  // API keys + GitHub tokens. Exposing it on 0.0.0.0 lets any LAN peer
  // curl /config to harvest credentials. For Nosana / multi-host setups
  // where the frontend needs to reach the backend over the network, set
  // BUDDIES_CONFIG_BIND_HOST=0.0.0.0 explicitly AND add a reverse proxy
  // with auth in front of port 3001.
  const bindHost = process.env.BUDDIES_CONFIG_BIND_HOST || '127.0.0.1';
  server.listen(CONFIG_PORT, bindHost, () => {
    logger.info(`[BUDDIES] Config server running on ${bindHost}:${CONFIG_PORT}`);
    if (bindHost !== '127.0.0.1') {
      logger.warn(`[BUDDIES] Config server bound to ${bindHost} — make sure a reverse proxy with auth is in front of port ${CONFIG_PORT}`);
    }
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      logger.info(`[BUDDIES] Config server port ${CONFIG_PORT} already in use, skipping`);
    } else {
      logger.error(`[BUDDIES] Config server error: ${err}`);
    }
  });
}
