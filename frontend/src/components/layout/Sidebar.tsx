import { useAgents, useAgentStates } from '../../api/hooks';
import AgentAvatar from '../shared/AgentAvatar';
import StatusBadge from '../shared/StatusBadge';

export default function Sidebar() {
  const { data: agents } = useAgents();
  const { data: states } = useAgentStates();

  const stateMap = new Map<string, { status: string; currentTask?: string }>();
  states?.forEach((s) => stateMap.set(s.agentName, { status: s.status, currentTask: s.currentTask }));

  return (
    <aside className="w-64 panel bg-[--color-slate] border-r-4 border-[--color-ink] shadow-none rounded-none flex flex-col">
      <div className="tape tape-tl" />
      <div className="panel-header">
        <span>ACTIVE_SQUAD</span>
        <span className="badge">5 ONLINE</span>
      </div>

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
