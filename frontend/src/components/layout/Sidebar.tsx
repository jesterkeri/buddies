import { useState, useEffect, useRef } from 'react';
import { useAgents, useAgentStates } from '../../api/hooks';
import AgentAvatar from '../shared/AgentAvatar';
import StatusBadge from '../shared/StatusBadge';
import { useSession, getNextBreakIn, getBreakInterval, isBreakDue, takeBreak } from '../session/sessionStore';
import { getOnboardingState, updateTeamNames } from '../onboarding/onboardingStore';

const AGENT_ROLES: Record<string, string> = {
  Chief: 'Team Lead',
  Hawk: 'Code Reviewer',
  Radar: 'Scout',
  'Bounty Hunter': 'Bounty Hunter',
  Buddy: 'Buddy',
};

const AGENT_SKILLS: Record<string, string[]> = {
  Chief: ['Tasks', 'Priorities', 'Meetings'],
  Hawk: ['Security', 'Reviews', 'Testing'],
  Radar: ['Research', 'Docs', 'CVEs'],
  'Bounty Hunter': ['Bounties', 'Jobs', 'Grants'],
  Buddy: ['Breaks', 'Food', 'Morale'],
};

function EditableName({ agentKey }: { agentKey: string }) {
  const [editing, setEditing] = useState(false);
  const onboarding = getOnboardingState();
  const customName = onboarding.teamNames[agentKey as keyof typeof onboarding.teamNames] || agentKey;
  const [value, setValue] = useState(customName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const save = () => {
    const trimmed = value.trim() || agentKey;
    updateTeamNames({ [agentKey]: trimmed });
    setValue(trimmed);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') { setValue(customName); setEditing(false); }
        }}
        className="text-sm font-bold font-mono uppercase tracking-wider bg-transparent border-b-2 text-white outline-none w-24"
        style={{ borderColor: '#F9D616' }}
      />
    );
  }

  return (
    <span
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      className="text-sm font-bold text-white font-mono uppercase tracking-wider cursor-text hover:underline"
      style={{ textDecorationColor: '#F9D616' }}
      title="Click to rename"
    >
      {customName}
    </span>
  );
}

