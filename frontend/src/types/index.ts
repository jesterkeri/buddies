export const AGENT_COLORS: Record<string, string> = {
  Chief: '#3b82f6',
  Hawk: '#E41937',
  Radar: '#2BB6B3',
  'Bounty Hunter': '#F9D616',
  Buddy: '#a855f7',
};

export const AGENT_NAMES = ['Chief', 'Hawk', 'Radar', 'Bounty Hunter', 'Buddy'] as const;

export type AgentName = (typeof AGENT_NAMES)[number];

export interface AgentInfo {
  id: string;
  name: string;
  color: string;
}

export interface ChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  isAgent: boolean;
  content: string;
  timestamp: number;
  agentColor?: string;
}

export interface AgentState {
  agentName: string;
  status: string;
  currentTask?: string;
  lastUpdated: number;
}

export type TabId = 'chat' | 'office' | 'tasks' | 'activity' | 'connect';

export function getAgentColor(name: string): string {
  return AGENT_COLORS[name] || '#64748b';
}

export function getUserEntityId(): string {
  const KEY = 'buddies-entity-id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
