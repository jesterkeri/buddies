import type { Plugin, Action } from '@elizaos/core';
import { agentStateManager, AgentStatus } from '../../../shared/agent-state.ts';
import { fireTrigger } from '../../../shared/triggers.ts';
import { sendBreakReminder, sendCelebration, isTelegramConfigured } from '../../../shared/integrations/telegram.ts';
import { placesContextProvider } from './providers/places-context.ts';
import { findPlaces, type Place } from '../../../shared/places-service.ts';

const checkWellness: Action = {
  name: 'CHECK_WELLNESS',
  similes: ['BREAK_REMINDER', 'WELLNESS_CHECK', 'TAKE_BREAK', 'REST'],
  description: 'Check on the user wellness, remind them to take breaks, eat, hydrate, or stretch. Use when the user has been working for a while or mentions being tired.',
  validate: async () => true,
  handler: async (runtime, message, state, options, callback) => {
    agentStateManager.setState('Buddy', AgentStatus.WORKING, 'Wellness check');

    if (callback) {
      await callback({
        text: `Checking in on you! Remember to take care of yourself while you code. Hydration, food, and breaks are not optional. 💪`,
        actions: ['CHECK_WELLNESS'],
      });
    }

    // Send Telegram break reminder if configured
    if (isTelegramConfigured()) {
      await sendBreakReminder(120); // approximate minutes
    }

    fireTrigger('Buddy', 'CHECK_WELLNESS');
    agentStateManager.setState('Buddy', AgentStatus.IDLE);
    return { text: 'Wellness check done', success: true };
  },
  examples: [
    [
      { name: '{{user1}}', content: { text: 'I have been coding for hours' } },
      { name: 'Buddy', content: { text: "Hey, you've been at it for 4 hours straight 😅 There's a solid ramen spot 5 minutes from you — 4.7 stars, open till 10pm. Go eat! 🍜", actions: ['CHECK_WELLNESS'] } },
    ],
  ],
};

const celebrate: Action = {
  name: 'CELEBRATE',
  similes: ['CELEBRATE_WIN', 'HYPE', 'CONGRATS'],
  description: 'Celebrate a win, achievement, or milestone. Use when the user ships something, fixes a bug, or completes a task.',
  validate: async () => true,
  handler: async (runtime, message, state, options, callback) => {
    if (callback) {
      await callback({
        text: `LET'S GOOO 🎉🚀 That deserves a celebration! You've been putting in the work and it shows. Take a victory lap! 🏆`,
        actions: ['CELEBRATE'],
      });
    }

    // Send celebration to Telegram if configured
    if (isTelegramConfigured()) {
      const text = (message.content?.text as string) || 'Something awesome!';
      await sendCelebration(text);
    }

    return { text: 'Celebrated', success: true };
  },
  examples: [
    [
      { name: '{{user1}}', content: { text: 'Just shipped the staking contract!' } },
      { name: 'Buddy', content: { text: "LET'S GOOO 🎉🚀 That's a big one! You've been grinding on this all week and it's finally live. Take a victory lap! 🏆", actions: ['CELEBRATE'] } },
    ],
  ],
};

