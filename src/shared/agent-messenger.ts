import { logger } from '@elizaos/core';
import { apiCall } from './http.ts';
import { AGENT_COOLDOWN_MS } from './constants.ts';
import { isAgentDisconnected } from './ai-config.ts';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { DATA_DIR, DEFAULT_MESSAGE_SERVER_ID } from './constants.ts';

/**
 * Agent-to-agent messenger via ElizaOS Sessions API.
 * Uses HTTP transport for guaranteed responses — no team channel, no message bus.
 * The loop controls routing; the LLM generates content.
 */

// Cache: agentName → agentId
const agentIdCache = new Map<string, string>();
// Cache: "sender:target" → sessionId
const sessionCache = new Map<string, string>();
// Cache: "target:user" → world ensured
const worldCache = new Set<string>();
// Per-agent cooldown tracking
const lastMessageTime = new Map<string, number>();

const MESSAGES_FILE = join(DATA_DIR, '.buddies-autonomous-messages.json');

export interface AgentMessage {
  id: string;
  from: string;
  to: string;
  content: string;
  response?: string;
  timestamp: number;
}

function isStaleSessionError(err: unknown): boolean {
  const msg = String(err || '').toLowerCase();
  return msg.includes('session') && (
    msg.includes('not found') ||
    msg.includes('expired') ||
    msg.includes('invalid')
  );
}

// ── Agent ID lookup ──

async function refreshAgentIds(): Promise<void> {
  try {
    const res = await apiCall('/api/agents');
    const agents = res?.data?.agents || res?.agents || res?.data || [];
    if (!Array.isArray(agents)) return;

    for (const agent of agents) {
      const id = agent.id || agent.agentId;
      const name = agent.name || agent.character?.name;
      if (id && name) agentIdCache.set(name, id);
    }
  } catch (err) {
    logger.error(`[MESSENGER] Failed to refresh agent IDs: ${err}`);
  }
}

