import type { Action } from '@elizaos/core';
import { agentStateManager, AgentStatus } from './agent-state.ts';
import { readTasks, writeTasks, withTaskLock, type BackendTask } from './task-provider.ts';
import { postToUser, sendAgentMessage } from './agent-messenger.ts';
import { logger } from '@elizaos/core';

// ── Agent-specific prompt hints to trigger the right actions ──
const AGENT_PROMPT_HINTS: Record<string, string> = {
  Hawk: 'Review the code, check for security issues, or run an audit. Provide your findings with severity ratings.',
  Radar: 'Research this topic, check dependencies, or find documentation. Provide sources and links.',
  'Bounty Hunter': 'Scan for opportunities, hackathons, bounties, or grants. Provide a ranked list with links and match scores.',
  Buddy: 'Find recommendations, check wellness, or suggest food/coffee spots nearby. Provide specific names, prices, and locations.',
  Chief: 'Coordinate, prioritize, or plan. Provide action items and assignments.',
};

const MAX_ATTEMPTS = 2;
const activeTaskRuns = new Set<string>();
const DELIVERABLE_ONLY_INSTRUCTION =
  'Return the actual deliverable now. Do not acknowledge the task, restate the instructions, or describe what you are about to do. If you are blocked, state exactly what is missing.';

function extractRetryContext(task: BackendTask): { chiefFeedback?: string; discussionContext?: string } {
  const discussion = Array.isArray(task.discussion) ? task.discussion : [];
  const latestChiefReview = [...discussion]
    .reverse()
    .find((msg: any) => msg?.from === 'Chief' && /^(REVISE|BLOCKED)/i.test(msg?.content || ''));

  const chiefFeedback = latestChiefReview
    ? String(latestChiefReview.content).replace(/^(REVISE|BLOCKED)(?:\s*\([^)]*\))?:\s*/i, '').trim()
    : undefined;

  const recentDiscussion = discussion
    .slice(-4)
    .map((msg: any) => `${msg.from}: ${msg.content}`)
    .join('\n');

  return {
    chiefFeedback,
    discussionContext: recentDiscussion || undefined,
  };
}

// ── Step 1: Get worker output ──

async function getWorkerOutput(
  agentName: string,
  taskTitle: string,
  taskDescription?: string,
  chiefFeedback?: string,
  discussionContext?: string,
): Promise<string | null> {
  const hint = AGENT_PROMPT_HINTS[agentName] || 'Provide your actual findings, results, or deliverables directly.';

  let prompt: string;
  if (chiefFeedback) {
    // Retry with Chief's feedback
    prompt = `${taskTitle}${taskDescription ? `\n\n${taskDescription}` : ''}${discussionContext ? `\n\nRecent task discussion:\n${discussionContext}` : ''}\n\nChief reviewed your previous attempt and said: "${chiefFeedback}"\n\nTry again.\n\n${hint}\n\n${DELIVERABLE_ONLY_INSTRUCTION}`;
  } else {
    prompt = `${taskTitle}${taskDescription ? `\n\n${taskDescription}` : ''}${discussionContext ? `\n\nRecent task discussion:\n${discussionContext}` : ''}\n\n${hint}\n\n${DELIVERABLE_ONLY_INSTRUCTION}`;
  }

  try {
    const result = await sendAgentMessage('Chief', prompt, agentName, { skipCooldown: true });
    if (result.sent && result.response) {
      return result.response;
    }
  } catch (err) {
    logger.error(`[TASK] Worker output failed for ${agentName}: ${err}`);
  }
  return null;
}

// ── Step 2: Chief validates worker output ──

type ChiefVerdict = { verdict: 'accept'; reason: string } | { verdict: 'revise' | 'blocked'; reason: string };

async function getChiefVerdict(agentName: string, taskTitle: string, workerOutput: string): Promise<ChiefVerdict> {
  const prompt = `You are reviewing work submitted by ${agentName} for the task: "${taskTitle}"

Worker's output:
---
${workerOutput.slice(0, 1500)}
---

Did ${agentName} actually complete the task with real deliverables? Or is this just an acknowledgment, a promise to work on it, or an incomplete response?

Respond with exactly one of these on the first line:
TASK_VERDICT: ACCEPT
TASK_VERDICT: REVISE
TASK_VERDICT: BLOCKED

Then explain your reasoning briefly.

ACCEPT = real work with actual results/findings/deliverables
REVISE = agent acknowledged but didn't deliver, or output is incomplete
BLOCKED = agent cannot do this task (missing info, wrong agent, etc.)`;

  try {
    const result = await sendAgentMessage(agentName, prompt, 'Chief', { skipCooldown: true });
    if (result.sent && result.response) {
      return parseChiefVerdict(result.response);
    }
  } catch (err) {
    logger.error(`[TASK] Chief verdict failed: ${err}`);
  }

  return { verdict: 'revise', reason: 'Could not reach Chief for validation.' };
}

