import { logger } from '@elizaos/core';
import { agentStateManager, AgentStatus } from './agent-state.ts';
import { sendAgentMessage, postToUser } from './agent-messenger.ts';
import { isAgentDisconnected } from './ai-config.ts';
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

// Helper: get list of connected agent names (excluding a given agent)
function getConnectedAgents(exclude: string): string[] {
  const allAgents = ['Chief', 'Hawk', 'Radar', 'Bounty Hunter', 'Buddy'];
  return allAgents.filter((a) => a !== exclude && !isAgentDisconnected(a));
}

const AUTONOMOUS_TASKS: AutonomousTask[] = [
  {
    agentName: 'Chief',
    taskName: 'standup',
    intervalMs: STANDUP_INTERVAL_MS,
    handler: async () => {
      const connected = getConnectedAgents('Chief');
      if (connected.length === 0) return;

      logger.info(`[AUTONOMOUS] Chief starting standup with ${connected.length} agents`);

      // Send status request to each connected agent, collect responses
      const responses: string[] = [];
      for (const agent of connected) {
        const result = await sendAgentMessage('Chief', `Team standup. ${agent}, give me a quick status update — what are you working on and any blockers?`, agent);
        if (result.sent && result.response) {
          responses.push(`**${agent}:** ${result.response}`);
        }
      }

      if (responses.length > 0) {
        logger.info(`[AUTONOMOUS] Standup complete. ${responses.length} agents responded.`);
      }
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
          !isAgentDisconnected(s.agentName) &&
          Date.now() - s.lastUpdated > IDLE_THRESHOLD_MS
      );

      for (const idle of idleAgents) {
        await sendAgentMessage('Chief', `Checking in — ${idle.agentName}, you've been quiet. Anything to report or need a task assignment?`, idle.agentName);
      }
    },
  },
  {
    agentName: 'Bounty Hunter',
    taskName: 'opportunity-scan',
    intervalMs: OPPORTUNITY_SCAN_INTERVAL_MS,
    handler: async () => {
      // Report findings to Chief for evaluation
      await sendAgentMessage(
        'Bounty Hunter',
        'Just finished scanning for new opportunities across Devpost, Devfolio, Superteam, and more. Chief, I have matches worth reviewing — should I break down the top prospects?',
        'Chief'
      );
    },
  },
  {
    agentName: 'Buddy',
    taskName: 'wellness-check',
    intervalMs: WELLNESS_CHECK_INTERVAL_MS,
    handler: async () => {
      // Buddy talks directly to the user — no routing through Chief
      await postToUser(
        'Buddy',
        "Hey! 🌟 Quick wellness check — you've been working for a while. Time to stretch, grab water, or take a short walk. Your code will still be here when you get back! 💪"
      );
    },
  },
  {
    agentName: 'Radar',
    taskName: 'dependency-watch',
    intervalMs: DEPENDENCY_WATCH_INTERVAL_MS,
    handler: async () => {
      // Alert Chief and Hawk about dependency status
      const chiefResult = await sendAgentMessage(
        'Radar',
        'Dependency monitoring update. Running a check on project dependencies for breaking changes or security advisories. Chief, adding any findings to the board.',
        'Chief'
      );

      // If Chief acknowledges, also notify Hawk
      if (chiefResult.sent) {
        await sendAgentMessage(
          'Radar',
          'Hawk, flagging dependency updates for your review — check for any security implications in the affected files.',
          'Hawk'
        );
      }
    },
  },
];

const activeTimers = new Map<string, ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>>();

function isAgentBusy(agentName: string): boolean {
  const state = agentStateManager.getState(agentName);
  if (!state) return false;
  return state.status === AgentStatus.WORKING || state.status === AgentStatus.MEETING;
}

const CHANNEL_POLL_INTERVAL_MS = 5_000;
const MAX_CHANNEL_RETRIES = 60;

export function startAutonomousLoops(): void {
  if (!AUTONOMOUS_ENABLED) {
    logger.info('[AUTONOMOUS] Loops disabled (AUTONOMOUS_ENABLED=false)');
    return;
  }

  // Check if any agents are connected — no point running loops if nobody can respond
  const connected = getConnectedAgents('');
  if (connected.length < 2) {
    logger.info(`[AUTONOMOUS] Only ${connected.length} agent(s) connected, need at least 2 for autonomous chat. Will retry...`);
    let retries = 0;
    const poller = setInterval(() => {
      retries++;
      const nowConnected = getConnectedAgents('');
      if (nowConnected.length >= 2) {
        clearInterval(poller);
        logger.info(`[AUTONOMOUS] ${nowConnected.length} agents connected, starting loops`);
        launchLoops();
      } else if (retries >= MAX_CHANNEL_RETRIES) {
        clearInterval(poller);
        logger.warn('[AUTONOMOUS] Not enough connected agents after 5 min, loops disabled');
      }
    }, CHANNEL_POLL_INTERVAL_MS);
    return;
  }

  launchLoops();
}

function launchLoops(): void {
  logger.info(`[AUTONOMOUS] Starting ${AUTONOMOUS_TASKS.length} autonomous tasks`);

  AUTONOMOUS_TASKS.forEach((task, index) => {
    const key = `${task.agentName}:${task.taskName}`;

    // Skip if the agent isn't connected
    if (isAgentDisconnected(task.agentName)) {
      logger.info(`[AUTONOMOUS] Skipping ${key} — agent not connected`);
      return;
    }

    const initTimer = setTimeout(async () => {
      if (!isAgentBusy(task.agentName)) {
        try {
          await task.handler();
        } catch (err) {
          logger.error(`[AUTONOMOUS] Task ${key} failed: ${err}`);
        }
      }

      const interval = setInterval(async () => {
        if (isAgentBusy(task.agentName) || isAgentDisconnected(task.agentName)) {
          return;
        }
        try {
          await task.handler();
        } catch (err) {
          logger.error(`[AUTONOMOUS] Task ${key} failed: ${err}`);
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
  logger.info('[AUTONOMOUS] Loops stopped');
}