async function getAgentId(agentName: string, retries = 3): Promise<string | null> {
  const cached = agentIdCache.get(agentName);
  if (cached) return cached;

  for (let i = 0; i < retries; i++) {
    await refreshAgentIds();
    const id = agentIdCache.get(agentName);
    if (id) return id;

    if (i < retries - 1) {
      logger.info(`[MESSENGER] Agent "${agentName}" not registered yet, retrying (${i + 1}/${retries})...`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  return null;
}

async function ensureWorldForUser(agentId: string, userId: string): Promise<void> {
  const key = `${agentId}:${userId}`;
  if (worldCache.has(key)) return;

  try {
    await apiCall(`/api/agents/${agentId}/worlds`, {
      method: 'POST',
      body: JSON.stringify({
        name: `agent-${userId.slice(0, 8)}`,
        messageServerId: DEFAULT_MESSAGE_SERVER_ID,
        metadata: {
          ownership: { ownerId: userId },
          roles: { [userId]: 'OWNER' },
          settings: {},
        },
      }),
    });
  } catch {
    // World may already exist or the server may reject duplicates.
    // Either way, we should not fail the session attempt for that.
  }

  worldCache.add(key);
}

// ── Session management ──

async function getOrCreateSession(senderAgentId: string, targetAgentId: string, forceNew = false): Promise<string | null> {
  const key = `${senderAgentId}:${targetAgentId}`;
  if (!forceNew) {
    const cached = sessionCache.get(key);
    if (cached) return cached;
  }
  sessionCache.delete(key);

  try {
    await ensureWorldForUser(targetAgentId, senderAgentId);

    // Create a session where the sender talks to the target agent
    // Use sender's ID as userId (the "user" in this session is the sending agent)
    const res = await apiCall('/api/messaging/sessions', {
      method: 'POST',
      body: JSON.stringify({ agentId: targetAgentId, userId: senderAgentId }),
    });

    const sessionId = res?.sessionId || res?.data?.sessionId;
    if (sessionId) {
      sessionCache.set(key, sessionId);
      return sessionId;
    }
    return null;
  } catch (err) {
    logger.error(`[MESSENGER] Failed to create session: ${err}`);
    return null;
  }
}

// ── Message storage ──

function loadStoredMessages(): AgentMessage[] {
  try {
    if (existsSync(MESSAGES_FILE)) {
      return JSON.parse(readFileSync(MESSAGES_FILE, 'utf-8'));
    }
  } catch {}
  return [];
}

function storeMessage(msg: AgentMessage): void {
  try {
    const messages = loadStoredMessages();
    messages.push(msg);
    // Keep last 100 autonomous messages
    const trimmed = messages.slice(-100);
    writeFileSync(MESSAGES_FILE, JSON.stringify(trimmed, null, 2));
  } catch (err) {
    logger.error(`[MESSENGER] Failed to store message: ${err}`);
  }
}

// ── Main API ──

/**
 * Send a message from one agent to another via the Sessions API.
 * Uses HTTP transport — blocks until the target agent responds.
 * Returns the response text, or null if sending failed.
 *
 * @param fromAgent - Name of the sending agent (e.g., 'Chief')
 * @param text - Message content
 * @param toAgent - Name of the target agent (e.g., 'Hawk'). Required.
 */
export async function sendAgentMessage(
  fromAgent: string,
  text: string,
  toAgent?: string,
  options?: { skipCooldown?: boolean }
): Promise<{ sent: boolean; response?: string }> {
  // If no target specified, send to Chief (team lead routes everything)
  const targetName = toAgent || 'Chief';

  // Don't send to self
  if (fromAgent === targetName) {
    return { sent: false };
  }

  // Check if target agent is connected (has a working LLM)
  if (isAgentDisconnected(targetName)) {
    logger.info(`[MESSENGER] Skipping ${targetName} — not connected`);
    return { sent: false };
  }

  // Per-pair cooldown (allows Chief to talk to Hawk, Radar, Buddy in sequence)
  // Task work messages skip cooldown — they need to reach the agent immediately
  const pairKey = `${fromAgent}:${targetName}`;
  const now = Date.now();
  if (!options?.skipCooldown) {
    const lastTime = lastMessageTime.get(pairKey) || 0;
    if (now - lastTime < AGENT_COOLDOWN_MS) {
      logger.info(`[MESSENGER] Skipping ${fromAgent} → ${targetName} — cooldown active`);
      return { sent: false };
    }
  }

  // Look up agent IDs
  const fromId = await getAgentId(fromAgent);
  const toId = await getAgentId(targetName);
  if (!fromId || !toId) {
    logger.warn(`[MESSENGER] Cannot send — agent ID not found (from: ${fromAgent}, to: ${targetName})`);
    return { sent: false };
  }

  // Get or create session
  const sessionId = await getOrCreateSession(fromId, toId);
  if (!sessionId) {
    logger.warn(`[MESSENGER] Cannot send — failed to create session (${fromAgent} → ${targetName})`);
    return { sent: false };
  }

  // Send with stale-session retry
  for (let attempt = 0; attempt < 2; attempt++) {
    const sid = attempt === 0 ? sessionId : await getOrCreateSession(fromId, toId, true);
    if (!sid) continue;

    try {
      const res = await apiCall(`/api/messaging/sessions/${sid}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: text, transport: 'http' }),
      });

      lastMessageTime.set(pairKey, now);

      const agentResponse = res?.agentResponse;
      const responseText = agentResponse?.text || '';

      logger.info(`[MESSENGER] ${fromAgent} → ${targetName}: sent. Response: ${responseText.slice(0, 80)}...`);

      const msg: AgentMessage = {
        id: `auto-${now}-${Math.random().toString(36).slice(2, 8)}`,
        from: fromAgent,
        to: targetName,
        content: text,
        response: responseText,
        timestamp: now,
      };
      storeMessage(msg);

      return { sent: true, response: responseText };
    } catch (err: any) {
      // Only retry when the server indicates the cached session is stale.
      if (attempt === 0 && isStaleSessionError(err)) {
        const cacheKey = `${fromId}:${toId}`;
        sessionCache.delete(cacheKey);
        logger.warn(`[MESSENGER] ${fromAgent} → ${targetName}: stale session, retrying with fresh session`);
        continue;
      }
      logger.error(`[MESSENGER] Failed to send ${fromAgent} → ${targetName}: ${err}`);
    }
  }
  return { sent: false };
}

/**
 * Post a message directly to the user's chat (no agent response needed).
 * Used by Buddy for wellness checks, break reminders, session tracking.
 * The message appears in the frontend chat as a one-way agent message.
 */
export async function postToUser(agentName: string, text: string): Promise<void> {
  const msg: AgentMessage = {
    id: `user-msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    from: agentName,
    to: 'User',
    content: text,
    timestamp: Date.now(),
  };
  storeMessage(msg);
  logger.info(`[MESSENGER] ${agentName} → User: ${text.slice(0, 80)}...`);
}

/**
 * Get stored autonomous messages for frontend display.
 */
export function getStoredMessages(): AgentMessage[] {
  return loadStoredMessages();
}
