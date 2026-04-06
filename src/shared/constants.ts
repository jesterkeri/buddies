import { join } from 'path';

// Shared constants for all backend modules

// Data directory — persists across container restarts via Docker volume
export const DATA_DIR = process.env.NODE_ENV === 'production'
  ? join(process.cwd(), 'data')
  : process.cwd();

export const SERVER_PORT = process.env.SERVER_PORT || '3000';
export const SERVER_URL = process.env.SERVER_URL || `http://localhost:${SERVER_PORT}`;
export const DEFAULT_MESSAGE_SERVER_ID = '00000000-0000-0000-0000-000000000000';

// Autonomous loop intervals
// In development, use shorter intervals for testing. Set FAST_LOOPS=true in .env
const FAST = process.env.FAST_LOOPS === 'true';
export const STANDUP_INTERVAL_MS = FAST ? 5 * 60 * 1000 : 8 * 60 * 60 * 1000; // 5min dev / 8hr prod
export const IDLE_CHECK_INTERVAL_MS = FAST ? 3 * 60 * 1000 : 30 * 60 * 1000; // 3min dev / 30min prod
export const IDLE_THRESHOLD_MS = FAST ? 2 * 60 * 1000 : 25 * 60 * 1000; // 2min dev / 25min prod
export const OPPORTUNITY_SCAN_INTERVAL_MS = FAST ? 5 * 60 * 1000 : 4 * 60 * 60 * 1000; // 5min dev / 4hr prod
export const WELLNESS_CHECK_INTERVAL_MS = FAST ? 4 * 60 * 1000 : 90 * 60 * 1000; // 4min dev / 90min prod
export const DEPENDENCY_WATCH_INTERVAL_MS = FAST ? 6 * 60 * 1000 : 6 * 60 * 60 * 1000; // 6min dev / 6hr prod
export const AUTONOMOUS_STAGGER_MS = FAST ? 5_000 : 10_000; // 5s dev / 10s prod

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
