import type { Plugin, Action } from '@elizaos/core';
import { agentStateManager, AgentStatus } from '../../../shared/agent-state.ts';
import { fireTrigger } from '../../../shared/triggers.ts';

const checkWellness: Action = {
  name: 'CHECK_WELLNESS',
  similes: ['BREAK_REMINDER', 'WELLNESS_CHECK', 'TAKE_BREAK', 'REST'],
  description: 'Check on the user wellness, remind them to take breaks, eat, hydrate, or stretch. Use when the user has been working for a while or mentions being tired.',
  validate: async () => true,
  handler: async (runtime, message, state, options, callback) => {
    agentStateManager.setState('Beans', AgentStatus.WORKING, 'Wellness check');

    if (callback) {
      await callback({
        text: `Checking in on you! Remember to take care of yourself while you code. Hydration, food, and breaks are not optional. 💪`,
        actions: ['CHECK_WELLNESS'],
      });
    }

    fireTrigger('Beans', 'CHECK_WELLNESS');
    agentStateManager.setState('Beans', AgentStatus.IDLE);
    return { text: 'Wellness check done', success: true };
  },
  examples: [
    [
      { name: '{{user1}}', content: { text: 'I have been coding for hours' } },
      { name: 'Beans', content: { text: "Hey, you've been at it for 4 hours straight 😅 There's a solid ramen spot 5 minutes from you — 4.7 stars, open till 10pm. Go eat! 🍜", actions: ['CHECK_WELLNESS'] } },
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

    return { text: 'Celebrated', success: true };
  },
  examples: [
    [
      { name: '{{user1}}', content: { text: 'Just shipped the staking contract!' } },
      { name: 'Beans', content: { text: "LET'S GOOO 🎉🚀 That's a big one! You've been grinding on this all week and it's finally live. Take a victory lap! 🏆", actions: ['CELEBRATE'] } },
    ],
  ],
};

const recommendFood: Action = {
  name: 'RECOMMEND_FOOD',
  similes: ['FIND_FOOD', 'RESTAURANT', 'CAFE', 'LUNCH', 'DINNER'],
  description: 'Recommend food spots, cafes, or restaurants nearby. Use when the user is hungry or needs a break for food.',
  validate: async () => true,
  handler: async (runtime, message, state, options, callback) => {
    if (callback) {
      await callback({
        text: `Time to refuel! 🍕 Let me find some good spots near you. A well-fed developer is a productive developer!`,
        actions: ['RECOMMEND_FOOD'],
      });
    }

    return { text: 'Food recommended', success: true };
  },
  examples: [
    [
      { name: '{{user1}}', content: { text: 'I am hungry' } },
      { name: 'Beans', content: { text: "Ooh, food time! 🍜 There's a great Thai place 3 minutes away — 4.8 stars, affordable, and they do quick takeout. Or if you want to sit down, the cafe on the corner has solid sandwiches and wifi. Go eat!", actions: ['RECOMMEND_FOOD'] } },
    ],
  ],
};

const beansPlugin: Plugin = {
  name: 'beans-plugin',
  description: 'Buddy capabilities — wellness, location recs, morale, music',
  actions: [checkWellness, celebrate, recommendFood],
  providers: [],
  evaluators: [],
};

export default beansPlugin;
