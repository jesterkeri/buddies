import { logger, type ProjectAgent, type Project } from '@elizaos/core';
import chief from './chief/index.ts';
import hawk from './hawk/index.ts';
import radar from './radar/index.ts';
import tracker from './tracker/index.ts';
import beans from './beans/index.ts';

const allAgents: ProjectAgent[] = [chief, hawk, radar, tracker, beans];

// Support selective agent startup via CLI flags
// e.g.: elizaos start -- --chief --hawk
const rawArgs = process.argv.slice(2);
let enabledAgents = allAgents;

const agentsMap: Record<string, ProjectAgent> = {
  chief,
  hawk,
  radar,
  tracker,
  beans,
};

const doubleDashIndex = rawArgs.indexOf('--');
let potentialFlags: string[] = [];

if (doubleDashIndex !== -1) {
  potentialFlags = rawArgs.slice(doubleDashIndex + 1).filter((a) => a.startsWith('--'));
} else {
  potentialFlags = rawArgs.filter((a) => a.startsWith('--') && a !== '--');
}

if (potentialFlags.length > 0) {
  const requested = potentialFlags.map((f) => f.replace(/^--/, '').toLowerCase());
  const matched = allAgents.filter((agent) => {
    const key = Object.keys(agentsMap).find((k) => agentsMap[k] === agent);
    return key ? requested.includes(key.toLowerCase()) : false;
  });
  if (matched.length > 0) {
    enabledAgents = matched;
  } else if (potentialFlags.length > 0) {
    logger.error(`No agents found matching flags: ${potentialFlags.join(', ')}`);
    logger.error('Available agents: chief, hawk, radar, tracker, beans');
    process.exit(1);
  }
}

logger.info(
  `Buddies initialized: ${enabledAgents.length} agents — ${enabledAgents.map((a) => a.character.name).join(', ')}`
);

const project: Project = {
  agents: enabledAgents,
};

export default project;
