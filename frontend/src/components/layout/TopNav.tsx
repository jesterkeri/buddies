import { useState, useEffect } from 'react';
import type { TabId } from '../../types';
import { useSession, startSession, endSession, getElapsedSeconds } from '../session/sessionStore';

interface TopNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string; enabled: boolean }[] = [
  { id: 'chat', label: 'COMMS', enabled: true },
  { id: 'office', label: 'HQ', enabled: true },
  { id: 'tasks', label: 'MISSIONS', enabled: true },
  { id: 'activity', label: 'INTEL', enabled: true },
  { id: 'connect', label: 'CONNECT', enabled: true },
];

function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TopNav({ activeTab, onTabChange }: TopNavProps) {
  const session = useSession();
  const [elapsed, setElapsed] = useState(0);

  // Update timer every second when session is active
  useEffect(() => {
    if (!session.active) {
      setElapsed(0);
      return;
    }
    const tick = () => setElapsed(getElapsedSeconds());
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [session.active, session.startTime]);

  return (
    <header className="flex items-center px-4 py-2 gap-4" style={{ backgroundColor: '#0A0A0A', borderBottom: '4px solid #0A0A0A' }}>
      <h1 className="font-display text-2xl text-[--color-yellow] tracking-wider" style={{ transform: 'rotate(-2deg)' }}>
        BUDDIES
      </h1>
      <span className="text-[--color-red] font-display text-sm">// COMMAND CENTER</span>

      <nav className="flex items-center gap-2 ml-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => tab.enabled && onTabChange(tab.id)}
            disabled={!tab.enabled}
            className="px-3 py-1 font-display text-sm tracking-wider border-2 transition-all"
            style={
              activeTab === tab.id
                ? { backgroundColor: '#F9D616', color: '#0A0A0A', borderColor: '#0A0A0A', boxShadow: '3px 3px 0px #F2F4F3' }
                : tab.enabled
                  ? { backgroundColor: 'transparent', color: '#F2F4F3', borderColor: 'rgba(242,244,243,0.3)' }
                  : { backgroundColor: 'transparent', color: 'rgba(242,244,243,0.2)', borderColor: 'rgba(242,244,243,0.1)', cursor: 'not-allowed' }
            }
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        {/* Session timer */}
        {session.active ? (
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 border-2"
              style={{ backgroundColor: '#F9D616', borderColor: '#0A0A0A', boxShadow: '2px 2px 0px #0A0A0A' }}
            >
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#0A0A0A' }} />
              <span className="font-mono text-xs font-bold" style={{ color: '#0A0A0A' }}>
                {formatTimer(elapsed)}
              </span>
            </div>
            <button
              onClick={endSession}
              className="px-2.5 py-1 text-[10px] font-display uppercase border-2 transition-all hover:opacity-80"
              style={{ backgroundColor: '#F2F4F3', borderColor: '#0A0A0A', color: '#0A0A0A' }}
            >
              END
            </button>
          </div>
        ) : (
          <button
            onClick={() => startSession()}
            className="px-3 py-1 text-[11px] font-display uppercase border-2 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            style={{ backgroundColor: '#F9D616', borderColor: '#0A0A0A', color: '#0A0A0A', boxShadow: '2px 2px 0px #0A0A0A' }}
          >
            START SESSION
          </button>
        )}

        <span className="text-[--color-red] text-xs font-mono">● LIVE</span>
      </div>
    </header>
  );
}
