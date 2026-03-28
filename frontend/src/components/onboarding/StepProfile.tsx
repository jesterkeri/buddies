import { useState } from 'react';
import { updateProfile, type UserProfile } from './onboardingStore';

const LANGUAGES = [
  'TypeScript', 'JavaScript', 'Solidity', 'Rust', 'Python', 'Go', 'Move',
  'C', 'C++', 'C#', 'Java', 'Kotlin', 'Swift', 'Ruby', 'PHP', 'Dart',
  'Scala', 'Haskell', 'Elixir', 'Erlang', 'Lua', 'R', 'MATLAB',
  'Cairo', 'Vyper', 'Huff', 'Noir', 'Leo', 'Circom',
  'SQL', 'GraphQL', 'Bash', 'Zig', 'Nim', 'OCaml', 'Clojure',
  'Perl', 'F#', 'Julia', 'Crystal', 'V', 'Mojo', 'Gleam',
  'Assembly', 'COBOL', 'Fortran', 'Prolog', 'Lisp', 'Scheme',
  'Objective-C', 'Groovy', 'PowerShell', 'WASM', 'Solidity++',
];
const FRAMEWORKS = [
  'React', 'Next.js', 'Node.js', 'Express', 'Hardhat', 'Foundry', 'Anchor',
  'Vue', 'Svelte', 'Angular', 'Nuxt', 'Remix', 'Vite', 'Astro',
  'Django', 'Flask', 'FastAPI', 'Spring', 'Rails', 'Laravel',
  'Tauri', 'Electron', 'React Native', 'Flutter', 'Expo',
  'Truffle', 'Brownie', 'Ape', 'Sui Move', 'Aptos Move',
  'Nest.js', 'Hono', 'Elysia', 'Bun', 'Deno', 'Actix', 'Axum',
  'Gin', 'Fiber', 'Echo', 'Phoenix', 'SvelteKit', 'Solid.js',
  'Qwik', 'htmx', 'Alpine.js', 'Lit', 'Stencil', 'Ionic',
  'Three.js', 'PixiJS', 'Phaser', 'Unity', 'Unreal', 'Godot',
  'TensorFlow', 'PyTorch', 'LangChain', 'LlamaIndex', 'CrewAI',
  'Prisma', 'Drizzle', 'TypeORM', 'Mongoose', 'Supabase', 'Firebase',
];
const CHAINS = [
  'Ethereum', 'Solana', 'Base', 'Sui', 'Monad', 'Polygon', 'Arbitrum',
  'Optimism', 'Avalanche', 'BNB Chain', 'Fantom', 'Cosmos', 'Polkadot',
  'Near', 'Aptos', 'Sei', 'Starknet', 'zkSync', 'Linea', 'Scroll',
  'Celestia', 'Mantle', 'Blast', 'Mode', 'Berachain', 'Bitcoin', '0G',
  'Hyperliquid', 'TON', 'Cardano', 'Tron', 'Hedera', 'Algorand',
  'Injective', 'Osmosis', 'Cronos', 'Celo', 'Moonbeam', 'Gnosis',
  'Kava', 'Filecoin', 'Internet Computer', 'MultiversX', 'Mina',
  'Kaspa', 'Flow', 'Tezos', 'EOS', 'Sonic', 'Abstract',
];
const EXPERIENCE = [
  { value: 'beginner', label: 'BEGINNER', desc: '< 1 year', color: '#0A0A0A' },
  { value: 'intermediate', label: 'INTERMEDIATE', desc: '1-3 years', color: '#0A0A0A' },
  { value: 'senior', label: 'SENIOR', desc: '3-7 years', color: '#0A0A0A' },
  { value: 'expert', label: 'EXPERT', desc: '7+ years', color: '#0A0A0A' },
] as const;

interface StepProfileProps {
  profile: UserProfile;
}

function TagSelector({ label, options, selected, onToggle, activeColor }: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (item: string) => void;
  activeColor: string;
}) {
  const [search, setSearch] = useState('');

  const filtered = search
    ? options.filter((item) => item.toLowerCase().includes(search.toLowerCase()))
    : options.slice(0, 14); // Show first 14 by default

  const hasMore = !search && options.length > 14;

  return (
    <div>
      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[--color-ink]/50 block mb-1.5">
        {label}
      </label>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={`Search ${label.toLowerCase()}...`}
        className="w-full px-2.5 py-1.5 text-[11px] font-mono border-2 border-[--color-ink] bg-white mb-2 focus:outline-none focus:shadow-[2px_2px_0px_var(--color-ink)]"
      />
      {/* Selected tags always visible */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((item) => (
            <button
              key={item}
              onClick={() => onToggle(item)}
              className="px-2.5 py-1 text-[11px] font-mono font-bold border-2 border-[--color-ink] transition-all"
              style={{
                backgroundColor: activeColor,
                color: '#F2F4F3',
                boxShadow: '2px 2px 0px #0a0a0a',
                transform: 'translate(-1px, -1px)',
              }}
            >
              {item} ✕
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {filtered.filter((item) => !selected.includes(item)).map((item) => (
          <button
            key={item}
            onClick={() => onToggle(item)}
            className="px-2.5 py-1 text-[11px] font-mono font-bold border-2 border-[--color-ink] bg-white transition-all hover:bg-[--color-ink]/5"
          >
            {item}
          </button>
        ))}
        {hasMore && (
          <span className="px-2 py-1 text-[10px] font-mono text-[--color-ink]/40">
            type to search {options.length - 14} more...
          </span>
        )}
        {search && filtered.length === 0 && (
          <span className="text-[10px] font-mono text-[--color-ink]/40">No matches</span>
        )}
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
          className="w-full px-3 py-2 text-sm font-mono border-2 border-[--color-ink] bg-white focus:outline-none focus:shadow-[2px_2px_0px_var(--color-teal)] focus:border-[--color-teal]"
        />
      </div>

      <TagSelector
        label="LANGUAGES"
        options={LANGUAGES}
        selected={profile.languages}
        onToggle={(item) => toggle('languages', item)}
        activeColor="#0A0A0A"
      />

      <TagSelector
        label="FRAMEWORKS"
        options={FRAMEWORKS}
        selected={profile.frameworks}
        onToggle={(item) => toggle('frameworks', item)}
        activeColor="#0A0A0A"
      />

      <TagSelector
        label="CHAINS"
        options={CHAINS}
        selected={profile.chains}
        onToggle={(item) => toggle('chains', item)}
        activeColor="#0A0A0A"
      />

      <div>
        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[--color-ink]/50 block mb-1.5">
          EXPERIENCE LEVEL
        </label>
        <div className="flex gap-2">
          {EXPERIENCE.map((exp) => {
            const isSelected = profile.experience === exp.value;
            return (
              <button
                key={exp.value}
                onClick={() => updateProfile({ experience: exp.value })}
                className="flex-1 py-2 text-center border-2 border-[--color-ink] transition-all"
                style={{
                  backgroundColor: isSelected ? exp.color : '#ffffff',
                  color: isSelected ? (exp.color === '#F9D616' ? '#0a0a0a' : '#F2F4F3') : '#0a0a0a',
                  boxShadow: isSelected ? '3px 3px 0px #0a0a0a' : 'none',
                  transform: isSelected ? 'translate(-1px, -1px)' : 'none',
                }}
              >
                <div className="text-[10px] font-display">{exp.label}</div>
                <div className="text-[8px] font-mono" style={{ opacity: isSelected ? 0.8 : 0.5 }}>{exp.desc}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
