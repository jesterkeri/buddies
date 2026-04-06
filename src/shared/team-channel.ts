import { type IAgentRuntime, logger } from '@elizaos/core';
import { apiCall } from './http.ts';
import { DEFAULT_MESSAGE_SERVER_ID } from './constants.ts';

const TEAM_CHANNEL_NAME = 'Team Chat';
const EXPECTED_AGENTS = 5;
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

      if (count >= EXPECTED_AGENTS) {
        logger.info(`[BUDDIES] All ${count} agents registered (attempt ${attempt})`);
        return true;
      }
      logger.info(`[BUDDIES] Waiting for agents... ${count}/${EXPECTED_AGENTS} (attempt ${attempt}/${MAX_RETRIES})`);
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
          description: 'Buddies team chat — all 5 agents collaborate here',
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

    // Keep trying to add missing agents (Chief often registers late due to timeout)
    setTimeout(async () => {
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
        logger.info(`[BUDDIES] Late agent registration: added ${lateIds.length} agents to team channel`);
      } catch {}
    }, 15_000); // Wait 15s for Chief to finish registering
  } catch (err) {
    logger.error(`[BUDDIES] Team channel bootstrap failed (will retry on next startup): ${err}`);
  } finally {
    bootstrapInProgress = false;
  }
}
