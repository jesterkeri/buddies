import type { Provider, IAgentRuntime, Memory, State } from '@elizaos/core';
import { getPlacesContext } from '../../../../shared/places-service.ts';

/**
 * Buddy's places provider — injects restaurant/hotel/cafe data when user asks about locations.
 * Extracts location from the user's message and queries OpenStreetMap.
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
  description: 'Real restaurant, hotel, and cafe data from OpenStreetMap based on user location',
  get: async (_runtime: IAgentRuntime, message: Memory, _state: State) => {
    const text = (message.content?.text as string) || '';
    const location = extractLocation(text);

    if (!location) {
      return {
        text: 'No location detected in message. Ask the user where they are or what area they want recommendations for.',
        values: { hasPlaces: false },
        data: { hasPlaces: false },
      };
    }

    const placeType = detectPlaceType(text);
    const context = await getPlacesContext(location, placeType);

    return {
      text: context,
      values: { hasPlaces: true, location, placeType },
      data: { hasPlaces: true, location, placeType },
    };
  },
};
