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

// ── Team Channel Messages (agent-to-agent) ──

export async function getTeamChannelMessages(): Promise<any[]> {
  try {
    // Find the GROUP team channel
    const channelsData = await api<any>('/api/messaging/message-servers/00000000-0000-0000-0000-000000000000/channels');
    const channels = channelsData?.data?.channels || channelsData?.data || [];
    const teamChannel = Array.isArray(channels)
      ? channels.find((c: any) => c.type === 'GROUP' && c.name === 'Team Chat')
      : null;
    if (!teamChannel) return [];

    const messagesData = await api<any>(`/api/messaging/channels/${teamChannel.id}/messages`);
    return messagesData?.data?.messages || messagesData?.messages || messagesData?.data || [];
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
