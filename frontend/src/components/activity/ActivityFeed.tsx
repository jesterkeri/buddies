import { useState } from 'react';
import { useActivityEvents, EVENT_ICONS, type EventType } from './activityStore';
import { getAgentColor, AGENT_NAMES } from '../../types';
import AgentAvatar from '../shared/AgentAvatar';

const EVENT_TYPE_LABELS: Record<EventType, { label: string; color: string }> = {
  message: { label: 'MSG', color: '#F2F4F3' },
  task: { label: 'TASK', color: '#F9D616' },
  review: { label: 'REVIEW', color: '#E41937' },
  opportunity: { label: 'OPP', color: '#2BB6B3' },
  break: { label: 'BREAK', color: '#a855f7' },
  alert: { label: 'ALERT', color: '#E41937' },
  system: { label: 'SYS', color: '#94a3b8' },
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function ActivityFeed() {
  const events = useActivityEvents();
  const [filterAgent, setFilterAgent] = useState<string | null>(null);

  const filtered = filterAgent
    ? events.filter((e) => e.agent === filterAgent)
    : events;

  return (
    <div className="h-full panel flex flex-col" style={{ backgroundColor: '#232A38' }}>
      <div className="tape tape-tr" />
      <div className="panel-header">
        <span>INTEL_FEED</span>
        <span className="badge badge-live">● LIVE</span>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b-2 border-[--color-paper]/10">
        <span className="text-[11px] font-mono text-[--color-paper]/50 mr-1">FILTER:</span>
        <button
          onClick={() => setFilterAgent(null)}
          className={`text-[11px] font-mono font-bold px-2.5 py-1 border transition-all ${
            !filterAgent
              ? 'bg-[--color-paper]/15 text-[--color-paper] border-[--color-paper]/40'
              : 'text-[--color-paper]/30 border-[--color-paper]/15 hover:text-[--color-paper] hover:border-[--color-paper]/30'
          }`}
        >
          ALL
        </button>
        {AGENT_NAMES.map((name) => (
          <button
            key={name}
            onClick={() => setFilterAgent(filterAgent === name ? null : name)}
            className="text-[11px] font-mono font-bold px-2.5 py-1 border transition-all"
            style={{
              borderColor: filterAgent === name ? getAgentColor(name) : 'rgba(242,244,243,0.15)',
              backgroundColor: filterAgent === name ? getAgentColor(name) + '25' : 'transparent',
              color: filterAgent === name ? getAgentColor(name) : 'rgba(242,244,243,0.35)',
            }}
          >
            {name.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((event, i) => {
          const typeConfig = EVENT_TYPE_LABELS[event.type];
          const agentColor = getAgentColor(event.agent);

          return (
            <div
              key={event.id}
              className="flex items-start gap-3 px-4 py-3.5 border-b border-[--color-paper]/5 hover:bg-[--color-paper]/5 transition-colors"
              style={{ backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(242,244,243,0.04)' }}
            >
              {/* Timestamp */}
              <div className="text-[11px] font-mono text-white w-20 shrink-0 pt-0.5">
                [{formatTime(event.timestamp)}]
              </div>

              {/* Type badge */}
              <span
                className="text-[10px] font-mono font-bold px-2 py-0.5 border shrink-0 mt-0.5"
                style={{
                  borderColor: typeConfig.color,
                  color: typeConfig.color,
                }}
              >
                {typeConfig.label}
              </span>

              {/* Agent avatar */}
              {event.agent !== 'System' ? (
                <AgentAvatar name={event.agent} size="sm" />
              ) : (
                <div className="w-8 h-8 border-2 border-[--color-paper]/20 flex items-center justify-center text-[10px] font-mono text-[--color-paper]/40 shrink-0">
                  SYS
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-sm font-display uppercase tracking-wider"
                    style={{ color: event.agent !== 'System' ? agentColor : '#94a3b8' }}
                  >
                    {event.agent}
                  </span>
                  <span className="text-[11px] font-mono text-white/60">
                    {timeAgo(event.timestamp)}
                  </span>
                </div>
                <p className="text-[13px] font-mono text-white leading-relaxed mt-1">
                  {event.content}
                </p>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm font-mono text-[--color-paper]/20">// NO EVENTS MATCHING FILTER</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 px-4 py-1.5 border-t-2 border-[--color-paper]/10 text-[10px] font-mono font-bold">
        <span style={{ color: '#F9D616' }}>EVENTS: {events.length}</span>
        <span style={{ color: '#E41937' }}>SHOWING: {filtered.length}</span>
        <span className="ml-auto" style={{ color: '#2BB6B3' }}>REAL-TIME STREAM</span>
      </div>
    </div>
  );
}
