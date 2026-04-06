// Shared constants for all backend modules

export const SERVER_PORT = process.env.SERVER_PORT || '3000';
export const SERVER_URL = process.env.SERVER_URL || `http://localhost:${SERVER_PORT}`;
export const DEFAULT_MESSAGE_SERVER_ID = '00000000-0000-0000-0000-000000000000';

// Autonomous loop intervals
export const STANDUP_INTERVAL_MS = 8 * 60 * 60 * 1000; // 8 hours
export const IDLE_CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
export const IDLE_THRESHOLD_MS = 25 * 60 * 1000; // 25 minutes
export const OPPORTUNITY_SCAN_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours
export const WELLNESS_CHECK_INTERVAL_MS = 90 * 60 * 1000; // 90 minutes
export const DEPENDENCY_WATCH_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
export const AUTONOMOUS_STAGGER_MS = 10_000; // 10s between each agent's first message

// Trigger delays
export const TRIGGER_RESPONSE_DELAY_MS = 10_000; // 10s agent response simulation
export const MEETING_DURATION_MS = 30_000; // 30s meeting duration

// Agent messaging
export const AGENT_COOLDOWN_MS = 60_000; // 60s between autonomous messages per agent
export const AUTONOMOUS_STARTUP_DELAY_MS = 15_000; // 15s after first agent init

// Context limits
export const RECENT_MEMORIES_LIMIT = 10;
export const README_MAX_LENGTH = 2000;
export const REPO_CONTEXT_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
