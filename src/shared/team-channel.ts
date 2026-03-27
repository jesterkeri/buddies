import { type IAgentRuntime, logger } from '@elizaos/core';

const SERVER_PORT = process.env.SERVER_PORT || '3000';
const BASE_URL = `http://localhost:${SERVER_PORT}`;
const TEAM_CHANNEL_NAME = 'Team Chat';

let teamChannelId: string | null = null;
let bootstrapComplete = false;

export function getTeamChannelId(): string | null {
  return teamChannelId;
}

async function apiCall(path: string, options?: RequestInit): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function bootstrapTeamChannel(runtime: IAgentRuntime): Promise<void> {
  if (bootstrapComplete) return;

  // Wait for all agents to register with the server
  await new Promise((resolve) => setTimeout(resolve, 3000));

  try {
    // Get the current message server
    const serverRes = await apiCall('/api/messaging/message-servers/current');
    const messageServerId = serverRes?.data?.id || serverRes?.id || serverRes?.messageServerId;

    if (!messageServerId) {
      logger.warn('[BUDDIES] No message server found, skipping team channel bootstrap');
      return;
    }

    // Check if team channel already exists
    const channelsRes = await apiCall(`/api/messaging/message-servers/${messageServerId}/channels`);
    const channels = channelsRes?.data?.channels || channelsRes?.data || channelsRes?.channels || [];

    const existing = Array.isArray(channels)
      ? channels.find((c: any) => c.name === TEAM_CHANNEL_NAME)
      : null;

    if (existing) {
      teamChannelId = existing.id;
      logger.info(`[BUDDIES] Team channel already exists: ${teamChannelId}`);
      bootstrapComplete = true;
      return;
    }

    // Create the team channel
    const createRes = await apiCall('/api/messaging/channels', {
      method: 'POST',
      body: JSON.stringify({
        name: TEAM_CHANNEL_NAME,
        type: 'GROUP',
        messageServerId,
        metadata: {
          description: 'Buddies team chat — all 5 agents collaborate here',
          topic: 'Team Collaboration',
        },
      }),
    });

    teamChannelId = createRes?.data?.id || createRes?.id;

    if (!teamChannelId) {
      logger.warn('[BUDDIES] Failed to create team channel — no ID returned');
      return;
    }

    logger.info(`[BUDDIES] Team channel created: ${teamChannelId}`);

    // Get all agents and add them to the channel
    const agentsRes = await apiCall('/api/agents');
    const agents = agentsRes?.data?.agents || agentsRes?.agents || agentsRes?.data || [];

    if (Array.isArray(agents)) {
      for (const agent of agents) {
        const agentId = agent.id || agent.agentId;
        if (agentId) {
          try {
            await apiCall(`/api/messaging/channels/${teamChannelId}/agents`, {
              method: 'POST',
              body: JSON.stringify({ agentId }),
            });
            logger.info(`[BUDDIES] Added agent ${agent.name || agentId} to team channel`);
          } catch (err) {
            // Agent might already be a participant
            logger.warn(`[BUDDIES] Could not add agent ${agent.name || agentId}: ${err}`);
          }
        }
      }
    }

    bootstrapComplete = true;
    logger.info('[BUDDIES] Team channel bootstrap complete');
  } catch (err) {
    // Don't set bootstrapComplete so it can retry on next call
    logger.error(`[BUDDIES] Team channel bootstrap failed (will retry on next startup): ${err}`);
  }
}
