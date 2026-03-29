import { updatePreferences, type Preferences } from './onboardingStore';

const BREAK_STYLES = [
  { value: 'pomodoro', label: 'POMODORO', desc: '25min work / 5min break', color: '#E41937' },
  { value: 'deep-work', label: 'DEEP WORK', desc: '90min blocks / 15min break', color: '#2BB6B3' },
  { value: '52-17', label: '52/17', desc: '52min work / 17min break', color: '#3b82f6' },
  { value: 'ultradian', label: 'ULTRADIAN', desc: '120min cycles / 20min rest', color: '#a855f7' },
  { value: 'flowtime', label: 'FLOWTIME', desc: 'Work until focus drops, then break', color: '#F9D616' },
  { value: 'custom', label: 'CUSTOM', desc: 'I will set my own schedule', color: '#0A0A0A' },
] as const;

const WORK_SCHEDULES = [
  { value: '9-5', label: '9 AM — 5 PM', desc: 'Standard hours' },
  { value: '10-6', label: '10 AM — 6 PM', desc: 'Late start' },
  { value: '7-3', label: '7 AM — 3 PM', desc: 'Early bird' },
  { value: '12-8', label: '12 PM — 8 PM', desc: 'Afternoon shift' },
  { value: 'night', label: '8 PM — 4 AM', desc: 'Night owl' },
  { value: 'split', label: 'SPLIT', desc: 'Morning + evening blocks' },
  { value: 'flexible', label: 'FLEXIBLE', desc: 'No fixed schedule' },
];

interface StepPreferencesProps {
  preferences: Preferences;
}

export default function StepPreferences({ preferences }: StepPreferencesProps) {
  return (
    <div className="space-y-5">
      <div>
        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[--color-ink]/50 block mb-1.5">
          WORK SCHEDULE
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {WORK_SCHEDULES.map((ws) => {
            const isSelected = preferences.workHours === ws.value;
            return (
              <button
                key={ws.value}
                onClick={() => updatePreferences({ workHours: ws.value })}
                className="p-2 text-left border-2 border-[--color-ink] transition-all"
                style={{
                  backgroundColor: isSelected ? '#0A0A0A' : '#ffffff',
                  color: isSelected ? '#F9D616' : '#0a0a0a',
                  boxShadow: isSelected ? '3px 3px 0px #F9D616' : 'none',
                  transform: isSelected ? 'translate(-1px, -1px)' : 'none',
                }}
              >
                <div className="text-[11px] font-display">{ws.label}</div>
                <div className="text-[9px] font-mono" style={{ opacity: 0.6 }}>{ws.desc}</div>
              </button>
            );
          })}
        </div>
        <input
          type="text"
          value={!WORK_SCHEDULES.some((ws) => ws.value === preferences.workHours) ? preferences.workHours : ''}
          onChange={(e) => updatePreferences({ workHours: e.target.value })}
          placeholder="Or type custom hours..."
          className="w-full px-2.5 py-1.5 text-[11px] font-mono border-2 border-[--color-ink] bg-white mt-1.5 focus:outline-none focus:shadow-[2px_2px_0px_var(--color-ink)]"
        />
      </div>

      <div>
        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[--color-ink]/50 block mb-1.5">
          BREAK STYLE
        </label>
        <div className="space-y-1.5">
          {BREAK_STYLES.map((bs) => {
            const isSelected = preferences.breakStyle === bs.value;
            return (
              <button
                key={bs.value}
                onClick={() => updatePreferences({ breakStyle: bs.value as any })}
                className="w-full flex items-center gap-3 p-2.5 border-2 border-[--color-ink] text-left transition-all"
                style={{
                  backgroundColor: isSelected ? bs.color : '#ffffff',
                  color: isSelected ? (bs.color === '#F9D616' ? '#0a0a0a' : '#F2F4F3') : '#0a0a0a',
                  boxShadow: isSelected ? '3px 3px 0px #0a0a0a' : 'none',
                  transform: isSelected ? 'translate(-1px, -1px)' : 'none',
                }}
              >
                <div className="w-4 h-4 border-2 border-current flex items-center justify-center shrink-0">
                  {isSelected && <span className="text-[10px]">✓</span>}
                </div>
                <div>
                  <span className="text-xs font-display">{bs.label}</span>
                  <span className="text-[10px] font-mono ml-2" style={{ opacity: isSelected ? 0.8 : 0.5 }}>{bs.desc}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-3 border-2 border-[--color-ink] bg-white">
        <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[--color-ink]/50 mb-1">
          AGENT PERSONALITIES
        </p>
        <p className="text-[11px] font-mono text-[--color-ink]/70 leading-relaxed">
          Each agent has their own built-in personality:<br/>
          <strong>Chief</strong> — calm, decisive, speaks in action items<br/>
          <strong>Hawk</strong> — sharp, brutally honest, uses severity tags<br/>
          <strong>Radar</strong> — curious, always cites sources<br/>
          <strong>Bounty Hunter</strong> — hustler energy, leads with numbers<br/>
          <strong>Buddy</strong> — warm, funny, the only one who uses emojis
        </p>
      </div>
    </div>
  );
}
