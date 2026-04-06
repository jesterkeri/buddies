import { logger } from '@elizaos/core';
import { agentStateManager, AgentStatus } from './agent-state.ts';
import { sendAgentMessage } from './agent-messenger.ts';
import { getTeamChannelId } from './team-channel.ts';
import {
  STANDUP_INTERVAL_MS,
  IDLE_CHECK_INTERVAL_MS,
  IDLE_THRESHOLD_MS,
  OPPORTUNITY_SCAN_INTERVAL_MS,
  WELLNESS_CHECK_INTERVAL_MS,
  DEPENDENCY_WATCH_INTERVAL_MS,
  AUTONOMOUS_STAGGER_MS,
} from './constants.ts';

const AUTONOMOUS_ENABLED = process.env.AUTONOMOUS_ENABLED !== 'false';

interface AutonomousTask {
  agentName: string;
  taskName: string;
  intervalMs: number;
  handler: () => Promise<void>;
}

const AUTONOMOUS_TASKS: AutonomousTask[] = [
  {
    agentName: 'Chief',
    taskName: 'standup',
    intervalMs: STANDUP_INTERVAL_MS,
    handler: async () => {
      await sendAgentMessage(
        'Chief',
        'Team standup. Everyone, give me a quick status update — what are you working on and any blockers? Hawk, Radar, Bounty Hunter, Buddy — sound off.'
      );
    },
  },
  {
    agentName: 'Chief',
    taskName: 'idle-check',
    intervalMs: IDLE_CHECK_INTERVAL_MS,
    handler: async () => {
      const states = agentStateManager.getAllStates();
      const idleAgents = states.filter(
        (s) =>
          s.status === AgentStatus.IDLE &&
          s.agentName !== 'Chief' &&
          Date.now() - s.lastUpdated > IDLE_THRESHOLD_MS
      );

      if (idleAgents.length > 0) {
        const names = idleAgents.map((a) => `@${a.agentName}`).join(', ');
        await sendAgentMessage(
          'Chief',
          `Checking in — ${names}, you've been quiet. Anything to report or need a task assignment?`
        );
      }
    },
  },
  {
    agentName: 'Bounty Hunter',
    taskName: 'opportunity-scan',
    intervalMs: OPPORTUNITY_SCAN_INTERVAL_MS,
    handler: async () => {
      await sendAgentMessage(
        'Bounty Hunter',
        'Just finished scanning for new opportunities. Chief, I have some matches worth reviewing — want me to break down the top prospects?'
      );
    },
  },
  {
    agentName: 'Buddy',
    taskName: 'wellness-check',
    intervalMs: WELLNESS_CHECK_INTERVAL_MS,
    handler: async () => {
      await sendAgentMessage(
        'Buddy',
        "Hey team! 🌟 Quick wellness check — everyone's been grinding. Time for a stretch break or a snack? Chief, maybe we can find a good stopping point soon!"
      );
    },
  },
  {
    agentName: 'Radar',
    taskName: 'dependency-watch',
    intervalMs: DEPENDENCY_WATCH_INTERVAL_MS,
    handler: async () => {
      await sendAgentMessage(
        'Radar',
        'Dependency monitoring update. Running a check on our project dependencies for any breaking changes or security advisories. Hawk, I will flag anything that needs your review.'
      );
    },
  },
];

const activeTimers = new Map<string, ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>>();

function isAgentBusy(agentName: string): boolean {
  const state = agentStateManager.getState(agentName);
  if (!state) return false;
  return state.status === AgentStatus.WORKING || state.status === AgentStatus.MEETING;
}

const CHANNEL_POLL_INTERVAL_MS = 5_000; // Check every 5s
const MAX_CHANNEL_RETRIES = 60; // Give up after 5 minutes

export function startAutonomousLoops(): void {
  if (!AUTONOMOUS_ENABLED) {
    logger.info('[BUDDIES] Autonomous loops disabled (AUTONOMOUS_ENABLED=false)');
    return;
  }

  // Retry until team channel is ready (don't give up on first try)
  if (!getTeamChannelId()) {
    logger.info('[BUDDIES] Team channel not ready, will retry...');
    let retries = 0;
    const poller = setInterval(() => {
      retries++;
      if (getTeamChannelId()) {
        clearInterval(poller);
        logger.info(`[BUDDIES] Team channel ready after ${retries} retries, starting loops`);
        launchLoops();
      } else if (retries >= MAX_CHANNEL_RETRIES) {
        clearInterval(poller);
        logger.warn('[BUDDIES] Team channel never became ready, autonomous loops disabled');
      }
    }, CHANNEL_POLL_INTERVAL_MS);
    return;
  }

  launchLoops();
}

function launchLoops(): void {
  logger.info(`[BUDDIES] Starting autonomous loops for ${AUTONOMOUS_TASKS.length} tasks`);

  AUTONOMOUS_TASKS.forEach((task, index) => {
    const key = `${task.agentName}:${task.taskName}`;

    // Staggered initial run
    const initTimer = setTimeout(async () => {
      if (!isAgentBusy(task.agentName)) {
        try {
          await task.handler();
        } catch (err) {
          logger.error(`[BUDDIES] Autonomous task ${key} failed: ${err}`);
        }
      }

      // Set up recurring interval
      const interval = setInterval(async () => {
        if (isAgentBusy(task.agentName)) {
          logger.info(`[BUDDIES] Skipping ${key} — agent is busy`);
          return;
        }
        try {
          await task.handler();
        } catch (err) {
          logger.error(`[BUDDIES] Autonomous task ${key} failed: ${err}`);
        }
      }, task.intervalMs);

      activeTimers.set(`${key}:interval`, interval);
    }, AUTONOMOUS_STAGGER_MS * index);

    activeTimers.set(`${key}:init`, initTimer);
  });
}

export function stopAutonomousLoops(): void {
  for (const [key, timer] of activeTimers) {
    if (key.endsWith(':interval')) {
      clearInterval(timer);
    } else {
      clearTimeout(timer);
    }
  }
  activeTimers.clear();
  logger.info('[BUDDIES] Autonomous loops stopped');
}
