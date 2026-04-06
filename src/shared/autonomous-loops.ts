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
  PR_WATCH_INTERVAL_MS,
} from './constants.ts';
import { getLatestCommitSHA, getOpenPRNumbers, fetchCommitDiff, fetchPRFiles } from './github-service.ts';
import { DATA_DIR } from './constants.ts';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

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

      // Share standup summary directly with user
      if (responses.length > 0) {
        await postToUser(
          'Chief',
          `Daily standup complete. ${responses.length} agent(s) reported:\n\n${responses.join('\n\n')}`
        );
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
      // Tell the user directly about new opportunities
      await postToUser(
        'Bounty Hunter',
        'Just finished scanning Devpost, Devfolio, Superteam, Immunefi, and more for new opportunities. Ask me to break down the top matches!'
      );
      // Also brief Chief so he can prioritize
      await sendAgentMessage(
        'Bounty Hunter',
        'Found new opportunities from my latest scan. Should I share the top matches with the team?',
        'Chief'
      );
    },
  },
  {
    agentName: 'Buddy',
    taskName: 'wellness-check',
    intervalMs: WELLNESS_CHECK_INTERVAL_MS,
    handler: async () => {
      // Tell the user directly
      await postToUser(
        'Buddy',
        "Hey! 🌟 Quick wellness check — you've been working for a while. Time to stretch, grab water, or take a short walk. Your code will still be here when you get back! 💪"
      );
      // Tell Chief so he can find a stopping point
      await sendAgentMessage(
        'Buddy',
        "The team has been going hard. Can we find a natural stopping point soon? Everyone needs a breather.",
        'Chief'
      );
    },
  },
  {
    agentName: 'Radar',
    taskName: 'dependency-watch',
    intervalMs: DEPENDENCY_WATCH_INTERVAL_MS,
    handler: async () => {
      // Tell the user directly
      await postToUser(
        'Radar',
        'Running a dependency check on the project. I will flag any breaking changes or security advisories.'
      );
      // Alert Chief for prioritization
      await sendAgentMessage(
        'Radar',
        'Dependency monitoring update. Flagging any findings for the board.',
        'Chief'
      );
      // Alert Hawk for security review
      await sendAgentMessage(
        'Radar',
        'Flagging dependency updates for your review — check for security implications.',
        'Hawk'
      );
    },
  },
  {
    agentName: 'Hawk',
    taskName: 'pr-watch',
    intervalMs: PR_WATCH_INTERVAL_MS,
    handler: async () => {
      const stateFile = join(DATA_DIR, '.buddies-hawk-state.json');

      // Load last known state
      let lastCommitSHA = '';
      let lastPRNumbers: number[] = [];
      try {
        if (existsSync(stateFile)) {
          const state = JSON.parse(readFileSync(stateFile, 'utf-8'));
          lastCommitSHA = state.lastCommitSHA || '';
          lastPRNumbers = state.lastPRNumbers || [];
        }
      } catch {}

      // Check for new commits
      const currentSHA = await getLatestCommitSHA();
      if (currentSHA && currentSHA !== lastCommitSHA && lastCommitSHA !== '') {
        logger.info(`[AUTONOMOUS] Hawk detected new commit: ${currentSHA}`);

        const diff = await fetchCommitDiff(currentSHA);
        if (diff) {
          // Post to user
          await postToUser(
            'Hawk',
            `New commit detected. Reviewing changes...\n\n\`\`\`diff\n${diff.slice(0, 1500)}\n\`\`\``
          );

          // Send diff to Hawk for deep analysis via session
          const reviewResult = await sendAgentMessage(
            'Chief',
            `Hawk, review this new commit:\n\n\`\`\`diff\n${diff.slice(0, 3000)}\n\`\`\`\n\nCheck for security issues, code quality, and potential bugs. Rate findings by severity.`,
            'Hawk'
          );

          if (reviewResult.sent && reviewResult.response) {
            await postToUser('Hawk', reviewResult.response);
            // Notify Chief about findings
            await sendAgentMessage('Hawk', `Code review complete for latest commit. Here are my findings: ${reviewResult.response.slice(0, 500)}`, 'Chief');
          }
        }
      }

      // Check for new PRs
      const currentPRs = await getOpenPRNumbers();
      const newPRs = currentPRs.filter((pr) => !lastPRNumbers.includes(pr));

      for (const prNumber of newPRs) {
        logger.info(`[AUTONOMOUS] Hawk detected new PR #${prNumber}`);

        const files = await fetchPRFiles(prNumber);
        if (files.length > 0) {
          const fileSummary = files.map((f) =>
            `${f.status === 'added' ? '+' : f.status === 'removed' ? '-' : '~'} ${f.filename} (+${f.additions} -${f.deletions})`
          ).join('\n');

          const patches = files
            .filter((f) => f.patch)
            .slice(0, 5) // Top 5 files
            .map((f) => `### ${f.filename}\n\`\`\`diff\n${f.patch}\n\`\`\``)
            .join('\n\n');

          await postToUser(
            'Hawk',
            `New PR #${prNumber} detected — ${files.length} files changed:\n${fileSummary}`
          );

          // Send to Hawk for review
          const reviewResult = await sendAgentMessage(
            'Chief',
            `Hawk, review PR #${prNumber}. Changed files:\n${fileSummary}\n\nDiffs:\n${patches.slice(0, 3000)}\n\nCheck for security, quality, and bugs.`,
            'Hawk'
          );

          if (reviewResult.sent && reviewResult.response) {
            await postToUser('Hawk', `PR #${prNumber} review:\n\n${reviewResult.response}`);
            await sendAgentMessage('Hawk', `PR #${prNumber} review complete: ${reviewResult.response.slice(0, 500)}`, 'Chief');
          }
        }
      }

      // Save state
      try {
        writeFileSync(stateFile, JSON.stringify({
          lastCommitSHA: currentSHA || lastCommitSHA,
          lastPRNumbers: currentPRs.length > 0 ? currentPRs : lastPRNumbers,
          lastChecked: Date.now(),
        }, null, 2));
      } catch {}
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

/**
 * Session startup standup — every connected agent introduces themselves
 * and reports status directly to the user. Runs once at session start.
 */
async function runStartupStandup(): Promise<void> {
  const connected = getConnectedAgents('');
  if (connected.length === 0) return;

  logger.info(`[AUTONOMOUS] Running startup standup with ${connected.length} agents`);

  // Chief kicks off the standup
  if (!isAgentDisconnected('Chief')) {
    await postToUser('Chief', `Session started. ${connected.length} agent(s) online. Running team standup — checking what happened since last session.`);

    // Ask each agent about their previous activity and current status
    for (const agent of connected) {
      if (agent === 'Chief') continue;

      const prompt = agent === 'Hawk'
        ? 'Standup check-in. Report any code reviews or security findings from the last session, and what you can help with now.'
        : agent === 'Bounty Hunter'
        ? 'Standup check-in. Report any opportunities or hackathons you found recently, and what you are scanning for now.'
        : agent === 'Buddy'
        ? 'Standup check-in. How was the last session — any break reminders sent? How is the team doing? What should we watch for today?'
        : agent === 'Radar'
        ? 'Standup check-in. Report any dependency updates, research findings, or alerts from the last session. Anything we need to watch?'
        : 'Standup check-in. Report your previous activity and current status.';

      const result = await sendAgentMessage('Chief', prompt, agent);
      if (result.sent && result.response) {
        await postToUser(agent, result.response);
      }
    }

    // Chief's own summary
    // Read task state for Chief's report
    let taskSummary = '';
    try {
      const fs = await import('fs');
      const path = await import('path');
      const { DATA_DIR } = await import('./constants.ts');
      const tasksPath = path.join(DATA_DIR, '.buddies-tasks.json');
      if (fs.existsSync(tasksPath)) {
        const tasks = JSON.parse(fs.readFileSync(tasksPath, 'utf-8'));
        if (Array.isArray(tasks) && tasks.length > 0) {
          const done = tasks.filter((t: any) => t.status === 'done').length;
          const active = tasks.filter((t: any) => t.status === 'in_progress').length;
          const todo = tasks.filter((t: any) => t.status === 'todo').length;
          taskSummary = ` Mission board: ${done} done, ${active} active, ${todo} queued.`;
        }
      }
    } catch {}

    await postToUser('Chief', `Standup complete.${taskSummary} All agents reporting. @mention any agent or just ask — we'll route to the right one.`);
  } else {
    // If Chief isn't connected, each agent introduces themselves
    for (const agent of connected) {
      await postToUser(agent, `I'm online and ready to help.`);
    }
  }
}

function launchLoops(): void {
  logger.info(`[AUTONOMOUS] Starting ${AUTONOMOUS_TASKS.length} autonomous tasks`);

  // Run startup standup immediately
  runStartupStandup().catch((err) => {
    logger.error(`[AUTONOMOUS] Startup standup failed: ${err}`);
  });

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
