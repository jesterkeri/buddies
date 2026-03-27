import type { TabId } from '../../types';

interface TopNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string; enabled: boolean }[] = [
  { id: 'chat', label: 'COMMS', enabled: true },
  { id: 'office', label: 'HQ', enabled: false },
  { id: 'tasks', label: 'MISSIONS', enabled: false },
  { id: 'activity', label: 'INTEL', enabled: false },
];

export default function TopNav({ activeTab, onTabChange }: TopNavProps) {
  return (
    <header className="bg-[--color-ink] border-b-4 border-[--color-ink] flex items-center px-4 py-2 gap-4">
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
            className={`px-3 py-1 font-display text-sm tracking-wider border-2 transition-all ${
              activeTab === tab.id
                ? 'bg-[--color-yellow] text-[--color-ink] border-[--color-ink] shadow-[3px_3px_0px_var(--color-paper)]'
                : tab.enabled
                  ? 'bg-transparent text-[--color-paper] border-[--color-paper]/30 hover:bg-[--color-paper]/10 hover:border-[--color-paper]'
                  : 'bg-transparent text-[--color-paper]/20 border-[--color-paper]/10 cursor-not-allowed'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <span className="badge bg-[--color-teal] text-[--color-ink] px-2 py-0.5 text-xs font-bold border-2 border-[--color-ink]" style={{ transform: 'rotate(-3deg)' }}>
          5 AGENTS ONLINE
        </span>
        <span className="text-[--color-red] text-xs font-mono">● LIVE</span>
      </div>
    </header>
  );
}
