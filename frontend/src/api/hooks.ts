/**
 * Buddies React Hooks — Clean implementation.
 *
 * Each agent gets its own session. When you @mention an agent,
 * the message goes to that agent's session and the response comes back inline.
 */

import { useState, useEffect } from 'react';
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
import { registerSessionLifecycle, getSessionState } from '../components/session/sessionStore';

/** Shared query key for autonomous messages — one polling owner, multiple readers. */
export const AUTONOMOUS_MESSAGES_KEY = ['autonomous-messages'];

export interface OutgoingMessagePayload {
  displayContent: string;
  agentContent?: string;
}

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
    staleTime: 10_000,
    refetchInterval: 10_000, // Live roster updates for HQ + Sidebar
  });
}

// ── Per-agent sessions ──

// Cache: agentId → sessionId
const sessionCache = new Map<string, string>();

async function getOrCreateSession(agentId: string, forceNew = false): Promise<string> {
  if (!forceNew) {
    const cached = sessionCache.get(agentId);
    if (cached) return cached;
  } else {
    sessionCache.delete(agentId);
  }

  const userId = getUserEntityId();
  const res = await createAgentSession(agentId, userId);
  const sessionId = res?.sessionId || res?.data?.sessionId;
  if (sessionId) sessionCache.set(agentId, sessionId);
  return sessionId;
}

