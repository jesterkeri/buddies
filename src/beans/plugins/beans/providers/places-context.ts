import type { Provider, IAgentRuntime, Memory, State } from '@elizaos/core';
import { getPlacesContext } from '../../../../shared/places-service.ts';
import { isCasualMessage } from '../../../../shared/context-classifier.ts';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { DATA_DIR } from '../../../../shared/constants.ts';

// Track when this process started, as a fallback for session duration
const processStartTime = Date.now();

/**
 * Read the actual user-session start time from disk.
 * Falls back to process start time if no session event is recorded.
 */
function getSessionDurationContext(): string {
  let startedAt = processStartTime;
  let active = true;
  try {
    const eventPath = join(DATA_DIR, '.buddies-session-event.json');
    if (existsSync(eventPath)) {
      const data = JSON.parse(readFileSync(eventPath, 'utf-8'));
      if (data.workSessionStartedAt) startedAt = data.workSessionStartedAt;
      if (data.workSessionActive === false) active = false;
    }
  } catch {}

  const elapsedMs = Date.now() - startedAt;
  const elapsedMin = Math.floor(elapsedMs / 60_000);
  const hours = Math.floor(elapsedMin / 60);
  const mins = elapsedMin % 60;
  const human = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return `## Current Work Session\n- Status: ${active ? 'active' : 'inactive'}\n- Duration: ${human} (${elapsedMin} minutes total)\n- Started: ${new Date(startedAt).toLocaleTimeString()}`;
}

/**
 * Buddy's places provider — injects restaurant/hotel/cafe data when user asks about locations.
 * Extracts location from the user's message and queries OpenStreetMap.
 * Also always includes session duration so Buddy can give time-aware advice.
 */

// Common location keywords that signal a places query
const LOCATION_TRIGGERS = ['restaurant', 'hotel', 'cafe', 'coffee', 'food', 'eat', 'lunch', 'dinner', 'breakfast', 'stay', 'accommodation', 'lodge'];

function extractLocation(text: string): string | null {
  const lower = text.toLowerCase();

  // Check if message is about places
  if (!LOCATION_TRIGGERS.some((t) => lower.includes(t))) return null;

  // Try to extract location after "near", "in", "around", "at"
  const patterns = [
    /(?:near|around|in|at|close to)\s+([A-Z][a-zA-Z\s,]+?)(?:\?|$|\.|\!)/,
    /(?:near|around|in|at|close to)\s+(.+?)(?:\?|$|\.|\!)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }

  return null;
}

function detectPlaceType(text: string): 'restaurant' | 'hotel' | 'cafe' | undefined {
  const lower = text.toLowerCase();
  if (lower.includes('hotel') || lower.includes('stay') || lower.includes('accommodation') || lower.includes('lodge')) return 'hotel';
  if (lower.includes('cafe') || lower.includes('coffee')) return 'cafe';
  if (lower.includes('restaurant') || lower.includes('food') || lower.includes('eat') || lower.includes('lunch') || lower.includes('dinner')) return 'restaurant';
  return undefined;
}

export const placesContextProvider: Provider = {
  name: 'placesContext',
  description: 'Real restaurant, hotel, and cafe data from OpenStreetMap, plus current work session duration',
  get: async (_runtime: IAgentRuntime, message: Memory, _state: State) => {
    const text = (message.content?.text as string) || '';

    // ALWAYS include session duration — this is core to Buddy's wellness role.
    // Even casual messages benefit from this (so "how long have I been here?"
    // gets a real answer, not a hallucination).
    const sessionContext = getSessionDurationContext();

    if (isCasualMessage(text)) {
      return {
        text: sessionContext,
        values: { hasPlaces: false, hasSession: true },
        data: { hasPlaces: false, hasSession: true },
      };
    }

    const location = extractLocation(text);

    if (!location) {
      return {
        text: `${sessionContext}\n\nNo location detected in message. Ask the user where they are or what area they want recommendations for.`,
        values: { hasPlaces: false, hasSession: true },
        data: { hasPlaces: false, hasSession: true },
      };
    }

    const placeType = detectPlaceType(text);
    const placesContext = await getPlacesContext(location, placeType);

    return {
      text: `${sessionContext}\n\n${placesContext}`,
      values: { hasPlaces: true, hasSession: true, location, placeType },
      data: { hasPlaces: true, hasSession: true, location, placeType },
    };
  },
};
