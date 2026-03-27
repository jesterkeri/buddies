const DOMAIN_MAP: Record<string, string> = {
  Chief: 'task management, scheduling, priorities, coordination, standups, deadlines, team meetings, delegation, email, PR descriptions',
  Hawk: 'code review, security audits, vulnerabilities, testing, code quality, commits, PRs, reentrancy, gas optimization, smart contracts',
  Radar: 'research, documentation, dependencies, breaking changes, CVEs, security advisories, tutorials, migration guides, GitHub monitoring',
  Tracker: 'hackathons, bounties, freelance gigs, grants, jobs, opportunities, skill matching, prize pools, deadlines, competition analysis',
  Beans: 'wellness, breaks, food recommendations, hydration, exercise, work-life balance, celebrations, morale, music, location recommendations',
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

1. If YOU (${agentName}) are @mentioned or called by name → RESPOND
2. If a DIFFERENT agent is @mentioned by name → IGNORE (let them handle it)
3. If the user says "team", "everyone", or addresses the group → RESPOND with your perspective
4. If the message topic clearly falls in YOUR domain → RESPOND
5. If the message topic falls in another agent's domain → IGNORE
6. If another agent already responded and the topic is handled → IGNORE
7. If you have CRITICAL additional input on another agent's response → RESPOND briefly
8. When in doubt → IGNORE (better to stay quiet than flood the chat)

Based on these rules, should you respond to this message?

Respond with one of: [RESPOND], [IGNORE], or [STOP]`;
}
