import { updateProfile, type UserProfile } from './onboardingStore';

const LANGUAGES = ['TypeScript', 'JavaScript', 'Solidity', 'Rust', 'Python', 'Go', 'Move'];
const FRAMEWORKS = ['React', 'Next.js', 'Node.js', 'Express', 'Hardhat', 'Foundry', 'Anchor'];
const CHAINS = ['Ethereum', 'Solana', 'Base', 'Sui', 'Monad', 'Polygon', 'Arbitrum'];
const EXPERIENCE = [
  { value: 'beginner', label: 'BEGINNER', desc: '< 1 year' },
  { value: 'intermediate', label: 'INTERMEDIATE', desc: '1-3 years' },
  { value: 'senior', label: 'SENIOR', desc: '3-7 years' },
  { value: 'expert', label: 'EXPERT', desc: '7+ years' },
] as const;

interface StepProfileProps {
  profile: UserProfile;
}

function TagSelector({ label, options, selected, onToggle }: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (item: string) => void;
}) {
  return (
    <div>
      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[--color-ink]/50 block mb-1.5">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((item) => (
          <button
            key={item}
            onClick={() => onToggle(item)}
            className="px-2.5 py-1 text-[11px] font-mono font-bold border-2 border-[--color-ink] transition-all"
            style={{
              backgroundColor: selected.includes(item) ? '#0a0a0a' : '#F2F4F3',
              color: selected.includes(item) ? '#F2F4F3' : '#0a0a0a',
              boxShadow: selected.includes(item) ? '2px 2px 0px #F9D616' : 'none',
            }}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function StepProfile({ profile }: StepProfileProps) {
  const toggle = (field: 'languages' | 'frameworks' | 'chains', item: string) => {
    const current = profile[field];
    const next = current.includes(item)
      ? current.filter((i) => i !== item)
      : [...current, item];
    updateProfile({ [field]: next });
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[--color-ink]/50 block mb-1.5">
          YOUR NAME
        </label>
        <input
          type="text"
          value={profile.name}
          onChange={(e) => updateProfile({ name: e.target.value })}
          placeholder="Enter your name..."
          className="w-full px-3 py-2 text-sm font-mono border-2 border-[--color-ink] focus:outline-none focus:shadow-[2px_2px_0px_var(--color-ink)]"
        />
      </div>

      <TagSelector
        label="LANGUAGES"
        options={LANGUAGES}
        selected={profile.languages}
        onToggle={(item) => toggle('languages', item)}
      />

      <TagSelector
        label="FRAMEWORKS"
        options={FRAMEWORKS}
        selected={profile.frameworks}
        onToggle={(item) => toggle('frameworks', item)}
      />

      <TagSelector
        label="CHAINS"
        options={CHAINS}
        selected={profile.chains}
        onToggle={(item) => toggle('chains', item)}
      />

      <div>
        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[--color-ink]/50 block mb-1.5">
          EXPERIENCE LEVEL
        </label>
        <div className="flex gap-2">
          {EXPERIENCE.map((exp) => (
            <button
              key={exp.value}
              onClick={() => updateProfile({ experience: exp.value })}
              className="flex-1 py-2 text-center border-2 border-[--color-ink] transition-all"
              style={{
                backgroundColor: profile.experience === exp.value ? '#0a0a0a' : '#F2F4F3',
                color: profile.experience === exp.value ? '#F2F4F3' : '#0a0a0a',
              }}
            >
              <div className="text-[10px] font-display">{exp.label}</div>
              <div className="text-[8px] font-mono opacity-60">{exp.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
