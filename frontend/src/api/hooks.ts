/**
 * Buddies React Hooks — Clean implementation.
 *
 * Each agent gets its own session. When you @mention an agent,
 * the message goes to that agent's session and the response comes back inline.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pushEvent } from '../components/activity/activityStore';
import {
  listAgents,
  createAgentSession,
  sendMessage,
  getTeamChannelMessages,
  getAgentStates,
} from './client';
import { getUserEntityId, getAgentColor, type AgentInfo, type ChatMessage, type AgentState } from '../types';

// ── Agents ──

export function useAgents() {
  return useQuery<AgentInfo[]>({
    queryKey: ['agents'],
    queryFn: async () => {
      const agents = await listAgents();
      return agents.map((a: any) => ({
        id: a.id || a.agentId,
        name: a.name || a.character?.name || 'Unknown',
        color: getAgentColor(a.name || a.character?.name || ''),
      }));
    },
    staleTime: 60_000,
  });
}

// ── Per-agent sessions ──

// Cache: agentId → sessionId
const sessionCache = new Map<string, string>();

async function getOrCreateSession(agentId: string): Promise<string> {
  const cached = sessionCache.get(agentId);
  if (cached) return cached;

  const userId = getUserEntityId();
  const res = await createAgentSession(agentId, userId);
  const sessionId = res?.sessionId || res?.data?.sessionId;
  if (sessionId) sessionCache.set(agentId, sessionId);
  return sessionId;
}

// ── Team session (for initial load / default agent) ──

export function useTeamSession() {
  const { data: agents } = useAgents();

  return useQuery<{ sessionId: string; channelId: string } | null>({
    queryKey: ['teamSession', agents?.length],
    queryFn: async () => {
      if (!agents || agents.length === 0) return null;
      // Create session with Chief (team lead) as default
      const chief = agents.find((a) => a.name === 'Chief') || agents[0];
      const sessionId = await getOrCreateSession(chief.id);
      return sessionId ? { sessionId, channelId: sessionId } : null;
    },
    enabled: !!agents && agents.length > 0,
    staleTime: 300_000,
    retry: 3,
  });
}

// ── All messages (unified across sessions) ──

// Store all chat messages in a single local array
let allMessages: ChatMessage[] = [];
const seenMessageIds = new Set<string>();

function toEpoch(v: any): number {
  if (!v) return Date.now();
  if (typeof v === 'number') return v;
  const ms = new Date(v).getTime();
  return isNaN(ms) ? Date.now() : ms;
}

export function useMessages() {
  const { data: agents } = useAgents();

  return useQuery<ChatMessage[]>({
    queryKey: ['allMessages'],
    queryFn: async () => {
      // Poll team channel for agent-to-agent messages
      try {
        const channelMsgs = await getTeamChannelMessages();
        const agentMap = new Map<string, string>();
        agents?.forEach((a) => agentMap.set(a.id, a.name));

        for (const msg of channelMsgs) {
          const id = msg.id || msg.messageId;
          if (seenMessageIds.has(id)) continue;
          seenMessageIds.add(id);

          const authorId = msg.authorId || msg.author_id || msg.senderId || '';
          const sourceType = msg.sourceType || msg.source_type || msg.source || '';
          const agentName = sourceType === 'user' ? '' : (msg.metadata?.agentName || msg.senderName || agentMap.get(authorId) || '');
          const isAgent = sourceType !== 'user' && !!agentName;
          const rawContent = msg.content;
          const content = typeof rawContent === 'string' ? rawContent : rawContent?.text || msg.text || '';

          if (!content) continue;

          const chatMsg: ChatMessage = {
            id,
            authorId,
            authorName: isAgent ? agentName : 'You',
            isAgent,
            content,
            timestamp: toEpoch(msg.createdAt || msg.created_at || msg.timestamp),
            agentColor: isAgent ? getAgentColor(agentName) : undefined,
          };

          // Only add if not already in allMessages
          if (!allMessages.some((m) => m.id === id)) {
            allMessages.push(chatMsg);
          }
        }
      } catch {}

      // Sort by timestamp and deduplicate
      allMessages.sort((a, b) => a.timestamp - b.timestamp);
      return allMessages;
    },
    staleTime: 3_000,
    refetchInterval: 5_000,
  });
}

// ── Send message ──

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { data: agents } = useAgents();
  const entityId = getUserEntityId();

  return useMutation({
    mutationFn: async (content: string) => {
      if (!agents || agents.length === 0) throw new Error('No agents');

      // Add user message immediately
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        authorId: entityId,
        authorName: 'You',
        isAgent: false,
        content,
        timestamp: Date.now(),
      };
      seenMessageIds.add(userMsg.id);
      allMessages = [...allMessages, userMsg];
      queryClient.setQueryData<ChatMessage[]>(['allMessages'], allMessages);

      // Find which agent to talk to
      const targetAgent = findTargetAgent(content, agents);

      // Check if agent is connected (has a provider configured)
      const settings = JSON.parse(localStorage.getItem('buddies-settings') || '{}');
      const perAgent = settings?.aiConfig?.perAgent || {};
      const agentConfig = perAgent[targetAgent.name];
      const isDisconnected = !agentConfig?.provider || agentConfig.provider === 'none' || agentConfig.provider === '';

      if (isDisconnected) {
        // Add error message to chat
        const errMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          authorId: targetAgent.id,
          authorName: targetAgent.name,
          isAgent: true,
          content: `${targetAgent.name} is not connected. Go to the Connect tab to add an API key for this agent.`,
          timestamp: Date.now(),
          agentColor: targetAgent.color,
        };
        allMessages = [...allMessages, errMsg];
        queryClient.setQueryData<ChatMessage[]>(['allMessages'], allMessages);
        return { success: false, error: 'Agent not connected' };
      }

      // Get or create session for this agent
      const sessionId = await getOrCreateSession(targetAgent.id);
      if (!sessionId) throw new Error('Failed to create session');

      // Send and get response (HTTP transport — synchronous)
      const data = await sendMessage(sessionId, content);

      // Extract agent response
      const agentResponse = data?.agentResponse;
      if (agentResponse && agentResponse.text) {
        const responseMsg: ChatMessage = {
          id: agentResponse.responseId || `agent-${Date.now()}`,
          authorId: targetAgent.id,
          authorName: targetAgent.name,
          isAgent: true,
          content: agentResponse.text,
          timestamp: Date.now(),
          agentColor: targetAgent.color,
        };
        seenMessageIds.add(responseMsg.id);
        allMessages = [...allMessages, responseMsg];
        queryClient.setQueryData<ChatMessage[]>(['allMessages'], allMessages);

        // Log to Intel feed
        pushEvent('message', targetAgent.name, agentResponse.text.slice(0, 100));
      }

      return data;
    },
  });
}

// ── Find target agent from @mention or content domain ──

const AGENT_DOMAINS: Record<string, string[]> = {
  Chief: ['task', 'priority', 'standup', 'meeting', 'schedule', 'deadline', 'plan', 'coordinate', 'delegate', 'assign'],
  Hawk: ['code', 'review', 'security', 'bug', 'vulnerability', 'test', 'audit', 'PR', 'commit', 'smart contract', 'solidity'],
  Radar: ['research', 'documentation', 'dependency', 'CVE', 'breaking change', 'migration', 'tutorial', 'github'],
  'Bounty Hunter': ['hackathon', 'bounty', 'grant', 'opportunity', 'job', 'freelance', 'competition', 'prize'],
  Buddy: ['food', 'lunch', 'dinner', 'restaurant', 'hotel', 'break', 'rest', 'wellness', 'coffee', 'snack', 'exercise', 'stretch', 'morale', 'celebrate', 'location', 'cafe', 'pizza', 'recommend'],
};

function findTargetAgent(content: string, agents: AgentInfo[]): AgentInfo {
  // Check @mention first
  const mention = content.match(/@(\w[\w\s]*?)(?=\s|$)/);
  if (mention) {
    const name = mention[1].trim().toLowerCase();
    const found = agents.find((a) => a.name.toLowerCase() === name);
    if (found) return found;
  }

  // Check if agent name appears in text (without @)
  const lower = content.toLowerCase();
  for (const agent of agents) {
    if (lower.includes(agent.name.toLowerCase())) return agent;
  }

  // Match content against agent domains
  let bestAgent: AgentInfo | null = null;
  let bestScore = 0;
  for (const agent of agents) {
    const keywords = AGENT_DOMAINS[agent.name] || [];
    const score = keywords.filter((kw) => lower.includes(kw.toLowerCase())).length;
    if (score > bestScore) {
      bestScore = score;
      bestAgent = agent;
    }
  }
  if (bestAgent && bestScore > 0) return bestAgent;

  // Default to Chief only if connected, otherwise first connected agent
  return agents.find((a) => a.name === 'Chief') || agents[0];
}

// ── Agent States ──

export function useAgentStates() {
  return useQuery<AgentState[]>({
    queryKey: ['agentStates'],
    queryFn: getAgentStates,
    refetchInterval: 3_000,
  });
}
