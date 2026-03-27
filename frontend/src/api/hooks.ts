import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  listAgents,
  getCurrentMessageServer,
  getServerChannels,
  getChannelMessages,
  postMessage,
  getAgentStates,
} from './client';
import { joinChannel, onMessageBroadcast } from './socket';
import { getUserEntityId, getAgentColor, type AgentInfo, type ChatMessage, type AgentState } from '../types';

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

export function useTeamChannel() {
  return useQuery<string | null>({
    queryKey: ['teamChannel'],
    queryFn: async () => {
      const serverId = await getCurrentMessageServer();
      if (!serverId) return null;
      const channels = await getServerChannels(serverId);
      const teamChannel = channels.find((c: any) => c.name === 'Team Chat');
      return teamChannel?.id || null;
    },
    staleTime: 60_000,
    retry: 5,
    retryDelay: 2000,
  });
}

export function useMessages(channelId: string | null | undefined) {
  const queryClient = useQueryClient();
  const { data: agents } = useAgents();

  // Build agent ID → name map (memoized to avoid socket listener churn)
  const agentMap = useMemo(() => {
    const map = new Map<string, string>();
    agents?.forEach((a) => map.set(a.id, a.name));
    return map;
  }, [agents]);

  const query = useQuery<ChatMessage[]>({
    queryKey: ['messages', channelId],
    queryFn: async () => {
      if (!channelId) return [];
      const messages = await getChannelMessages(channelId);
      return messages.map((m: any) => normalizeMessage(m, agentMap));
    },
    enabled: !!channelId,
    staleTime: 10_000,
    refetchInterval: 10_000,
  });

  // Socket.io real-time updates
  useEffect(() => {
    if (!channelId) return;

    joinChannel(channelId);

    const cleanup = onMessageBroadcast((data: any) => {
      if (data.channelId !== channelId && data.roomId !== channelId) return;

      const msg = data.message || data;
      const normalized = normalizeMessage(msg, agentMap);

      queryClient.setQueryData<ChatMessage[]>(['messages', channelId], (old) => {
        if (!old) return [normalized];
        // Avoid duplicates
        if (old.some((m) => m.id === normalized.id)) return old;
        return [...old, normalized];
      });
    });

    return cleanup;
  }, [channelId, queryClient, agents]);

  return query;
}

export function useSendMessage(channelId: string | null | undefined) {
  const queryClient = useQueryClient();
  const entityId = getUserEntityId();

  return useMutation({
    mutationFn: async (content: string) => {
      if (!channelId) throw new Error('No channel');
      return postMessage(channelId, content, entityId);
    },
    onMutate: async (content: string) => {
      // Optimistic update
      const optimistic: ChatMessage = {
        id: `optimistic-${Date.now()}`,
        authorId: entityId,
        authorName: 'You',
        isAgent: false,
        content,
        timestamp: Date.now(),
      };
      queryClient.setQueryData<ChatMessage[]>(['messages', channelId], (old) =>
        old ? [...old, optimistic] : [optimistic]
      );
    },
  });
}

export function useAgentStates() {
  return useQuery<AgentState[]>({
    queryKey: ['agentStates'],
    queryFn: getAgentStates,
    refetchInterval: 3_000,
  });
}

// Track if any agent is "typing" (processing a response)
export function useTypingAgents(channelId: string | null | undefined) {
  const [typing, setTyping] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!channelId) return;

    // TODO: track via messageStreamChunk events
    // For now, this is a placeholder
    return () => setTyping(new Set());
  }, [channelId]);

  return typing;
}

function normalizeMessage(msg: any, agentMap: Map<string, string>): ChatMessage {
  const authorId = msg.authorId || msg.author_id || msg.senderId || '';
  const agentName = msg.metadata?.agentName || msg.senderName || agentMap.get(authorId) || '';
  const isAgent = !!agentName && agentName !== 'You';
  const content = typeof msg.content === 'string' ? msg.content : msg.content?.text || msg.text || '';

  return {
    id: msg.id || msg.messageId || `${authorId}-${msg.createdAt || Date.now()}`,
    authorId,
    authorName: isAgent ? agentName : 'You',
    isAgent,
    content,
    timestamp: msg.createdAt || msg.timestamp || Date.now(),
    agentColor: isAgent ? getAgentColor(agentName) : undefined,
  };
}
