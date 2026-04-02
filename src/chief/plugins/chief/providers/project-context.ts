import type { Provider, IAgentRuntime, Memory, State } from '@elizaos/core';

/**
 * Chief-specific project context provider.
 * Adds task board state and chat history on top of the shared repo context.
 * (GitHub repo context is provided by the shared repoContextProvider in buddies-plugin)
 */

function getTaskContext(): string {
  try {
    const fs = require('fs');
    const path = require('path');
    const taskFile = path.join(process.cwd(), '.buddies-tasks.json');
    if (fs.existsSync(taskFile)) {
      const tasks = JSON.parse(fs.readFileSync(taskFile, 'utf-8'));
      if (Array.isArray(tasks) && tasks.length > 0) {
        const summary = tasks.map((t: any) =>
          `- [${t.status}] ${t.title} (${t.priority}, assigned: ${t.assignee || 'unassigned'})`
        ).join('\n');
        return `## Current Tasks\n${summary}`;
      }
    }
  } catch {}
  return '## Current Tasks\nNo tasks created yet.';
}

export const projectContextProvider: Provider = {
  name: 'projectContext',
  description: 'Provides Chief with task board state and recent conversation context',
  get: async (runtime: IAgentRuntime, _message: Memory, _state: State) => {
    const sections: string[] = [];

    // Task board
    sections.push(getTaskContext());

    // Recent chat context from ElizaOS memory
    try {
      const recentMemories = await runtime.getAllMemories();
      if (recentMemories && recentMemories.length > 0) {
        const recent = recentMemories
          .filter((m) => m.content?.text)
          .slice(-10)
          .map((m) => `- ${m.content.text}`)
          .join('\n');
        if (recent) sections.push(`## Recent Conversation\n${recent}`);
      }
    } catch {}

    return {
      text: sections.length > 0 ? `# Chief's Context\n\n${sections.join('\n\n')}` : '',
      values: { hasContext: sections.length > 0 },
      data: { hasContext: sections.length > 0 },
    };
  },
};
