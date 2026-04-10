/**
 * Preload script — runs BEFORE ElizaOS loads plugins.
 *
 * CRITICAL: Do NOT seed OPENAI_* / ANTHROPIC_* into process.env here.
 * ElizaOS core dumps ALL of process.env into character.settings.secrets, then
 * mergeAgentSettings spreads settingsSecrets LAST over the per-agent Proxy
 * in character.secrets — which means ANY OPENAI_API_KEY in process.env
 * overrides the per-agent provider for every agent. That's the bug where
 * all agents end up calling the same provider.
 *
 * Per-agent routing lives in src/shared/ai-config.ts via getAgentSecrets(name).
 * Leaving process.env clean of the OPENAI_* keys lets each agent's per-agent
 * Proxy value survive the mergeAgentSettings merge.
 *
 * We still set OLLAMA_API_ENDPOINT if any agent uses ollama, because that
 * IS the same across agents (local-only).
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const DATA_DIR = process.env.NODE_ENV === 'production' ? join(process.cwd(), 'data') : process.cwd();
const CONFIG_PATH = join(DATA_DIR, '.buddies-ai-config.json');

try {
  if (existsSync(CONFIG_PATH)) {
    const cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
    const anyAgentUsesOllama = !!(cfg.perAgent && Object.values(cfg.perAgent as any).some((a: any) => a?.provider === 'ollama'));
    if (anyAgentUsesOllama) {
      process.env.OLLAMA_API_ENDPOINT = 'http://localhost:11434/api';
    }
    console.log(`[PRELOAD] Per-agent secrets via Proxy (ollamaActive=${anyAgentUsesOllama}). No global OPENAI_API_KEY seeded.`);
  }
} catch (err) {
  console.error(`[PRELOAD] Failed to load AI config: ${err}`);
}
