import { updateApiConfig, type ApiConfig } from './onboardingStore';

const PROVIDERS = [
  { value: 'qwen', label: 'QWEN 3.5-27B', desc: 'Nosana endpoint (free)', recommended: true },
  { value: 'openai', label: 'OPENAI', desc: 'GPT-4o, o3' },
  { value: 'anthropic', label: 'ANTHROPIC', desc: 'Claude Opus, Sonnet' },
  { value: 'google', label: 'GOOGLE', desc: 'Gemini 2.5 Pro, Flash' },
  { value: 'ollama', label: 'OLLAMA', desc: 'Local models (free)' },
];

interface StepApiConfigProps {
  apiConfig: ApiConfig;
}

export default function StepApiConfig({ apiConfig }: StepApiConfigProps) {
  return (
    <div className="space-y-4">
      <p className="text-[11px] font-mono text-[--color-ink]/50">
        Choose a default LLM provider for all agents. You can override per-agent later.
      </p>

      <div className="space-y-2">
        {PROVIDERS.map((p) => (
          <button
            key={p.value}
            onClick={() => updateApiConfig({ defaultProvider: p.value })}
            className="w-full flex items-center gap-3 p-3 border-2 border-[--color-ink] text-left transition-all"
            style={{
              backgroundColor: apiConfig.defaultProvider === p.value ? '#0a0a0a' : '#F2F4F3',
              color: apiConfig.defaultProvider === p.value ? '#F2F4F3' : '#0a0a0a',
              boxShadow: apiConfig.defaultProvider === p.value ? '3px 3px 0px #F9D616' : 'none',
            }}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-display">{p.label}</span>
                {p.recommended && (
                  <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 bg-[--color-teal] text-[--color-ink] border border-[--color-ink]">
                    RECOMMENDED
                  </span>
                )}
              </div>
              <span className="text-[10px] font-mono opacity-50">{p.desc}</span>
            </div>
            <div className="w-5 h-5 border-2 border-current flex items-center justify-center">
              {apiConfig.defaultProvider === p.value && <span className="text-xs">✓</span>}
            </div>
          </button>
        ))}
      </div>

      {apiConfig.defaultProvider !== 'qwen' && apiConfig.defaultProvider !== 'ollama' && (
        <div>
          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[--color-ink]/50 block mb-1.5">
            API KEY
          </label>
          <input
            type="password"
            value={apiConfig.apiKey}
            onChange={(e) => updateApiConfig({ apiKey: e.target.value })}
            placeholder="Enter your API key..."
            className="w-full px-3 py-2 text-sm font-mono border-2 border-[--color-ink] focus:outline-none focus:shadow-[2px_2px_0px_var(--color-ink)]"
          />
          <p className="text-[9px] font-mono text-[--color-ink]/30 mt-1">
            Keys are stored locally and never sent to our servers.
          </p>
        </div>
      )}
    </div>
  );
}
