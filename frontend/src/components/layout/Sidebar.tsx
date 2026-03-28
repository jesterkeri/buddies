import { useState, useEffect } from 'react';
import { useAgents, useAgentStates } from '../../api/hooks';
import AgentAvatar from '../shared/AgentAvatar';
import StatusBadge from '../shared/StatusBadge';
import { useSession, getNextBreakIn, getBreakInterval, isBreakDue, takeBreak } from '../session/sessionStore';

export default function Sidebar() {
  const { data: agents } = useAgents();
  const { data: states } = useAgentStates();
  const session = useSession();
  const [nextBreak, setNextBreak] = useState(0);
  const [breakDue, setBreakDue] = useState(false);

  const stateMap = new Map<string, { status: string; currentTask?: string }>();
  states?.forEach((s) => stateMap.set(s.agentName, { status: s.status, currentTask: s.currentTask }));

  // Update break countdown every second
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

  return (
    <aside className="w-64 panel bg-[--color-slate] border-r-4 border-[--color-ink] shadow-none rounded-none flex flex-col">
      <div className="tape tape-tl" />
      <div className="panel-header">
        <span>ACTIVE_SQUAD</span>
        <span className="badge">5 ONLINE</span>
      </div>

      {/* Break timer (when session active) */}
      {session.active && (
        <div className={`px-3 py-2.5 border-b-2 ${breakDue ? 'bg-[--color-red]/20 border-[--color-red]/30' : 'bg-[--color-teal]/10 border-[--color-paper]/10'}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-mono font-bold text-[--color-paper]/50 uppercase">
              {breakDue ? '⚠ BREAK TIME' : 'NEXT BREAK'}
            </span>
            <span className="text-[8px] font-mono text-[--color-paper]/30 uppercase">
              {session.breakStyle}
            </span>
          </div>

          {breakDue ? (
            <div>
              <p className="text-xs font-display text-[--color-red] mb-1.5">
                BEANS SAYS: TIME TO REST!
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={takeBreak}
                  className="flex-1 py-1.5 text-[9px] font-display uppercase border-2 border-[--color-ink] bg-[--color-teal] text-[--color-ink] shadow-[2px_2px_0px_var(--color-ink)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                >
                  TAKE BREAK
                </button>
                <button
                  onClick={takeBreak}
                  className="flex-1 py-1.5 text-[9px] font-display uppercase border-2 border-[--color-ink] bg-[--color-yellow] text-[--color-ink] shadow-[2px_2px_0px_var(--color-ink)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                >
                  KEEP GOING
                </button>
              </div>
              <p className="text-[8px] font-mono text-[--color-paper]/30 mt-1">
                Beans will check on you again soon
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-lg font-mono font-bold text-[--color-teal]">
                {formatBreakTime(nextBreak)}
              </span>
              <span className="text-[9px] font-mono text-[--color-paper]/30">
                ({breakInterval.work}min work / {breakInterval.rest}min rest)
              </span>
            </div>
          )}

          {session.totalBreaksTaken > 0 && (
            <p className="text-[8px] font-mono text-[--color-paper]/25 mt-1">
              Breaks taken: {session.totalBreaksTaken}
            </p>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {agents?.map((agent) => {
          const state = stateMap.get(agent.name);
          return (
            <div
              key={agent.id}
              className="flex items-center gap-3 px-3 py-2.5 border-2 border-transparent hover:border-[--color-paper]/20 hover:bg-[--color-paper]/5 transition-all cursor-pointer"
            >
              <AgentAvatar name={agent.name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[--color-paper] font-mono uppercase tracking-wider truncate">
                    {agent.name}
                  </span>
                </div>
                <div className="mt-1">
                  <StatusBadge status={state?.status || 'IDLE'} />
                </div>
                {state?.currentTask && (
                  <p className="text-[9px] text-[--color-paper]/50 font-mono truncate mt-0.5">
                    &gt; {state.currentTask}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {!agents?.length && (
          <div className="px-3 py-8 text-center text-sm text-[--color-paper]/40 font-mono">
            // SCANNING FOR AGENTS...
          </div>
        )}
      </div>

      {/* Barcode decoration */}
      <div className="flex gap-[2px] h-6 items-end px-3 py-2 border-t-2 border-[--color-paper]/10">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="bg-[--color-paper]/30"
            style={{
              width: i % 3 === 0 ? '1px' : i % 5 === 0 ? '6px' : i % 2 === 0 ? '2px' : '4px',
              height: '100%',
            }}
          />
        ))}
      </div>
    </aside>
  );
}
