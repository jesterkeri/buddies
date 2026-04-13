import { logger } from '@elizaos/core';
import { agentStateManager, AgentStatus } from './agent-state.ts';
import { sendAgentMessage, postToUser } from './agent-messenger.ts';
import { isAgentDisconnected, getAgentAiConfig } from './ai-config.ts';
import { apiCall } from './http.ts';
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
import { getLatestCommitSHA, getOpenPRNumbers, fetchCommitDiff, fetchPRFiles, getRepoContext } from './github-service.ts';
import { getSessionConfig } from './config-server.ts';
import { fetchAllBounties } from './bounty-service.ts';
import { DATA_DIR } from './constants.ts';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const AUTONOMOUS_ENABLED = process.env.AUTONOMOUS_ENABLED !== 'false';
// Track when the backend process started (fallback for wellness checks)
const processStartTime = Date.now();

function getSessionStartTime(): number {
  // Try to read the actual user session start time from the session-event file
  try {
    const eventPath = join(DATA_DIR, '.buddies-session-event.json');
    if (existsSync(eventPath)) {
      const data = JSON.parse(readFileSync(eventPath, 'utf-8'));
      if (data.workSessionActive && data.workSessionStartedAt) {
        return data.workSessionStartedAt;
      }
    }
  } catch {}
  return processStartTime;
}

interface AutonomousTask {
  agentName: string;
  taskName: string;
  intervalMs: number;
  handler: () => Promise<void>;
}

// Full agent roster — agentStateManager is for current status, NOT for who exists.
// This list is the source of truth for "which agents could be contacted."
const ALL_AGENTS = ['Chief', 'Hawk', 'Radar', 'Bounty Hunter', 'Buddy'];

