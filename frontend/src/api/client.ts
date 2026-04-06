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

const BASE = window.location.origin;

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  return res.json();
}

// ── Agents ──

export async function listAgents(): Promise<any[]> {
  const d = await api<any>('/api/agents');
  return d?.data?.agents || d?.agents || d?.data || [];
}

// ── Sessions ──

export async function createAgentSession(agentId: string, userId: string): Promise<any> {
  return api<any>('/api/messaging/sessions', {
    method: 'POST',
    body: JSON.stringify({ agentId, userId }),
  });
}

export async function sendMessage(sessionId: string, content: string): Promise<any> {
  // HTTP transport: blocks until agent responds, returns response inline
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
