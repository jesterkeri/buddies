import { logger } from '@elizaos/core';
import { getTeamChannelId } from './team-channel.ts';

const SERVER_PORT = process.env.SERVER_PORT || '3000';
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${SERVER_PORT}`;

// Cache agent name → ID mappings
const agentIdCache = new Map<string, string>();
let messageServerId: string | null = null;

// Per-agent cooldown tracking (prevent message flooding)
const lastMessageTime = new Map<string, number>();
const COOLDOWN_MS = 60_000; // 60 seconds between autonomous messages per agent

async function apiCall(path: string, options?: RequestInit): Promise<any> {
  const res = await fetch(`${SERVER_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function getAgentId(agentName: string): Promise<string | null> {
  const cached = agentIdCache.get(agentName);
  if (cached) return cached;

  try {
    const res = await apiCall('/api/agents');
    const agents = res?.data?.agents || res?.agents || res?.data || [];
    if (!Array.isArray(agents)) return null;

    // Cache all agents while we're at it
    for (const agent of agents) {
      const id = agent.id || agent.agentId;
      const name = agent.name || agent.character?.name;
      if (id && name) {
        agentIdCache.set(name, id);
      }
    }

    return agentIdCache.get(agentName) || null;
  } catch (err) {
    logger.error(`[BUDDIES] Failed to look up agent ID for ${agentName}: ${err}`);
    return null;
  }
}

async function getMessageServerId(): Promise<string | null> {
  if (messageServerId) return messageServerId;

  try {
    const res = await apiCall('/api/messaging/message-servers/current');
    messageServerId = res?.data?.id || res?.id || res?.messageServerId || null;
    return messageServerId;
  } catch (err) {
    logger.error(`[BUDDIES] Failed to get message server ID: ${err}`);
    return null;
  }
}

/**
 * Send a message to the team channel as a specific agent.
 * This triggers ElizaOS's shouldRespond evaluation for all other agents in the channel.
 */
export async function sendAgentMessage(agentName: string, text: string): Promise<boolean> {
  // Guard: team channel must exist
  const channelId = getTeamChannelId();
  if (!channelId) {
    logger.warn(`[BUDDIES] Cannot send autonomous message — team channel not ready`);
    return false;
  }

  // Guard: per-agent cooldown
  const lastTime = lastMessageTime.get(agentName) || 0;
  const now = Date.now();
  if (now - lastTime < COOLDOWN_MS) {
    logger.info(`[BUDDIES] Skipping autonomous message from ${agentName} — cooldown active`);
    return false;
  }

  // Look up agent ID
  const agentId = await getAgentId(agentName);
  if (!agentId) {
    logger.warn(`[BUDDIES] Cannot send message — agent ID not found for ${agentName}`);
    return false;
  }

  // Get message server ID
  const serverId = await getMessageServerId();
  if (!serverId) {
    logger.warn(`[BUDDIES] Cannot send message — message server ID not found`);
    return false;
  }

  try {
    await apiCall(`/api/messaging/channels/${channelId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        channelId,
        message_server_id: serverId,
        author_id: agentId,
        content: text,
        source_type: 'agent',
        raw_message: text,
        metadata: { autonomous: true, agentName },
      }),
    });

    lastMessageTime.set(agentName, now);
    logger.info(`[BUDDIES] Autonomous message sent from ${agentName}`);
    return true;
  } catch (err) {
    logger.error(`[BUDDIES] Failed to send autonomous message from ${agentName}: ${err}`);
    return false;
  }
}
