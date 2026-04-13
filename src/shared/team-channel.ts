import { type IAgentRuntime, logger } from '@elizaos/core';
import { apiCall } from './http.ts';
import { DEFAULT_MESSAGE_SERVER_ID } from './constants.ts';

const TEAM_CHANNEL_NAME = 'Team Chat';
const MIN_AGENTS_TO_START = 1; // Launch with at least 1 agent, don't wait for all
const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 3000;

let teamChannelId: string | null = null;
let bootstrapComplete = false;
let bootstrapInProgress = false;

export function getTeamChannelId(): string | null {
  return teamChannelId;
}

async function waitForAgents(): Promise<boolean> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const agentsRes = await apiCall('/api/agents');
      const agents = agentsRes?.data?.agents || agentsRes?.agents || agentsRes?.data || [];
      const count = Array.isArray(agents) ? agents.length : 0;

      if (count >= MIN_AGENTS_TO_START) {
        logger.info(`[BUDDIES] ${count} agent(s) registered (attempt ${attempt}), proceeding`);
        return true;
      }
      logger.info(`[BUDDIES] Waiting for agents... ${count} registered (attempt ${attempt}/${MAX_RETRIES})`);
    } catch {
      logger.info(`[BUDDIES] Server not ready yet (attempt ${attempt}/${MAX_RETRIES})`);
    }

    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  }
  return false;
}

export async function bootstrapTeamChannel(_runtime: IAgentRuntime): Promise<void> {
  // Prevent concurrent bootstrap attempts
  if (bootstrapComplete || bootstrapInProgress) return;
  bootstrapInProgress = true;

  try {
    // Wait for all agents to register
    const agentsReady = await waitForAgents();
    if (!agentsReady) {
      logger.warn('[BUDDIES] Not all agents registered, proceeding with available agents');
    }

    const messageServerId = DEFAULT_MESSAGE_SERVER_ID;

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
      bootstrapInProgress = false;
      return;
    }

    // Get all agent IDs first (needed for channel creation)
    const agentsRes = await apiCall('/api/agents');
    const agents = agentsRes?.data?.agents || agentsRes?.agents || agentsRes?.data || [];
    const agentIds = Array.isArray(agents)
      ? agents.map((a: any) => a.id || a.agentId).filter(Boolean)
      : [];

    // Create the team channel with all agents as participants
    const createRes = await apiCall('/api/messaging/channels', {
      method: 'POST',
      body: JSON.stringify({
        name: TEAM_CHANNEL_NAME,
        type: 'GROUP',
        message_server_id: messageServerId,
        participantCentralUserIds: agentIds,
        metadata: {
          description: 'Buddies team chat — all connected agents collaborate here',
          topic: 'Team Collaboration',
        },
      }),
    });

    teamChannelId = createRes?.data?.id || createRes?.id;

    if (!teamChannelId) {
      logger.warn('[BUDDIES] Failed to create team channel — no ID returned');
      bootstrapInProgress = false;
      return;
    }

    logger.info(`[BUDDIES] Team channel created: ${teamChannelId} with ${agentIds.length} agents`);

    // Also add agents individually (ensures they're registered as channel participants)
    for (const agentId of agentIds) {
      try {
        await apiCall(`/api/messaging/channels/${teamChannelId}/agents`, {
          method: 'POST',
          body: JSON.stringify({ agentId }),
        });
      } catch {
        // Agent might already be a participant
      }
    }

    bootstrapComplete = true;
    logger.info('[BUDDIES] Team channel bootstrap complete');

    // Keep trying to add late agents — 3 passes at 10s, 30s, 60s
    const retryDelays = [10_000, 30_000, 60_000];
    for (const delay of retryDelays) {
      setTimeout(async () => {
        if (!teamChannelId) return;
        try {
          const lateAgentsRes = await apiCall('/api/agents');
          const lateAgents = lateAgentsRes?.data?.agents || lateAgentsRes?.agents || lateAgentsRes?.data || [];
          const lateIds = Array.isArray(lateAgents)
            ? lateAgents.map((a: any) => a.id || a.agentId).filter(Boolean)
            : [];
          for (const agentId of lateIds) {
            try {
              await apiCall(`/api/messaging/channels/${teamChannelId}/agents`, {
                method: 'POST',
                body: JSON.stringify({ agentId }),
              });
            } catch {}
          }
          logger.info(`[BUDDIES] Late agent pass (${delay / 1000}s): ${lateIds.length} agents in channel`);
        } catch {}
      }, delay);
    }
  } catch (err) {
    logger.error(`[BUDDIES] Team channel bootstrap failed (will retry on next startup): ${err}`);
  } finally {
    bootstrapInProgress = false;
  }
}
