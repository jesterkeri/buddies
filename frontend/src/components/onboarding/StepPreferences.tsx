import { updatePreferences, type Preferences } from './onboardingStore';

const BREAK_STYLES = [
  { value: 'pomodoro', label: 'POMODORO', desc: '25min work / 5min break' },
  { value: 'deep-work', label: 'DEEP WORK', desc: '90min blocks / 15min break' },
  { value: 'custom', label: 'CUSTOM', desc: 'I will set my own schedule' },
] as const;

const PERSONALITY = [
  { value: 'professional', label: 'PROFESSIONAL', desc: 'Formal and structured' },
  { value: 'casual', label: 'CASUAL', desc: 'Friendly and relaxed' },
  { value: 'sarcastic', label: 'SARCASTIC', desc: 'Witty and irreverent' },
] as const;

interface StepPreferencesProps {
  preferences: Preferences;
}

export default function StepPreferences({ preferences }: StepPreferencesProps) {
  return (
    <div className="space-y-5">
      <div>
        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[--color-ink]/50 block mb-1.5">
          WORK HOURS
        </label>
        <input
          type="text"
          value={preferences.workHours}
          onChange={(e) => updatePreferences({ workHours: e.target.value })}
          placeholder="e.g. 9-5, flexible, night owl..."
          className="w-full px-3 py-2 text-sm font-mono border-2 border-[--color-ink] focus:outline-none focus:shadow-[2px_2px_0px_var(--color-ink)]"
        />
      </div>

      <div>
        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[--color-ink]/50 block mb-1.5">
          BREAK STYLE
        </label>
        <div className="space-y-1.5">
          {BREAK_STYLES.map((bs) => (
            <button
              key={bs.value}
              onClick={() => updatePreferences({ breakStyle: bs.value })}
              className="w-full flex items-center gap-3 p-2.5 border-2 border-[--color-ink] text-left transition-all"
              style={{
                backgroundColor: preferences.breakStyle === bs.value ? '#0a0a0a' : '#F2F4F3',
                color: preferences.breakStyle === bs.value ? '#F2F4F3' : '#0a0a0a',
              }}
            >
              <div className="w-4 h-4 border-2 border-current flex items-center justify-center shrink-0">
                {preferences.breakStyle === bs.value && <span className="text-[10px]">✓</span>}
              </div>
              <div>
                <span className="text-xs font-display">{bs.label}</span>
                <span className="text-[10px] font-mono opacity-50 ml-2">{bs.desc}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[--color-ink]/50 block mb-1.5">
          AGENT PERSONALITY TONE
        </label>
        <div className="flex gap-2">
          {PERSONALITY.map((p) => (
            <button
              key={p.value}
              onClick={() => updatePreferences({ personality: p.value })}
              className="flex-1 py-2.5 text-center border-2 border-[--color-ink] transition-all"
              style={{
                backgroundColor: preferences.personality === p.value ? '#0a0a0a' : '#F2F4F3',
                color: preferences.personality === p.value ? '#F2F4F3' : '#0a0a0a',
              }}
            >
              <div className="text-[10px] font-display">{p.label}</div>
              <div className="text-[8px] font-mono opacity-50">{p.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
