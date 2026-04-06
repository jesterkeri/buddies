import { SERVER_URL } from './constants.ts';

/**
 * Shared HTTP client for internal ElizaOS API calls.
 * Used by agent-messenger and team-channel.
 */
export async function apiCall(path: string, options?: RequestInit): Promise<any> {
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
