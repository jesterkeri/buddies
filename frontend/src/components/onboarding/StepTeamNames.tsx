import { updateTeamNames, type TeamConfig } from './onboardingStore';
import { getAgentColor } from '../../types';
import AgentAvatar from '../shared/AgentAvatar';

const AGENTS = [
  { key: 'Chief', role: 'TEAM LEAD', desc: 'Coordinates the squad, manages tasks' },
  { key: 'Hawk', role: 'CODE REVIEWER', desc: 'Security audits, code quality' },
  { key: 'Radar', role: 'SCOUT', desc: 'Research, docs, dependency tracking' },
  { key: 'Bounty Hunter', role: 'BOUNTY HUNTER', desc: 'Finds hackathons, bounties, jobs' },
  { key: 'Buddy', role: 'BUDDY', desc: 'Wellness, breaks, morale, food recs' },
] as const;

interface StepTeamNamesProps {
  teamNames: TeamConfig;
}

export default function StepTeamNames({ teamNames }: StepTeamNamesProps) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-mono text-[--color-ink]/50 mb-2">
        Give your agents custom names or keep the defaults.
      </p>

      {AGENTS.map((agent) => (
        <div
          key={agent.key}
          className="flex items-center gap-3 p-3 border-2 border-[--color-ink] bg-white"
          style={{ borderLeftWidth: '6px', borderLeftColor: getAgentColor(agent.key) }}
        >
          <AgentAvatar name={agent.key} size="md" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-mono font-bold text-[--color-ink]/40">{agent.role}</span>
              <span className="text-[8px] font-mono text-[--color-ink]/30">— {agent.desc}</span>
            </div>
            <input
              type="text"
              value={teamNames[agent.key as keyof TeamConfig]}
              onChange={(e) => updateTeamNames({ [agent.key]: e.target.value })}
              placeholder={agent.key}
              className="w-full px-2 py-1 text-sm font-mono font-bold border-2 border-[--color-ink] bg-white focus:outline-none focus:shadow-[2px_2px_0px_var(--color-ink)]"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
