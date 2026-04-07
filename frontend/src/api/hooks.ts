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
  getAutonomousMessages,
  getAgentStates,
} from './client';
import { getUserEntityId, getAgentColor, type AgentInfo, type ChatMessage, type AgentState } from '../types';
import { registerSessionLifecycle } from '../components/session/sessionStore';

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

// ── Session-based chat history ──

const SESSIONS_INDEX_KEY = 'buddies-sessions';
const ACTIVE_SESSION_KEY = 'buddies-active-session';

export interface ChatSession {
  id: string;
  startedAt: number;
  endedAt?: number;
  messageCount: number;
  label: string; // e.g. "Session 1 — Apr 7, 09:30"
}

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function formatSessionLabel(index: number, timestamp: number): string {
  const d = new Date(timestamp);
  const month = d.toLocaleString('en', { month: 'short' });
  const day = d.getDate();
  const time = d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `Session ${index} — ${month} ${day}, ${time}`;
}

function loadSessionsIndex(): ChatSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessionsIndex(sessions: ChatSession[]): void {
  localStorage.setItem(SESSIONS_INDEX_KEY, JSON.stringify(sessions));
}

function messagesKeyFor(sessionId: string): string {
  return `buddies-chat-${sessionId}`;
}

function loadMessagesFor(sessionId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(messagesKeyFor(sessionId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMessagesFor(sessionId: string, msgs: ChatMessage[]): void {
  const trimmed = msgs.slice(-200);
  localStorage.setItem(messagesKeyFor(sessionId), JSON.stringify(trimmed));
}

// Migrate old flat messages to a session if needed
function migrateOldMessages(): void {
  const oldKey = 'buddies-chat-messages';
  const old = localStorage.getItem(oldKey);
  if (!old) return;
  try {
    const msgs: ChatMessage[] = JSON.parse(old);
    if (msgs.length > 0) {
      const ts = msgs[0]?.timestamp || Date.now();
      const sessions = loadSessionsIndex();
      const id = generateSessionId();
      sessions.push({ id, startedAt: ts, messageCount: msgs.length, label: formatSessionLabel(sessions.length + 1, ts) });
      saveSessionsIndex(sessions);
      saveMessagesFor(id, msgs);
    }
    localStorage.removeItem(oldKey);
  } catch {
    localStorage.removeItem(oldKey);
  }
}

// Initialize: migrate old data, ensure active session exists
migrateOldMessages();

let activeSessionId: string = localStorage.getItem(ACTIVE_SESSION_KEY) || '';

// If no active session or it's stale, create a new one
const existingSessions = loadSessionsIndex();
if (!activeSessionId || !existingSessions.find((s) => s.id === activeSessionId)) {
  activeSessionId = generateSessionId();
  const newSession: ChatSession = {
    id: activeSessionId,
    startedAt: Date.now(),
    messageCount: 0,
    label: formatSessionLabel(existingSessions.length + 1, Date.now()),
  };
  existingSessions.push(newSession);
  saveSessionsIndex(existingSessions);
  localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId);
}

let allMessages: ChatMessage[] = loadMessagesFor(activeSessionId);
const seenMessageIds = new Set<string>(allMessages.map((m) => m.id));

// ── Wire to sessionStore lifecycle (TopNav START/END buttons) ──
registerSessionLifecycle((event) => {
  if (event === 'start') {
    startNewSession();
  } else if (event === 'end') {
    endCurrentSession();
  }
});

export function startNewSession(): void {
  // Save current session's message count
  const sessions = loadSessionsIndex();
  const current = sessions.find((s) => s.id === activeSessionId);
  if (current) current.messageCount = allMessages.length;
  saveSessionsIndex(sessions);

  // Create new session
  activeSessionId = generateSessionId();
  const newSession: ChatSession = {
    id: activeSessionId,
    startedAt: Date.now(),
    messageCount: 0,
    label: formatSessionLabel(sessions.length + 1, Date.now()),
  };
  sessions.push(newSession);
  saveSessionsIndex(sessions);
  localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId);

  // Reset in-memory state
  allMessages = [];
  seenMessageIds.clear();
}

export function getSessions(): ChatSession[] {
  return loadSessionsIndex();
}

export function getActiveSessionId(): string {
  return activeSessionId;
}

export function endCurrentSession(): void {
  const sessions = loadSessionsIndex();
  const current = sessions.find((s) => s.id === activeSessionId);
  if (current) {
    current.endedAt = Date.now();
    current.messageCount = allMessages.length;
    saveSessionsIndex(sessions);
  }
}

export function deleteSession(sessionId: string): void {
  if (sessionId === activeSessionId) return; // can't delete active
  localStorage.removeItem(messagesKeyFor(sessionId));
  const sessions = loadSessionsIndex().filter((s) => s.id !== sessionId);
  saveSessionsIndex(sessions);
}

export function useMessages(viewingSessionId?: string) {
  const isViewingPast = viewingSessionId && viewingSessionId !== activeSessionId;

  return useQuery<ChatMessage[]>({
    queryKey: ['allMessages', viewingSessionId || activeSessionId],
    queryFn: async () => {
      // If viewing a past session, return its messages (read-only, no polling)
      if (isViewingPast) {
        return loadMessagesFor(viewingSessionId);
      }

      // Poll autonomous agent-to-agent messages from backend (active session only)
      try {
        const autoMsgs = await getAutonomousMessages();

        for (const msg of autoMsgs) {
          const id = msg.id;
          if (!id || seenMessageIds.has(id)) continue;

          const sendId = `${id}-send`;
          if (!seenMessageIds.has(sendId)) {
            seenMessageIds.add(sendId);
            allMessages.push({
              id: sendId,
              authorId: msg.from,
              authorName: msg.from,
              isAgent: true,
              content: msg.content,
              timestamp: msg.timestamp,
              agentColor: getAgentColor(msg.from),
            });
          }

          if (msg.response && msg.to !== 'User') {
            const respId = `${id}-resp`;
            if (!seenMessageIds.has(respId)) {
              seenMessageIds.add(respId);
              allMessages.push({
                id: respId,
                authorId: msg.to,
                authorName: msg.to,
                isAgent: true,
                content: msg.response,
                timestamp: msg.timestamp + 1,
                agentColor: getAgentColor(msg.to),
              });
            }
          }

          seenMessageIds.add(id);
        }
      } catch {}

      allMessages.sort((a, b) => a.timestamp - b.timestamp);
      saveMessagesFor(activeSessionId, allMessages);

      // Update message count in index (only when changed)
      const sessions = loadSessionsIndex();
      const current = sessions.find((s) => s.id === activeSessionId);
      if (current && current.messageCount !== allMessages.length) {
        current.messageCount = allMessages.length;
        saveSessionsIndex(sessions);
      }

      return allMessages;
    },
    staleTime: 3_000,
    refetchInterval: isViewingPast ? false : 5_000, // Don't poll when viewing history
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
      saveMessagesFor(activeSessionId, allMessages);
      queryClient.setQueryData<ChatMessage[]>(['allMessages'], allMessages);

      // Find which agent to talk to
      const targetAgent = findTargetAgent(content, agents);

      // Check if agent is connected — query backend config server (source of truth)
      let isDisconnected = false;
      try {
        const configRes = await fetch(`${window.location.protocol}//${window.location.hostname}:3001/config`);
        const configData = await configRes.json();
        const cfg = configData?.data;
        isDisconnected = !cfg?.defaultApiKey && !cfg?.defaultProvider;
      } catch {
        // Config server unreachable — allow send attempt, backend will handle errors
        isDisconnected = false;
      }

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
        saveMessagesFor(activeSessionId, allMessages);
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