// Helper: get list of connected agent names (excluding a given agent).
// Always uses the full roster filtered by isAgentDisconnected.
function getConnectedAgents(exclude: string): string[] {
  return ALL_AGENTS.filter((a) => a !== exclude && !isAgentDisconnected(a));
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
      // Actually fetch real bounties before reporting
      try {
        const bounties = await fetchAllBounties();
        if (bounties.length === 0) {
          logger.info('[AUTONOMOUS] Bounty scan: no listings found, skipping post');
          return;
        }

        const summary = bounties
          .slice(0, 5)
          .map((b) => {
            const title = (b.title || 'Untitled').replace(/[\\\[\]()*_`]/g, '\\$&');
            const source = (b.source || 'Unknown').replace(/[\\\[\]()*_`]/g, '\\$&');
            const titleLink = b.url ? `[${title}](${b.url})` : `**${title}**`;
            return `- ${titleLink} (${source})${b.prize ? ` — ${b.prize}` : ''}`;
          })
          .join('\n');

        await postToUser(
          'Bounty Hunter',
          `Found ${bounties.length} opportunities across my sources. Top picks:\n\n${summary}\n\nAsk me to break down any of these!`
        );

        // Brief Chief with real data
        await sendAgentMessage(
          'Bounty Hunter',
          `Scanned and found ${bounties.length} real opportunities. Top: ${bounties[0].title} (${bounties[0].source}). Want me to match these against the team's skills?`,
          'Chief'
        );
      } catch (err) {
        logger.error(`[AUTONOMOUS] Bounty scan failed: ${err}`);
      }
    },
  },
  {
    agentName: 'Buddy',
    taskName: 'wellness-check',
    intervalMs: WELLNESS_CHECK_INTERVAL_MS,
    handler: async () => {
      // Send wellness checks based on elapsed time, scaled to be useful for demos
      // and for real use. Wait 25 min minimum so we don't pester immediately.
      const elapsedMin = Math.floor((Date.now() - getSessionStartTime()) / 60_000);
      if (elapsedMin < 25) {
        logger.info(`[AUTONOMOUS] Buddy wellness: only ${elapsedMin}min elapsed, skipping (need 25+)`);
        return;
      }

      const hours = Math.floor(elapsedMin / 60);
      const mins = elapsedMin % 60;
      const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

      // Pick a reminder type based on duration so the messages stay varied
      let prompt: string;
      if (elapsedMin < 60) {
        prompt = `The user has been working for ${timeStr} this session. Send a quick, warm check-in reminding them to drink water or stretch. Keep it under 2 sentences. Use 1 emoji.`;
      } else if (elapsedMin < 120) {
        prompt = `The user has been working for ${timeStr} straight. They should take a real break — get up, walk around, eat something. Send a friendly reminder, specific about the time. Keep it under 2 sentences. Use 1 emoji.`;
      } else {
        prompt = `The user has been working for ${timeStr} non-stop. That's a lot. Send a slightly more insistent but still kind reminder to take a longer break. Be specific about the duration. Keep it under 3 sentences. Use 1-2 emojis.`;
      }

      // LLM-generated via sendAgentMessage so it stays in Buddy's voice
      const result = await sendAgentMessage('Chief', prompt, 'Buddy');

      if (result.sent && result.response) {
        await postToUser('Buddy', result.response);
        logger.info(`[AUTONOMOUS] Buddy wellness check fired at ${timeStr} elapsed`);
      }
    },
  },
  {
    agentName: 'Radar',
    taskName: 'dependency-watch',
    intervalMs: DEPENDENCY_WATCH_INTERVAL_MS,
    handler: async () => {
      // Only run if a repo is connected
      const session = getSessionConfig();
      if (!session.repoConnected || !session.githubToken) {
        logger.info('[AUTONOMOUS] Radar dep-watch: no repo connected, skipping');
        return;
      }

      // Fetch real repo context to check deps
      const repoCtx = await getRepoContext();
      if (!repoCtx) {
        logger.info('[AUTONOMOUS] Radar dep-watch: could not fetch repo context');
        return;
      }

      // Ask Radar to analyze via LLM
      const result = await sendAgentMessage(
        'Radar',
        `Check the dependency state for this project:\n\n${repoCtx.slice(0, 2000)}\n\nReport only actual findings — outdated packages, known CVEs, or breaking changes. If nothing notable, say so briefly.`,
        'Radar'
      );

      if (result.sent && result.response) {
        await postToUser('Radar', result.response);

        // Only alert others if there are actual findings
        if (/critical|high|cve|vulnerability|breaking/i.test(result.response)) {
          await sendAgentMessage('Radar', `Dependency alert: ${result.response.slice(0, 500)}`, 'Chief');
          await sendAgentMessage('Radar', `Security-relevant dependency update: ${result.response.slice(0, 500)}`, 'Hawk');
        }
      }
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
      if (currentSHA && currentSHA !== lastCommitSHA) {
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

/** Check how many agents are actually registered in ElizaOS (not just AI config) */
async function getRegisteredAgentCount(): Promise<number> {
  try {
    const res = await apiCall('/api/agents');
    const agents = res?.data?.agents || res?.agents || res?.data || [];
    return Array.isArray(agents) ? agents.length : 0;
  } catch {
    return 0;
  }
}

let loopsLaunched = false;

export function startAutonomousLoops(): void {
  if (!AUTONOMOUS_ENABLED) {
    logger.info('[AUTONOMOUS] Loops disabled (AUTONOMOUS_ENABLED=false)');
    return;
  }
  if (loopsLaunched) return;

  // Poll until agents are actually registered in ElizaOS (not just AI config).
  // We launch the loops as soon as ANY agent registers — even just 1 — because
  // the per-task setInterval handlers gate themselves on isAgentDisconnected
  // at every tick, so it's safe to start with 1 and let the rest activate
  // automatically as they connect.
  let retries = 0;
  let pollerHandle: ReturnType<typeof setInterval> | null = null;

  const tick = async (): Promise<void> => {
    retries++;
    const registered = await getRegisteredAgentCount();

    if (registered >= 1 && retries >= 3) {
      // After ~15s with at least 1 agent, launch. Per-tick gating handles late arrivals.
      if (pollerHandle) clearInterval(pollerHandle);
      loopsLaunched = true;
      logger.info(`[AUTONOMOUS] ${registered} agent(s) registered after ${retries} attempts, launching loops (others will activate on connect)`);
      launchLoops();
    } else if (retries >= MAX_CHANNEL_RETRIES) {
      if (pollerHandle) clearInterval(pollerHandle);
      // Even with 0 agents, launch the loops anyway. The per-tick checks
      // will keep them dormant until something connects. Better dormant
      // intervals than no loops at all.
      loopsLaunched = true;
      logger.warn(`[AUTONOMOUS] Max retries reached with ${registered} agents — launching loops anyway, will activate on connect`);
      launchLoops();
    } else {
      logger.info(`[AUTONOMOUS] Waiting for agents to register... ${registered} so far (attempt ${retries})`);
    }
  };

  // Run the first check immediately so a fully-loaded boot can launch in <1s
  // instead of waiting 5s for the first interval tick.
  tick().catch((err) => logger.error(`[AUTONOMOUS] Initial tick failed: ${err}`));
  pollerHandle = setInterval(tick, CHANNEL_POLL_INTERVAL_MS);
}

// In-flight guard to prevent duplicate concurrent standup runs.
// Both launchLoops() and triggerStandupIfNeeded() can call runStartupStandup,
// and the async nature means they can overlap and double-post.
let standupInFlight = false;

/**
 * Session startup standup — Chief asks each agent for a status update via LLM.
 * Only runs when an API key is configured (no point without LLM).
 * Returns true ONLY if a standup was actually posted to the user.
 * Callers use this to decide whether to latch the "completed" flag.
 */
export async function runStartupStandup(): Promise<boolean> {
  if (standupInFlight) {
    logger.info('[AUTONOMOUS] Standup already in flight — skipping duplicate');
    return false;
  }
  standupInFlight = true;
  try {
    return await runStartupStandupInner();
  } finally {
    standupInFlight = false;
  }
}

async function runStartupStandupInner(): Promise<boolean> {
  const connected = getConnectedAgents('');
  if (connected.length === 0) {
    logger.info('[AUTONOMOUS] Standup skipped — no connected agents yet');
    return false;
  }

  // Don't run standup if no API key is configured — agents can't generate responses
  if (!hasApiKey()) {
    logger.info('[AUTONOMOUS] Standup skipped — no API key configured yet');
    return false;
  }

  if (isAgentDisconnected('Chief')) {
    logger.info('[AUTONOMOUS] Standup skipped — Chief is disconnected');
    return false;
  }

  logger.info(`[AUTONOMOUS] Running startup standup with ${connected.length} agents`);

  // Ask each agent for a real LLM-generated status update
  const responses: string[] = [];
  for (const agent of connected) {
    if (agent === 'Chief') continue;

    const result = await sendAgentMessage(
      'Chief',
      `Quick standup check-in. What can you help with right now? Keep it to 1-2 sentences.`,
      agent
    );
    if (result.sent && result.response) {
      responses.push(`**${agent}:** ${result.response}`);
    }
  }

  // Only consider the standup complete if we actually got responses to post
  if (responses.length === 0) {
    logger.info('[AUTONOMOUS] Standup ran but no agents responded — not latching');
    return false;
  }

  // Read task state for context
  let taskSummary = '';
  try {
    const tasksPath = join(DATA_DIR, '.buddies-tasks.json');
    if (existsSync(tasksPath)) {
      const tasks = JSON.parse(readFileSync(tasksPath, 'utf-8'));
      if (Array.isArray(tasks) && tasks.length > 0) {
        const done = tasks.filter((t: any) => t.status === 'done').length;
        const active = tasks.filter((t: any) => t.status === 'in_progress').length;
        const todo = tasks.filter((t: any) => t.status === 'todo').length;
        taskSummary = `\n\nMission board: ${done} done, ${active} active, ${todo} queued.`;
      }
    }
  } catch {}

  await postToUser(
    'Chief',
    `Team standup — ${responses.length} agent(s) reporting:\n\n${responses.join('\n\n')}${taskSummary}`
  );

  return true;
}

function hasApiKey(): boolean {
  // Check dynamic per-agent config first (covers Google, Groq, OpenAI, etc.)
  const allAgents = ['Chief', 'Hawk', 'Radar', 'Bounty Hunter', 'Buddy'];
  for (const agent of allAgents) {
    const config = getAgentAiConfig(agent);
    if (config.provider && config.provider !== 'none' && config.apiKey) {
      return true;
    }
  }
  // Fallback: check process.env for keys set outside the frontend config
  const keys = [process.env.OPENAI_API_KEY, process.env.ANTHROPIC_API_KEY];
  return keys.some((k) => k && k !== '' && k !== 'disabled');
}

function launchLoops(): void {
  logger.info(`[AUTONOMOUS] Starting ${AUTONOMOUS_TASKS.length} autonomous tasks`);

  // Run startup standup immediately (it checks for API key internally).
  // Only latch standupCompleted=true if a standup was actually posted.
  runStartupStandup()
    .then((posted) => { if (posted) standupCompleted = true; })
    .catch((err) => {
      logger.error(`[AUTONOMOUS] Startup standup failed: ${err}`);
    });

  // Start an interval for EVERY task regardless of current connection state.
  // The per-tick check will skip the handler if the agent isn't connected
  // when the interval fires. This means a user can connect an agent later
  // and its loop starts ticking automatically — no restart required.
  AUTONOMOUS_TASKS.forEach((task) => {
    const key = `${task.agentName}:${task.taskName}`;

    if (isAgentDisconnected(task.agentName)) {
      logger.info(`[AUTONOMOUS] ${key} interval registered (agent currently disconnected, will activate when connected)`);
    }

    const interval = setInterval(async () => {
      // Per-tick gating: skip the handler if the world isn't ready for this task
      if (!hasApiKey() || isAgentBusy(task.agentName) || isAgentDisconnected(task.agentName)) {
        return;
      }
      try {
        await task.handler();
      } catch (err) {
        logger.error(`[AUTONOMOUS] Task ${key} failed: ${err}`);
      }
    }, task.intervalMs);

    activeTimers.set(`${key}:interval`, interval);
  });
}

// Track whether the startup standup has run successfully
let standupCompleted = false;

/**
 * Trigger a standup if one hasn't successfully run yet.
 * Called by the config server when a new API key is saved,
 * so users see agents come alive immediately after connecting.
 * Only latches standupCompleted on actual posted success — so if the
 * first attempt skipped (no agents registered yet, no key, etc.),
 * a later attempt can still succeed.
 */
export function triggerStandupIfNeeded(): void {
  if (standupCompleted) return;
  runStartupStandup()
    .then((posted) => { if (posted) standupCompleted = true; })
    .catch((err) => { logger.error(`[AUTONOMOUS] Triggered standup failed: ${err}`); });
}

/**
 * Force a standup on new work session start — ignores the completed latch.
 * Called by config-server when POST /session-event receives a 'start' event.
 */
export function triggerSessionStandup(): void {
  runStartupStandup()
    .then((posted) => { if (posted) standupCompleted = true; })
    .catch((err) => { logger.error(`[AUTONOMOUS] Session standup failed: ${err}`); });
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
