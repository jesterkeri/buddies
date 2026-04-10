/**
 * Buddies API Client — Clean implementation based on ElizaOS v2 messaging architecture.
 *
 * Flow:
 * 1. List agents → get agent IDs
 * 2. Create session with an agent → get sessionId
 * 3. Send messages via session API with transport:"http" → get agent response inline
 * 4. Poll session messages for history
 *
 * Why sessions, not channels:
 * - Sessions API is what ElizaOS's built-in client uses
 * - It handles channel creation, participant management, and response routing automatically
 * - HTTP transport returns the agent response synchronously in the same request
 * - No Socket.IO complexity needed
 */

import { getUserEntityId } from '../types';

const BASE = window.location.origin;

// Track which agents already have a world created for this user
const worldCreated = new Set<string>();

/**
 * Ensure a world exists for the user entity on a given agent.
 * ElizaOS v2 requires DM sessions to have a world with ownership metadata.
 * Without this, plugin-bootstrap's settings provider throws
 * "No server ownership found for onboarding" and kills the message pipeline.
 */
async function ensureWorldForUser(agentId: string): Promise<void> {
  if (worldCreated.has(agentId)) return;
  const userId = getUserEntityId();
  try {
    await fetch(`${BASE}/api/agents/${agentId}/worlds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `user-${userId.slice(0, 8)}`,
        messageServerId: '00000000-0000-0000-0000-000000000000',
        metadata: {
          ownership: { ownerId: userId },
          roles: { [userId]: 'OWNER' },
          settings: {},
        },
      }),
    });
    worldCreated.add(agentId);
  } catch {
    // World may already exist, that's fine
    worldCreated.add(agentId);
  }
}

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    // Parse the error body for a real error message from ElizaOS
    let serverError = '';
    try {
      const body = await res.json();
      serverError = body?.error || body?.message || '';
      if (typeof serverError === 'object') serverError = (serverError as any).message || JSON.stringify(serverError);
    } catch {}
    const err = new Error(serverError || `Server error (${res.status})`);
    (err as any).serverError = serverError;
    (err as any).status = res.status;
    throw err;
  }
  return res.json();
}

// ── Agents ──

export async function listAgents(): Promise<any[]> {
  const d = await api<any>('/api/agents');
  return d?.data?.agents || d?.agents || d?.data || [];
}

// ── Sessions ──

export async function createAgentSession(agentId: string, userId: string): Promise<any> {
  // Ensure the user has a world on this agent before creating the session
  await ensureWorldForUser(agentId);
  return api<any>('/api/messaging/sessions', {
    method: 'POST',
    body: JSON.stringify({ agentId, userId }),
  });
}

export async function sendMessage(sessionId: string, content: string): Promise<any> {
  // HTTP transport: blocks until agent responds, returns response inline.
  return api<any>(`/api/messaging/sessions/${sessionId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content, transport: 'http' }),
  });
}

export async function getMessages(sessionId: string): Promise<any[]> {
  const d = await api<any>(`/api/messaging/sessions/${sessionId}/messages`);
  return d?.messages || d?.data?.messages || d?.data || [];
}

// ── Autonomous Messages (agent-to-agent) ──

export async function getAutonomousMessages(): Promise<any[]> {
  try {
    const CONFIG_SERVER = `${window.location.protocol}//${window.location.hostname}:3001`;
    const res = await fetch(`${CONFIG_SERVER}/autonomous-messages`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// ── Agent States ──

export async function getAgentStates(): Promise<any[]> {
  try {
    const d = await api<any>('/api/buddies/states');
    return d?.data || [];
  } catch {
    return [];
  }
}
