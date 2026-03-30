import { isAgentDisconnected } from './ai-config.ts';

const DOMAIN_MAP: Record<string, string> = {
  Chief: 'task management, scheduling, priorities, coordination, standups, deadlines, team meetings, delegation, email, PR descriptions',
  Hawk: 'code review, security audits, vulnerabilities, testing, code quality, commits, PRs, reentrancy, gas optimization, smart contracts',
  Radar: 'research, documentation, dependencies, breaking changes, CVEs, security advisories, tutorials, migration guides, GitHub monitoring',
  'Bounty Hunter': 'hackathons, bounties, freelance gigs, grants, jobs, opportunities, skill matching, prize pools, deadlines, competition analysis',
  Buddy: 'wellness, breaks, food recommendations, hydration, exercise, work-life balance, celebrations, morale, music, location recommendations',
};

export function getShouldRespondTemplate(agentName: string): string {
  const myDomain = DOMAIN_MAP[agentName] || '';
  const otherAgents = Object.entries(DOMAIN_MAP)
    .filter(([name]) => name !== agentName)
    .map(([name, domain]) => `- ${name}: ${domain}`)
    .join('\n');

  return `You are ${agentName}, part of a 5-agent team called Buddies.

Your domain: ${myDomain}

Other agents and their domains:
${otherAgents}

## Response Rules (follow strictly):

0. If you are marked as DISCONNECTED in your context → ALWAYS respond [STOP], no exceptions
1. If YOU (${agentName}) are @mentioned or called by name → RESPOND
2. If a DIFFERENT agent is @mentioned by name → IGNORE (let them handle it)
3. If the user says "team", "everyone", or addresses the group → RESPOND with your perspective
4. If a teammate agent posts an update or status report → RESPOND if it's relevant to your domain
5. If the message topic clearly falls in YOUR domain → RESPOND
6. If the message topic falls in another agent's domain → IGNORE
7. If another agent already responded and the topic is handled → IGNORE
8. If you have CRITICAL additional input on another agent's response → RESPOND briefly
9. When in doubt → IGNORE (better to stay quiet than flood the chat)

Based on these rules, should you respond to this message?

Respond with one of: [RESPOND], [IGNORE], or [STOP]`;
}

// Runtime check — disconnected agents must not respond
export function shouldAgentRespond(agentName: string): boolean {
  return !isAgentDisconnected(agentName);
}
