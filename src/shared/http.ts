import { SERVER_URL } from './constants.ts';

/**
 * Shared HTTP client for internal ElizaOS API calls.
 * Used by agent-messenger and team-channel.
 */
const DEFAULT_TIMEOUT_MS = 60_000; // 60s — generous but not infinite

export async function apiCall(path: string, options?: RequestInit & { timeoutMs?: number }): Promise<any> {
  const { timeoutMs, ...fetchOptions } = options || {};
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs || DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(`${SERVER_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...fetchOptions,
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API ${path} failed (${res.status}): ${text}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}