// Detect server-side "session not found" errors so we can recover
function isStaleSessionError(err: any): boolean {
  const msg = (err?.serverError || err?.message || '').toLowerCase();
  return msg.includes('session') && (msg.includes('not found') || msg.includes('expired') || msg.includes('invalid'));
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
  const queryClient = useQueryClient();

  return useQuery<ChatMessage[]>({
    queryKey: ['allMessages', viewingSessionId || activeSessionId],
    queryFn: async () => {
      // If viewing a past session, return its messages (read-only, no polling)
      if (isViewingPast) {
        return loadMessagesFor(viewingSessionId);
      }

      // Poll autonomous messages from backend — show both agent-to-user AND agent-to-agent messages
      // Agent-to-agent messages (standups, coordination) are the core demo moment
      // Filter by session start time so old messages don't bleed into new sessions
      try {
        // Read from shared cache (owned by useAutonomousPoller in Dashboard)
        const autoMsgs: any[] = queryClient.getQueryData(AUTONOMOUS_MESSAGES_KEY) || [];
        const currentSession = loadSessionsIndex().find((s) => s.id === activeSessionId);
        const sessionStart = currentSession?.startedAt || 0;

        for (const msg of autoMsgs) {
          const id = msg.id;
          if (!id || seenMessageIds.has(id)) continue;
          // Skip messages from before this session started
          if (msg.timestamp < sessionStart) { seenMessageIds.add(id); continue; }

          // Show agent-to-user messages (postToUser)
          if (msg.to === 'User') {
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
          } else {
            // Agent-to-agent message — show the exchange in chat
            // Format: "From → To: message" with the response below
            const a2aId = `${id}-a2a`;
            if (!seenMessageIds.has(a2aId)) {
              seenMessageIds.add(a2aId);
              allMessages.push({
                id: a2aId,
                authorId: msg.from,
                authorName: msg.from,
                isAgent: true,
                content: `*(to ${msg.to})* ${msg.content}`,
                timestamp: msg.timestamp,
                agentColor: getAgentColor(msg.from),
              });
              // Show the target agent's response if available
              if (msg.response) {
                const respId = `${id}-a2a-resp`;
                seenMessageIds.add(respId);
                allMessages.push({
                  id: respId,
                  authorId: msg.to,
                  authorName: msg.to,
                  isAgent: true,
                  content: msg.response,
                  timestamp: msg.timestamp + 1, // +1ms to sort after the prompt
                  agentColor: getAgentColor(msg.to),
                });
              }
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

// Typing state — shared so ChatRoom can read it
let typingAgent: string | null = null;
const typingListeners = new Set<() => void>();
function setTypingAgent(name: string | null) {
  typingAgent = name;
  typingListeners.forEach((l) => l());
}
export function useTypingAgent(): string | null {
  const [, rerender] = useState(0);
  useEffect(() => {
    const listener = () => rerender((n) => n + 1);
    typingListeners.add(listener);
    return () => { typingListeners.delete(listener); };
  }, []);
  return typingAgent;
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { data: agents } = useAgents();
  const entityId = getUserEntityId();

  return useMutation({
    mutationFn: async (payload: string | OutgoingMessagePayload) => {
      if (!agents || agents.length === 0) throw new Error('No agents');

      const displayContent = typeof payload === 'string' ? payload : payload.displayContent;

      // Add user message immediately
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        authorId: entityId,
        authorName: 'You',
        isAgent: false,
        content: displayContent,
        timestamp: Date.now(),
      };
      seenMessageIds.add(userMsg.id);
      allMessages = [...allMessages, userMsg];
      saveMessagesFor(activeSessionId, allMessages);
      queryClient.setQueryData<ChatMessage[]>(['allMessages', activeSessionId], allMessages);

      // Find which agent to talk to
      const targetAgent = findTargetAgent(displayContent, agents);
      const content = typeof payload === 'string'
        ? enrichAgentMessage(displayContent, targetAgent.name)
        : (payload.agentContent || payload.displayContent);

      // Show typing indicator
      setTypingAgent(targetAgent.name);

      try {
        // Get or create session for this agent
        let sessionId = await getOrCreateSession(targetAgent.id);
        if (!sessionId) throw new Error('Failed to create session');

        // Send and get response (HTTP transport — synchronous).
        // If the cached session is stale (server restarted), retry once
        // with a fresh session.
        let data;
        try {
          data = await sendMessage(sessionId, content);
        } catch (sendErr: any) {
          if (isStaleSessionError(sendErr)) {
            sessionId = await getOrCreateSession(targetAgent.id, true);
            if (!sessionId) throw sendErr;
            data = await sendMessage(sessionId, content);
          } else {
            throw sendErr;
          }
        }

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
          queryClient.setQueryData<ChatMessage[]>(['allMessages', activeSessionId], allMessages);

          // Log to Intel feed
          pushEvent('message', targetAgent.name, agentResponse.text.slice(0, 100));
        } else {
          // Agent didn't respond — add error message
          const errMsg: ChatMessage = {
            id: `err-${Date.now()}`,
            authorId: targetAgent.id,
            authorName: targetAgent.name,
            isAgent: true,
            content: `${targetAgent.name} did not respond. The agent may be busy or temporarily unavailable.`,
            timestamp: Date.now(),
            agentColor: targetAgent.color,
          };
          seenMessageIds.add(errMsg.id);
          allMessages = [...allMessages, errMsg];
          saveMessagesFor(activeSessionId, allMessages);
          queryClient.setQueryData<ChatMessage[]>(['allMessages', activeSessionId], allMessages);
        }

        return data;
      } catch (err: any) {
        // Show the real error message from the server
        const serverMsg = err?.serverError || err?.message || '';
        let displayMsg: string;
        if (serverMsg.includes('rate') || serverMsg.includes('Limit') || serverMsg.includes('TPM') || serverMsg.includes('too large')) {
          displayMsg = `${targetAgent.name} hit a rate limit. Try again in a moment or use a shorter message.`;
        } else if (serverMsg.includes('Unauthorized') || serverMsg.includes('API key')) {
          displayMsg = `${targetAgent.name} has an invalid API key. Check the Connect tab.`;
        } else if (serverMsg.includes('Not Found') || serverMsg.includes('404')) {
          displayMsg = `${targetAgent.name} could not reach the AI provider. Check the model name and provider settings.`;
        } else {
          displayMsg = `Cannot reach ${targetAgent.name}. ${serverMsg || 'The agent may be offline or misconfigured.'}`;
        }
        const errMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          authorId: targetAgent.id,
          authorName: targetAgent.name,
          isAgent: true,
          content: displayMsg,
          timestamp: Date.now(),
          agentColor: targetAgent.color,
        };
        seenMessageIds.add(errMsg.id);
        allMessages = [...allMessages, errMsg];
        saveMessagesFor(activeSessionId, allMessages);
        queryClient.setQueryData<ChatMessage[]>(['allMessages', activeSessionId], allMessages);
        throw err;
      } finally {
        setTypingAgent(null);
      }
    },
  });
}

const REFERENTIAL_FOLLOWUP_RE = /\b(this|that|these|those|it|them|links?|above|earlier|previous|same|break down|for these)\b/i;

function stripMentions(content: string): string {
  return content.replace(/@([\w][\w\s]*[\w])(?=\s|$|[.,!?])/g, '').trim();
}

function truncateContext(content: string, maxLength = 900): string {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3)}...`;
}

function shouldAttachRecentContext(content: string, targetAgentName: string): boolean {
  const lower = content.toLowerCase();
  const hasExplicitMention = lower.includes(`@${targetAgentName.toLowerCase()}`);
  const stripped = stripMentions(content);
  const wordCount = stripped ? stripped.split(/\s+/).length : 0;
  return hasExplicitMention && (REFERENTIAL_FOLLOWUP_RE.test(stripped) || wordCount <= 8);
}

function enrichAgentMessage(content: string, targetAgentName: string): string {
  if (!shouldAttachRecentContext(content, targetAgentName)) return content;

  const recentContext = [...allMessages]
    .reverse()
    .find((msg) => msg.isAgent && msg.authorName === targetAgentName);

  if (!recentContext) return content;

  return `${content}

[Recent context from ${targetAgentName}'s previous message]
${truncateContext(recentContext.content)}

Use that context to resolve references like "these", "those", "the links", or "the list above".`;
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
  // Check @mention first (supports multi-word names like "Bounty Hunter")
  const mention = content.match(/@([\w][\w\s]*[\w])(?=\s|$|[.,!?])/);
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

// ── Autonomous Messages Poller (Dashboard-level, single owner) ──

const seenActivityIds = new Set<string>();

/**
 * Single polling owner for autonomous messages. Call this in Dashboard.tsx
 * (always mounted). WarRoomTimeline and useMessages read from the shared cache.
 * Pushes new messages to the INTEL activity feed.
 */
export function useAutonomousPoller() {
  const { data } = useQuery({
    queryKey: AUTONOMOUS_MESSAGES_KEY,
    queryFn: getAutonomousMessages,
    refetchInterval: 3_000,
    staleTime: 2_000,
  });

  // Push new messages to INTEL activity feed (runs only when data reference changes)
  useEffect(() => {
    if (!data) return;
    const sessionStart = getSessionState().startTime || 0;
    for (const msg of data) {
      if (!msg.id || seenActivityIds.has(msg.id)) continue;
      seenActivityIds.add(msg.id);
      if (msg.timestamp && msg.timestamp < sessionStart) continue;

      // Push initiating message
      const eventType = msg.to === 'User' ? 'message' as const : 'system' as const;
      pushEvent(eventType, msg.from, msg.content?.slice(0, 120) || 'Agent activity');

      // Push response side (agent-to-agent exchanges show both sides)
      if (msg.response && msg.to && msg.to !== 'User') {
        pushEvent('system', msg.to, msg.response.slice(0, 120));
      }
    }
  }, [data]);
}

// ── Agent States ──

export function useAgentStates() {
  return useQuery<AgentState[]>({
    queryKey: ['agentStates'],
    queryFn: getAgentStates,
    refetchInterval: 3_000,
  });
}
