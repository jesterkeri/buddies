import type { Provider, IAgentRuntime, Memory, State } from '@elizaos/core';

const AGENT_NAMES = ['Chief', 'Hawk', 'Radar', 'Bounty Hunter', 'Buddy'];
const TEAM_KEYWORDS = /(?:hey\s+)?team\b|everyone\b|all\s+agents\b|all\s+of\s+you\b/i;

export const mentionProvider: Provider = {
  name: 'mentionContext',
  description: 'Detects @mentions of agents and team-wide calls in messages',
  get: async (runtime: IAgentRuntime, message: Memory, _state: State) => {
    const text = (message.content?.text as string) || '';
    const myName = runtime.character.name;

    // Find all @mentioned agent names (require @ prefix to avoid false positives)
    const mentions = AGENT_NAMES.filter((name) => {
      const pattern = new RegExp(`@${name}\\b`, 'i');
      return pattern.test(text);
    });

    const isMentioned = mentions.some((m) => m.toLowerCase() === myName.toLowerCase());
    const isTeamCall = TEAM_KEYWORDS.test(text);
    const otherAgentMentioned = mentions.length > 0 && !isMentioned;

    let contextText: string;
    if (isMentioned) {
      contextText = `YOU (${myName}) are directly mentioned in this message. You MUST respond.`;
    } else if (isTeamCall) {
      contextText = 'The user is addressing the whole team. You should respond from your area of expertise.';
    } else if (otherAgentMentioned) {
      contextText = `Another agent (${mentions.join(', ')}) is mentioned. Let them handle it unless you have critical input.`;
    } else {
      contextText = 'No specific agent mentioned. Respond only if the message is in your domain.';
    }

    return {
      text: contextText,
      values: { mentions, isMentioned, isTeamCall, otherAgentMentioned },
      data: { mentions, isMentioned, isTeamCall, otherAgentMentioned },
    };
  },
};