function parseChiefVerdict(response: string): ChiefVerdict {
  const match = response.match(/TASK_VERDICT:\s*(ACCEPT|REVISE|BLOCKED)/i);
  if (match) {
    const verdict = match[1].toLowerCase() as 'accept' | 'revise' | 'blocked';
    const reason = response.replace(/TASK_VERDICT:\s*(ACCEPT|REVISE|BLOCKED)\s*/i, '').trim() || 'No reason given.';
    return { verdict, reason };
  }

  // No parseable verdict — always default to REVISE. Never guess from keywords.
  return { verdict: 'revise', reason: response.slice(0, 200) || 'Chief did not return a structured verdict.' };
}

// ── Main task pickup flow ──

/**
 * Auto-pickup: agent picks up a task, does real work, Chief validates.
 * Retries up to MAX_ATTEMPTS times with Chief's feedback if REVISE.
 *
 * Flow:
 * 1. TODO/IN_PROGRESS → IN_PROGRESS
 * 2. Worker produces output via LLM (with agent-specific prompt hints)
 * 3. Chief validates: ACCEPT / REVISE / BLOCKED
 * 4. ACCEPT → save output, move to REVIEW
 * 5. REVISE → inject Chief feedback, retry (up to MAX_ATTEMPTS)
 * 6. BLOCKED or exhausted retries → stay IN_PROGRESS, save feedback
 */
