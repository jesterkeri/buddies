import { useState, useEffect, useRef } from 'react';
import { useAgents, useAgentStates } from '../../api/hooks';
import AgentAvatar from '../shared/AgentAvatar';
import StatusBadge from '../shared/StatusBadge';
import { useSession, getNextBreakIn, getBreakInterval, isBreakDue, takeBreak, setBreakStyle, setCustomDurations, getAvailableBreakStyles } from '../session/sessionStore';

// Human-readable labels for break styles
const BREAK_STYLE_LABELS: Record<string, string> = {
  pomodoro: 'pomodoro',
  'deep-work': 'deep work',
  '52-17': '52/17',
  ultradian: 'ultradian',
  flowtime: 'flowtime',
  custom: 'custom',
};
import { getOnboardingState, updateTeamNames } from '../onboarding/onboardingStore';
import { useSettings } from '../settings/settingsStore';

const AGENT_ROLES: Record<string, string> = {
  Chief: 'Team Lead',
  Hawk: 'Code Reviewer',
  Radar: 'Scout',
  'Bounty Hunter': 'Opportunity Scanner',
  Buddy: 'Wellness Agent',
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
  const settings = useSettings();
  const [nextBreak, setNextBreak] = useState(0);
  const [breakDue, setBreakDue] = useState(false);
  const [stylePickerOpen, setStylePickerOpen] = useState(false);
  const [customWork, setCustomWork] = useState(session.customWorkMin || 30);
  const [customRest, setCustomRest] = useState(session.customRestMin || 5);

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
  // Count only agents with a valid API key or free provider
  const activeAgents = agents?.filter((agent) => {
    const agentConfig = settings.aiConfig.perAgent[agent.name];
    const isDisconnected = agentConfig?.provider === 'none';
    const provider = agentConfig?.provider || settings.aiConfig.defaultProvider;
    const FREE_PROVIDERS = ['ollama', 'nosana'];
    const isFree = FREE_PROVIDERS.includes(provider);
    const apiKey = agentConfig?.apiKey || settings.aiConfig.defaultApiKey;
    return !isDisconnected && (isFree || (apiKey && apiKey.length > 5));
  }).length || 0;
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
        <div className="px-3 py-2.5 border-b-2 relative" style={{ borderColor: 'rgba(242,244,243,0.1)', backgroundColor: breakDue ? 'rgba(228,25,55,0.15)' : 'rgba(43,182,179,0.08)' }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-mono font-bold uppercase" style={{ color: breakDue ? '#E41937' : 'rgba(242,244,243,0.4)' }}>
              {breakDue ? 'BREAK TIME' : 'NEXT BREAK'}
            </span>
            <button
              onClick={() => setStylePickerOpen((v) => !v)}
              className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 border-2 transition-all hover:bg-white/10 cursor-pointer flex items-center gap-1"
              style={{
                borderColor: '#0A0A0A',
                backgroundColor: stylePickerOpen ? '#2BB6B3' : '#1a1f2e',
                color: stylePickerOpen ? '#0A0A0A' : '#2BB6B3',
                boxShadow: '1px 1px 0px #0A0A0A',
              }}
              title="Click to change session type"
            >
              {BREAK_STYLE_LABELS[session.breakStyle] || session.breakStyle}
              <span style={{ fontSize: '9px' }}>▾</span>
            </button>
          </div>
          {/* Session type picker dropdown */}
          {stylePickerOpen && (
            <div
              className="absolute right-2 top-9 z-50 border-2"
              style={{ borderColor: '#0A0A0A', backgroundColor: '#1a1f2e', minWidth: 170, boxShadow: '3px 3px 0px #0A0A0A' }}
            >
              {getAvailableBreakStyles().map((style) => {
                const presets: Record<string, { work: number; rest: number }> = {
                  pomodoro: { work: 25, rest: 5 },
                  'deep-work': { work: 90, rest: 15 },
                  '52-17': { work: 52, rest: 17 },
                  ultradian: { work: 120, rest: 20 },
                  flowtime: { work: 45, rest: 10 },
                  custom: { work: session.customWorkMin || 30, rest: session.customRestMin || 5 },
                };
                const interval = presets[style];
                const isActive = style === session.breakStyle;
                const isCustom = style === 'custom';

                if (isCustom) {
                  return (
                    <div
                      key={style}
                      className="block w-full text-left px-3 py-2 font-mono"
                      style={{
                        backgroundColor: isActive ? 'rgba(43,182,179,0.2)' : 'transparent',
                        borderBottom: '1px solid rgba(242,244,243,0.05)',
                      }}
                    >
                      <div className="font-bold uppercase text-[12px] leading-tight mb-1.5" style={{ color: isActive ? '#2BB6B3' : '#F2F4F3' }}>
                        Custom
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={1}
                          max={480}
                          value={customWork}
                          onChange={(e) => setCustomWork(parseInt(e.target.value) || 1)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-12 px-1 py-0.5 text-[11px] font-mono font-bold text-center border-2"
                          style={{ backgroundColor: '#0a0a0a', borderColor: '#0A0A0A', color: '#F2F4F3' }}
                        />
                        <span className="text-[10px]" style={{ color: 'rgba(242,244,243,0.5)' }}>m work</span>
                        <span className="text-[10px]" style={{ color: 'rgba(242,244,243,0.3)' }}>/</span>
                        <input
                          type="number"
                          min={1}
                          max={120}
                          value={customRest}
                          onChange={(e) => setCustomRest(parseInt(e.target.value) || 1)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-10 px-1 py-0.5 text-[11px] font-mono font-bold text-center border-2"
                          style={{ backgroundColor: '#0a0a0a', borderColor: '#0A0A0A', color: '#F2F4F3' }}
                        />
                        <span className="text-[10px]" style={{ color: 'rgba(242,244,243,0.5)' }}>m rest</span>
                      </div>
                      <button
                        onClick={() => {
                          setCustomDurations(customWork, customRest);
                          setStylePickerOpen(false);
                        }}
                        className="mt-1.5 w-full py-1 text-[10px] font-display uppercase border-2"
                        style={{ borderColor: '#0A0A0A', backgroundColor: '#2BB6B3', color: '#0A0A0A' }}
                      >
                        Set custom
                      </button>
                    </div>
                  );
                }

                return (
                  <button
                    key={style}
                    onClick={() => {
                      setBreakStyle(style);
                      setStylePickerOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 font-mono hover:bg-white/10 transition-colors"
                    style={{
                      backgroundColor: isActive ? 'rgba(43,182,179,0.2)' : 'transparent',
                      color: isActive ? '#2BB6B3' : '#F2F4F3',
                      borderBottom: '1px solid rgba(242,244,243,0.05)',
                    }}
                  >
                    <div className="font-bold uppercase text-[12px] leading-tight">{BREAK_STYLE_LABELS[style]}</div>
                    <div className="text-[12px] font-bold mt-0.5" style={{ color: isActive ? '#2BB6B3' : 'rgba(242,244,243,0.7)' }}>
                      {interval?.work}m <span style={{ opacity: 0.5 }}>/</span> {interval?.rest}m
                    </div>
                  </button>
                );
              })}
            </div>
          )}
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
          // Look up role/skills by backend name, fallback to partial match
          const role = AGENT_ROLES[agent.name] || Object.entries(AGENT_ROLES).find(([k]) => agent.name.includes(k))?.[1] || agent.name;
          const skills = AGENT_SKILLS[agent.name] || Object.entries(AGENT_SKILLS).find(([k]) => agent.name.includes(k))?.[1] || [];

          // Check if agent has a valid AI provider configured
          const agentConfig = settings.aiConfig.perAgent[agent.name];
          const isDisconnected = agentConfig?.provider === 'none';
          const provider = agentConfig?.provider || settings.aiConfig.defaultProvider;
          const FREE_PROVIDERS = ['ollama', 'nosana'];
          const isFree = FREE_PROVIDERS.includes(provider);
          const apiKey = agentConfig?.apiKey || settings.aiConfig.defaultApiKey;
          const isConnected = !isDisconnected && (isFree || (apiKey && apiKey.length > 5));

          return (
            <div
              key={agent.id}
              className="px-3 py-2.5 border-2 transition-all cursor-pointer"
              style={{
                borderColor: isConnected ? 'rgba(242,244,243,0.08)' : 'rgba(228,25,55,0.3)',
                backgroundColor: !isConnected ? 'rgba(228,25,55,0.05)' : state?.status !== 'IDLE' ? 'rgba(242,244,243,0.03)' : 'transparent',
              }}
            >
              <div className="flex items-center gap-2.5">
                <div style={{ opacity: isConnected ? 1 : 0.4 }}>
                  <AgentAvatar name={agent.name} size="sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <EditableName agentKey={agent.name} />
                    {isConnected ? (
                      <StatusBadge status={state?.status || 'IDLE'} />
                    ) : (
                      <span
                        className="text-[8px] font-mono font-bold px-1.5 py-0.5 border-2"
                        style={{ borderColor: '#E41937', color: '#E41937', backgroundColor: 'rgba(228,25,55,0.15)' }}
                      >
                        NOT CONNECTED
                      </span>
                    )}
                  </div>
                  <p className="text-[9px] font-mono" style={{ color: isConnected ? 'rgba(242,244,243,0.35)' : '#E41937' }}>
                    {isConnected ? role : 'Needs API key in Connect tab'}
                  </p>
                </div>
              </div>

              {/* Skills */}
              <div className="flex flex-wrap gap-1 mt-1.5 ml-10">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="text-[9px] font-mono font-bold px-2 py-0.5 border"
                    style={{
                      borderColor: isConnected ? 'rgba(242,244,243,0.15)' : 'rgba(228,25,55,0.2)',
                      color: isConnected ? 'rgba(242,244,243,0.4)' : 'rgba(228,25,55,0.4)',
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>

              {/* Current task */}
              {state?.currentTask && isConnected && (
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
          <span className="text-[8px] font-mono" style={{ color: 'rgba(242,244,243,0.25)' }}>RUNTIME</span>
          <span className="text-[8px] font-mono" style={{ color: '#22c55e' }}>ELIZAOS</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-mono" style={{ color: 'rgba(242,244,243,0.25)' }}>AGENTS</span>
          <span className="text-[8px] font-mono" style={{ color: '#2BB6B3' }}>{activeAgents} ONLINE</span>
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