export default function Sidebar() {
  const { data: agents } = useAgents();
  const { data: states } = useAgentStates();
  const session = useSession();
  const [nextBreak, setNextBreak] = useState(0);
  const [breakDue, setBreakDue] = useState(false);

  const stateMap = new Map<string, { status: string; currentTask?: string }>();
  states?.forEach((s) => stateMap.set(s.agentName, { status: s.status, currentTask: s.currentTask }));

  useEffect(() => {
    if (!session.active) return;
    const tick = () => {
      setNextBreak(getNextBreakIn());
      setBreakDue(isBreakDue());
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [session.active, session.startTime, session.lastBreakAt]);

  const formatBreakTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const breakInterval = getBreakInterval();
  const activeAgents = agents?.length || 0;
  const workingAgents = states?.filter((s) => s.status !== 'IDLE').length || 0;

  return (
    <aside className="w-64 panel shadow-none rounded-none flex flex-col" style={{ backgroundColor: '#232A38', borderRight: '4px solid #0A0A0A' }}>
      <div className="tape tape-tl" />
      <div className="panel-header">
        <span>ACTIVE_SQUAD</span>
        <span className="badge">{activeAgents} ONLINE</span>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-0 border-b-2" style={{ borderColor: 'rgba(242,244,243,0.1)' }}>
        <div className="px-3 py-2 text-center border-r" style={{ borderColor: 'rgba(242,244,243,0.1)' }}>
          <p className="font-display text-lg text-white">{activeAgents}</p>
          <p className="text-[8px] font-mono" style={{ color: 'rgba(242,244,243,0.3)' }}>AGENTS</p>
        </div>
        <div className="px-3 py-2 text-center">
          <p className="font-display text-lg" style={{ color: workingAgents > 0 ? '#F9D616' : '#22c55e' }}>{workingAgents}</p>
          <p className="text-[8px] font-mono" style={{ color: 'rgba(242,244,243,0.3)' }}>WORKING</p>
        </div>
      </div>

      {/* Break timer */}
      {session.active && (
        <div className="px-3 py-2.5 border-b-2" style={{ borderColor: 'rgba(242,244,243,0.1)', backgroundColor: breakDue ? 'rgba(228,25,55,0.15)' : 'rgba(43,182,179,0.08)' }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-mono font-bold uppercase" style={{ color: breakDue ? '#E41937' : 'rgba(242,244,243,0.4)' }}>
              {breakDue ? 'BREAK TIME' : 'NEXT BREAK'}
            </span>
            <span className="text-[8px] font-mono" style={{ color: 'rgba(242,244,243,0.25)' }}>
              {session.breakStyle}
            </span>
          </div>
          {breakDue ? (
            <div className="flex gap-1.5">
              <button
                onClick={takeBreak}
                className="flex-1 py-1 text-[9px] font-display uppercase border-2"
                style={{ borderColor: '#0A0A0A', backgroundColor: '#2BB6B3', color: '#0A0A0A' }}
              >
                BREAK
              </button>
              <button
                onClick={takeBreak}
                className="flex-1 py-1 text-[9px] font-display uppercase border-2"
                style={{ borderColor: '#0A0A0A', backgroundColor: '#F9D616', color: '#0A0A0A' }}
              >
                SKIP
              </button>
            </div>
          ) : (
            <p className="text-base font-mono font-bold" style={{ color: '#2BB6B3' }}>
              {formatBreakTime(nextBreak)}
              <span className="text-[8px] ml-1" style={{ color: 'rgba(242,244,243,0.25)' }}>
                ({breakInterval.work}m / {breakInterval.rest}m)
              </span>
            </p>
          )}
        </div>
      )}

      {/* Agent list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {agents?.map((agent) => {
          const state = stateMap.get(agent.name);
          const role = AGENT_ROLES[agent.name] || '';
          const skills = AGENT_SKILLS[agent.name] || [];

          return (
            <div
              key={agent.id}
              className="px-3 py-2.5 border-2 transition-all cursor-pointer"
              style={{
                borderColor: 'rgba(242,244,243,0.08)',
                backgroundColor: state?.status !== 'IDLE' ? 'rgba(242,244,243,0.03)' : 'transparent',
              }}
            >
              <div className="flex items-center gap-2.5">
                <AgentAvatar name={agent.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <EditableName agentKey={agent.name} />
                    <StatusBadge status={state?.status || 'IDLE'} />
                  </div>
                  <p className="text-[9px] font-mono" style={{ color: 'rgba(242,244,243,0.35)' }}>
                    {role}
                  </p>
                </div>
              </div>

              {/* Skills */}
              <div className="flex flex-wrap gap-1 mt-1.5 ml-10">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="text-[9px] font-mono font-bold px-2 py-0.5 border"
                    style={{ borderColor: 'rgba(242,244,243,0.15)', color: 'rgba(242,244,243,0.4)' }}
                  >
                    {skill}
                  </span>
                ))}
              </div>

              {/* Current task */}
              {state?.currentTask && (
                <p className="text-[9px] font-mono mt-1 ml-10" style={{ color: '#F9D616' }}>
                  &gt; {state.currentTask}
                </p>
              )}
            </div>
          );
        })}

        {!agents?.length && (
          <div className="px-3 py-8 text-center text-sm font-mono" style={{ color: 'rgba(242,244,243,0.3)' }}>
            // SCANNING FOR AGENTS...
          </div>
        )}
      </div>

      {/* Bottom info */}
      <div className="px-3 py-2 border-t-2 space-y-1" style={{ borderColor: 'rgba(242,244,243,0.1)' }}>
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-mono" style={{ color: 'rgba(242,244,243,0.25)' }}>MODEL</span>
          <span className="text-[8px] font-mono" style={{ color: '#2BB6B3' }}>qwen3:8b</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-mono" style={{ color: 'rgba(242,244,243,0.25)' }}>RUNTIME</span>
          <span className="text-[8px] font-mono" style={{ color: '#22c55e' }}>ELIZAOS v1.7.2</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-mono" style={{ color: 'rgba(242,244,243,0.25)' }}>RELAY</span>
          <span className="text-[8px] font-mono" style={{ color: '#a855f7' }}>BUDDY</span>
        </div>
      </div>

      {/* Barcode */}
      <div className="flex gap-[2px] h-5 items-end px-3 py-1.5 border-t" style={{ borderColor: 'rgba(242,244,243,0.05)' }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            style={{
              backgroundColor: 'rgba(242,244,243,0.2)',
              width: i % 3 === 0 ? '1px' : i % 5 === 0 ? '6px' : i % 2 === 0 ? '2px' : '4px',
              height: '100%',
            }}
          />
        ))}
      </div>
    </aside>
  );
}