export async function autoPickupTask(agentName: string, taskId?: string): Promise<boolean> {
  // Step 1: Atomically claim the task (accepts both todo and in_progress for retries)
  const claimed = await withTaskLock(() => {
    const tasks = readTasks();
    const priorityOrder = ['P0', 'P1', 'P2', 'P3'];

    let task: BackendTask | undefined;
    if (taskId) {
      task = tasks.find((t) => t.id === taskId && (t.status === 'todo' || t.status === 'in_progress'));
    } else {
      task = tasks
        .filter((t) => t.assignee === agentName && (t.status === 'todo' || t.status === 'in_progress'))
        .sort((a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority))[0];
    }

    if (!task) return null;

    if (task.status === 'todo') {
      task.status = 'in_progress';
      task.statusHistory = task.statusHistory || [];
      task.statusHistory.push({
        from: 'todo',
        to: 'in_progress',
        by: agentName,
        timestamp: Date.now(),
      });
      task.updatedAt = Date.now();
      writeTasks(tasks);
    }

    const { chiefFeedback, discussionContext } = extractRetryContext(task);
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      chiefFeedback,
      discussionContext,
    };
  });

  if (!claimed) return false;
  if (activeTaskRuns.has(claimed.id)) {
    logger.info(`[TASK] ${agentName} already running task "${claimed.title}" (${claimed.id}), skipping duplicate pickup`);
    return false;
  }
  activeTaskRuns.add(claimed.id);

  logger.info(`[TASK] ${agentName} picking up: "${claimed.title}" [${claimed.priority}]`);
  agentStateManager.setState(agentName, AgentStatus.WORKING, claimed.title);

  try {
    // Step 2-3: Worker → Chief validation loop (up to MAX_ATTEMPTS)
    let accepted = false;
    let lastFeedback: string | undefined = claimed.chiefFeedback;
    let discussionContext: string | undefined = claimed.discussionContext;
    let lastOutput: string | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      logger.info(`[TASK] ${agentName} attempt ${attempt}/${MAX_ATTEMPTS} for "${claimed.title}"`);

      // Get worker output (with Chief feedback on retry)
      const workerOutput = await getWorkerOutput(agentName, claimed.title, claimed.description, lastFeedback, discussionContext);

      if (!workerOutput) {
        // Agent didn't respond at all
        await withTaskLock(() => {
          const tasks = readTasks();
          const task = tasks.find((t) => t.id === claimed.id);
          if (task) {
            task.workOutput = task.workOutput || [];
            task.workOutput.push({
              id: `work-${Date.now()}`,
              agent: agentName,
              content: `Attempt ${attempt}: Could not produce output.`,
              timestamp: Date.now(),
            });
            task.updatedAt = Date.now();
            writeTasks(tasks);
          }
        });
        continue; // Try again if attempts remain
      }

      lastOutput = workerOutput;

      // Chief validates
      let verdict: ChiefVerdict;
      if (agentName === 'Chief') {
        verdict = workerOutput.length > 50 ? { verdict: 'accept', reason: 'Self-submitted by Chief.' } : { verdict: 'revise', reason: 'Output too brief.' };
      } else {
        verdict = await getChiefVerdict(agentName, claimed.title, workerOutput);
      }

      logger.info(`[TASK] Chief verdict (attempt ${attempt}): ${verdict.verdict.toUpperCase()} — ${verdict.reason.slice(0, 100)}`);

      // Save worker output
      await withTaskLock(() => {
        const tasks = readTasks();
        const task = tasks.find((t) => t.id === claimed.id);
        if (!task) return;

        task.workOutput = task.workOutput || [];
        task.workOutput.push({
          id: `work-${Date.now()}`,
          agent: agentName,
          content: workerOutput,
          timestamp: Date.now(),
        });

        if (verdict.verdict === 'accept') {
          task.status = 'review';
          task.statusHistory = task.statusHistory || [];
          task.statusHistory.push({
            from: 'in_progress',
            to: 'review',
            by: 'Chief',
            note: `Validated: ${verdict.reason.slice(0, 100)}`,
            timestamp: Date.now(),
          });
        } else {
          task.discussion = task.discussion || [];
          task.discussion.push({
            id: `chief-review-${Date.now()}`,
            from: 'Chief',
            content: `${verdict.verdict.toUpperCase()} (attempt ${attempt}): ${verdict.reason}`,
            timestamp: Date.now(),
          });
          discussionContext = extractRetryContext(task).discussionContext;
        }

        task.updatedAt = Date.now();
        writeTasks(tasks);
      });

      if (verdict.verdict === 'accept') {
        accepted = true;
        break;
      }

      if (verdict.verdict === 'blocked') {
        // No point retrying a blocked task
        break;
      }

      // REVISE — inject feedback for next attempt
      lastFeedback = verdict.reason;
    }

    // Step 4: Notify user
    if (accepted && lastOutput) {
      await postToUser(
        agentName,
        `Task complete: [${claimed.priority}] "${claimed.title}" — Chief approved, moved to REVIEW.\n\n${lastOutput.slice(0, 300)}${lastOutput.length > 300 ? '...' : ''}\n\nCheck Missions to approve or request changes.`,
      );
    } else {
      await postToUser(
        agentName,
        `Working on [${claimed.priority}] "${claimed.title}" — ${lastFeedback || 'could not produce output'} after ${MAX_ATTEMPTS} attempt(s). Task stays in IN PROGRESS.`,
      );
    }

    return accepted;
  } finally {
    activeTaskRuns.delete(claimed.id);
    agentStateManager.setState(agentName, AgentStatus.IDLE);
  }
}

/**
 * Shared action: agents pick up and work on their assigned tasks.
 */
export const workOnTask: Action = {
  name: 'WORK_ON_TASK',
  similes: ['DO_TASK', 'START_TASK', 'PICK_UP_TASK', 'HANDLE_TASK', 'EXECUTE_TASK'],
  description: 'Pick up an assigned task, work on it, and submit for review. Use when told to work on a task, or when you see assigned tasks in your queue.',
  validate: async (runtime) => {
    const agentName = runtime.character.name;
    const tasks = readTasks();
    return tasks.some((t) => t.assignee === agentName && (t.status === 'todo' || t.status === 'in_progress'));
  },
  handler: async (runtime, message, state, options, callback) => {
    const agentName = runtime.character.name;

    const picked = await autoPickupTask(agentName);

    if (callback) {
      await callback({
        text: picked
          ? 'Task completed and approved by Chief. Check the Missions board.'
          : 'No tasks I can complete right now.',
        actions: ['WORK_ON_TASK'],
      });
    }

    return { text: picked ? 'Task completed' : 'No tasks', success: true };
  },
  examples: [
    [
      { name: '{{user1}}', content: { text: 'Work on your assigned tasks' } },
      { name: '{{agent}}', content: { text: 'Picking up my highest priority task now.', actions: ['WORK_ON_TASK'] } },
    ],
  ],
};