const recommendFood: Action = {
  name: 'RECOMMEND_FOOD',
  similes: ['FIND_FOOD', 'RESTAURANT', 'CAFE', 'LUNCH', 'DINNER', 'HOTEL', 'FIND_HOTEL', 'FIND_CAFE'],
  description: 'Find restaurants, cafes, or hotels near a location using real OpenStreetMap data. Use when the user asks about places to eat, stay, or get coffee.',
  validate: async () => true,
  handler: async (runtime, message, state, options, callback) => {
    const text = (message.content?.text as string) || '';

    // Extract location from message
    const locationMatch = text.match(/(?:near|around|in|at|close to)\s+(.+?)(?:\?|$|\.|\!)/i);
    const location = locationMatch ? locationMatch[1].trim() : '';

    if (!location) {
      if (callback) {
        await callback({
          text: `I'd love to find some great spots for you! 🍕 Where are you located? Tell me a city or area and I'll search nearby.`,
          actions: ['RECOMMEND_FOOD'],
        });
      }
      return { text: 'Need location', success: true };
    }

    // Detect what type of place
    const lower = text.toLowerCase();
    let types: ('restaurant' | 'hotel' | 'cafe')[] = ['restaurant', 'cafe'];
    if (lower.includes('hotel') || lower.includes('stay') || lower.includes('accommodation')) types = ['hotel'];
    else if (lower.includes('cafe') || lower.includes('coffee')) types = ['cafe'];
    else if (lower.includes('restaurant') || lower.includes('food') || lower.includes('eat')) types = ['restaurant'];

    const places = await findPlaces(location, types);

    if (places.length === 0) {
      if (callback) {
        await callback({
          text: `Hmm, I couldn't find any ${types[0]}s near "${location}" 😕 Try a more specific location or a bigger city name!`,
          actions: ['RECOMMEND_FOOD'],
        });
      }
      return { text: 'No places found', success: true };
    }

    const list = places.slice(0, 8).map((p, i) => {
      let line = `${i + 1}. **${p.name}**`;
      if (p.cuisine) line += ` (${p.cuisine})`;
      if (p.address) line += ` — ${p.address}`;
      if (p.openingHours) line += ` | Hours: ${p.openingHours}`;
      if (p.phone) line += ` | ${p.phone}`;
      return line;
    }).join('\n');

    if (callback) {
      await callback({
        text: `Found ${places.length} ${types[0]}s near ${location}! 🎯\n\n${list}\n\nWant more details on any of these? 😊`,
        actions: ['RECOMMEND_FOOD'],
      });
    }

    return { text: `Found ${places.length} places`, success: true };
  },
  examples: [
    [
      { name: '{{user1}}', content: { text: 'I am hungry' } },
      { name: 'Buddy', content: { text: "Ooh, food time! 🍜 There's a great Thai place 3 minutes away — 4.8 stars, affordable, and they do quick takeout. Or if you want to sit down, the cafe on the corner has solid sandwiches and wifi. Go eat!", actions: ['RECOMMEND_FOOD'] } },
    ],
  ],
};

const startPomodoro: Action = {
  name: 'START_POMODORO',
  similes: ['POMODORO', 'FOCUS_TIMER', 'WORK_TIMER', 'FOCUS_MODE'],
  description: 'Start a Pomodoro timer — 25 minutes of focused work followed by a 5-minute break. Use when the user wants to focus or mentions needing a timer.',
  validate: async () => true,
  handler: async (runtime, message, state, options, callback) => {
    agentStateManager.setState('Buddy', AgentStatus.WORKING, 'Pomodoro timer active');

    if (callback) {
      await callback({
        text: `Pomodoro started! 🍅⏱️\n\n**25 minutes of focused work** — starting NOW.\n\nRules:\n- No distractions\n- Stay on one task\n- I'll check in when it's break time\n\nYou got this! 💪 I'll remind you when the 25 minutes are up.`,
        actions: ['START_POMODORO'],
      });
    }

    // Schedule break reminder after 25 minutes
    setTimeout(async () => {
      agentStateManager.setState('Buddy', AgentStatus.IDLE);
      // The autonomous loops or next message will pick up the break reminder
    }, 25 * 60 * 1000);

    return { text: 'Pomodoro started', success: true };
  },
  examples: [
    [
      { name: '{{user1}}', content: { text: 'Start a pomodoro timer' } },
      { name: 'Buddy', content: { text: "Pomodoro started! 🍅⏱️ 25 minutes of focused work — GO! I'll remind you when it's break time. No distractions! 💪", actions: ['START_POMODORO'] } },
    ],
  ],
};

const beansPlugin: Plugin = {
  name: 'beans-plugin',
  description: 'Buddy capabilities — wellness, real location recs via OpenStreetMap, morale, Pomodoro timer',
  actions: [checkWellness, celebrate, recommendFood, startPomodoro],
  providers: [placesContextProvider],
  evaluators: [],
};

export default beansPlugin;
