const BASE_URL = window.location.origin;

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status}`);
  }
  return res.json();
}

export async function listAgents(): Promise<any[]> {
  const data = await apiFetch<any>('/api/agents');
  return data?.agents || data?.data?.agents || data?.data || [];
}

export async function getCurrentMessageServer(): Promise<string> {
  const data = await apiFetch<any>('/api/messaging/message-servers/current');
  return data?.data?.id || data?.id || data?.messageServerId || '';
}

export async function getServerChannels(serverId: string): Promise<any[]> {
  const data = await apiFetch<any>(`/api/messaging/message-servers/${serverId}/channels`);
  return data?.data?.channels || data?.data || data?.channels || [];
}

export async function getChannelMessages(channelId: string, limit = 50): Promise<any[]> {
  const data = await apiFetch<any>(`/api/messaging/channels/${channelId}/messages?limit=${limit}`);
  return data?.data?.messages || data?.data || data?.messages || [];
}

export async function postMessage(channelId: string, content: string, entityId: string): Promise<any> {
  return apiFetch<any>(`/api/messaging/channels/${channelId}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      content,
      author_id: entityId,
      metadata: { source: 'buddies-frontend' },
    }),
  });
}

export async function getAgentStates(): Promise<any[]> {
  const data = await apiFetch<any>('/api/buddies/states');
  return data?.data || [];
}
