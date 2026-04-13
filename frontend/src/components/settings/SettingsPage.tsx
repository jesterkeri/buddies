import { useState, useEffect } from 'react';
import { useSettings, updateIntegration, updateNotifications, updateAiConfig, updateAgentModel, type IntegrationConfig } from './settingsStore';
import { getAgentColor, AGENT_NAMES } from '../../types';
import { CONFIG_SERVER } from '../../api/config';

const AI_PROVIDERS = [
  { value: 'ollama', label: 'OLLAMA', desc: 'Local models (free)', url: 'http://127.0.0.1:11434/v1', models: ['gemma4', 'gemma3:9b', 'qwen3:8b', 'qwen2.5:7b', 'qwen2.5:14b', 'llama3.3:8b', 'llama3.1:70b', 'deepseek-r1:8b', 'phi-4:14b', 'mistral:7b'], needsKey: false, color: '#F2F4F3' },
  { value: 'nosana', label: 'NOSANA QWEN', desc: 'Qwen3.5-27B (competition)', url: 'https://5i8frj7ann99bbw9gzpprvzj2esugg39hxbb4unypskq.node.k8s.prd.nos.ci/v1', models: ['Qwen3.5-9B-FP8'], needsKey: false, color: '#2BB6B3' },
  { value: 'openai', label: 'OPENAI', desc: 'GPT-5.4, o3, o4-mini', url: 'https://api.openai.com/v1', models: ['gpt-5.4', 'gpt-5.4-pro', 'gpt-5.4-mini', 'gpt-5.4-nano', 'gpt-5.2', 'o3', 'o4-mini', 'gpt-4o', 'gpt-4o-mini'], needsKey: true, color: '#22c55e' },
  { value: 'anthropic', label: 'ANTHROPIC', desc: 'Claude Opus 4.6, Sonnet 4.6', url: 'https://api.anthropic.com/v1', models: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5', 'claude-sonnet-4-5', 'claude-opus-4-5'], needsKey: true, color: '#d4a574' },
  { value: 'google', label: 'GOOGLE', desc: 'Gemini 3.1 Pro, 2.5 Pro', url: 'https://generativelanguage.googleapis.com/v1beta/openai', models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-lite'], needsKey: true, color: '#4285f4' },
  { value: 'groq', label: 'GROQ', desc: 'Fast inference', url: 'https://api.groq.com/openai/v1', models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it', 'deepseek-r1-distill-llama-70b', 'mixtral-8x7b-32768'], needsKey: true, color: '#f55036' },
  { value: 'openrouter', label: 'OPENROUTER', desc: 'Multi-model gateway', url: 'https://openrouter.ai/api/v1', models: ['auto', 'openai/gpt-5.4', 'anthropic/claude-opus-4-6', 'google/gemini-3.1-pro', 'deepseek/deepseek-reasoner', 'meta-llama/llama-3.3-70b'], needsKey: true, color: '#6366f1' },
  { value: 'deepseek', label: 'DEEPSEEK', desc: 'DeepSeek V3.2, R1', url: 'https://api.deepseek.com/v1', models: ['deepseek-chat', 'deepseek-reasoner'], needsKey: true, color: '#0ea5e9' },
  { value: 'xai', label: 'XAI (GROK)', desc: 'Grok 4.20, multi-agent', url: 'https://api.x.ai/v1', models: ['grok-4.20-0309-reasoning', 'grok-4.20-0309-non-reasoning', 'grok-4-1-fast-reasoning', 'grok-4.20-multi-agent-0309'], needsKey: true, color: '#F2F4F3' },
  { value: 'kimi', label: 'KIMI', desc: 'K2.5, K2 Thinking', url: 'https://api.moonshot.cn/v1', models: ['kimi-k2.5', 'kimi-k2-thinking', 'kimi-k2-thinking-turbo', 'kimi-k2-turbo-preview'], needsKey: true, color: '#7c3aed' },
  { value: 'minimax', label: 'MINIMAX', desc: 'M2.7, M2.5', url: 'https://api.minimax.chat/v1', models: ['MiniMax-M2.7', 'MiniMax-M2.7-highspeed', 'MiniMax-M2.5', 'MiniMax-M2.5-highspeed'], needsKey: true, color: '#ec4899' },
];

const INTEGRATIONS: {
  key: keyof IntegrationConfig;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  desc: string;
  fields: { key: string; label: string; placeholder: string; type: string }[];
  setupGuide: string[];
}[] = [
  {
    key: 'telegram',
    label: 'TELEGRAM',
    icon: '✈',
    color: '#2BB6B3',
    bgColor: '#1a3a3a',
    desc: 'Break reminders, alerts, and agent relay messages.',
    fields: [
      { key: 'botToken', label: 'BOT TOKEN', placeholder: '123456:ABC-DEF...', type: 'password' },
      { key: 'chatId', label: 'CHAT ID', placeholder: '123456789', type: 'text' },
    ],
    setupGuide: [
      'Open Telegram → search @BotFather',
      'Send /newbot → name it "Buddies Bot"',
      'Copy the bot token above',
      'Message your bot, then get chat_id from:',
      'api.telegram.org/bot<TOKEN>/getUpdates',
    ],
  },
  {
    key: 'email',
    label: 'EMAIL',
    icon: '📧',
    color: '#E41937',
    bgColor: '#3a1a1a',
    desc: 'Daily standups and critical alerts.',
    fields: [
      { key: 'address', label: 'EMAIL ADDRESS', placeholder: 'you@example.com', type: 'email' },
    ],
    setupGuide: ['Enter your email', 'Verify via confirmation link'],
  },
  {
    key: 'whatsapp',
    label: 'WHATSAPP',
    icon: '💬',
    color: '#25D366',
    bgColor: '#1a3a1a',
    desc: 'Break reminders and urgent alerts.',
    fields: [
      { key: 'phoneNumber', label: 'PHONE NUMBER', placeholder: '+1234567890', type: 'tel' },
    ],
    setupGuide: ['Enter your WhatsApp number', 'Verify via code sent to your phone'],
  },
];

const NOTIFICATION_TYPES = [
  { key: 'breakReminders', label: 'BREAK REMINDERS', desc: 'Buddy reminds you to rest', icon: '☕', color: '#a855f7' },
  { key: 'securityAlerts', label: 'SECURITY ALERTS', desc: 'Hawk flags vulnerabilities', icon: '🔍', color: '#E41937' },
  { key: 'opportunityAlerts', label: 'OPPORTUNITIES', desc: 'Bounty Hunter finds matches', icon: '💰', color: '#F9D616' },
  { key: 'celebrations', label: 'CELEBRATIONS', desc: 'Buddy celebrates your wins', icon: '🎉', color: '#2BB6B3' },
  { key: 'standupSummary', label: 'DAILY STANDUP', desc: 'Chief sends morning summary', icon: '📋', color: '#3b82f6' },
] as const;

export default function SettingsPage() {
  const settings = useSettings();
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const connectedCount = Object.values(settings.integrations).filter((i) => i.connected).length;
  const activeNotifs = Object.values(settings.notifications).filter(Boolean).length;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Two-column layout */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 gap-6" style={{ maxWidth: '100%' }}>

          {/* Left column: Per-Agent AI Config */}
          <div className="space-y-4">
            {/* AI Config Header */}
            <div className="panel p-3 border-2 border-[--color-ink]" style={{ backgroundColor: '#E41937' }}>
              <p className="font-display text-lg text-white">AGENT AI CONFIG</p>
              <p className="text-[10px] font-mono text-white/60 mt-0.5">
                Pick a provider, model, and API key for each agent
              </p>
            </div>

            {/* Per-Agent Cards */}
            {AGENT_NAMES.map((name) => {
              const agentConfig = settings.aiConfig.perAgent[name];
              const currentProvider = agentConfig?.provider || settings.aiConfig.defaultProvider;
              const providerInfo = AI_PROVIDERS.find((p) => p.value === currentProvider);
              const isExpanded = expandedAgent === name;

              return (
                <AgentModelCard
                  key={name}
                  name={name}
                  config={agentConfig}
                  currentProvider={currentProvider}
                  providerInfo={providerInfo}
                  isExpanded={isExpanded}
                  onToggle={() => setExpandedAgent(isExpanded ? null : name)}
                  defaultApiKey={settings.aiConfig.defaultApiKey}
                />
              );
            })}
          </div>

          {/* Right column: Messaging + Notifications */}
          <div className="space-y-4">
            <div className="panel p-3 border-2 border-[--color-ink]" style={{ backgroundColor: '#F9D616' }}>
              <p className="font-display text-lg text-[--color-ink]">MESSAGING</p>
              <p className="text-[10px] font-mono text-[--color-ink]/60 mt-0.5">
                Buddy relays all messages externally
              </p>
            </div>

            {INTEGRATIONS.map((integration) => {
              const config = settings.integrations[integration.key];
              const isEnabled = config.enabled;

              return (
                <div
                  key={integration.key}
                  className="border-2 border-[--color-ink] shadow-[3px_3px_0px_var(--color-ink)] overflow-hidden"
                  style={{ backgroundColor: isEnabled ? integration.bgColor : '#1a1d27' }}
                >
                  {/* Card header */}
                  <div
                    className="flex items-center justify-between px-3 py-2.5 cursor-pointer border-b-2 border-[--color-ink]"
                    style={{ backgroundColor: integration.color + '20' }}
                    onClick={() => updateIntegration(integration.key, { enabled: !isEnabled })}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 border-2 border-[--color-ink] flex items-center justify-center text-base"
                        style={{ backgroundColor: integration.color, boxShadow: '2px 2px 0px #0a0a0a' }}
                      >
                        {integration.icon}
                      </div>
                      <div>
                        <span className="font-display text-sm text-white tracking-wider">{integration.label}</span>
                        {config.connected && (
                          <span className="ml-2 text-[8px] font-mono font-bold px-1.5 py-0.5 bg-[#22c55e] text-[#0a0a0a] border border-[--color-ink]">
                            LIVE
                          </span>
                        )}
                        <p className="text-[9px] font-mono text-white/40">{integration.desc}</p>
                      </div>
                    </div>
                    {/* Toggle */}
                    <div
                      className="w-11 h-6 border-2 border-[--color-ink] rounded-full relative"
                      style={{ backgroundColor: isEnabled ? integration.color : '#333' }}
                    >
                      <div
                        className="w-5 h-5 border-2 border-[--color-ink] rounded-full absolute transition-all"
                        style={{ backgroundColor: '#F2F4F3', left: isEnabled ? '18px' : '0px', top: '-1px' }}
                      />
                    </div>
                  </div>

                  {/* Config fields */}
                  {isEnabled && (
                    <div className="px-3 py-3 space-y-2.5">
                      {integration.fields.map((field) => (
                        <div key={field.key}>
                          <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-white/30 block mb-1">
                            {field.label}
                          </label>
                          <input
                            type={field.type}
                            value={(config as any)[field.key] || ''}
                            onChange={(e) => updateIntegration(integration.key, { [field.key]: e.target.value })}
                            placeholder={field.placeholder}
                            className="w-full px-2.5 py-1.5 text-[11px] font-mono border-2 border-white/15 bg-black/30 text-white placeholder-white/20 focus:outline-none focus:border-white/30"
                          />
                        </div>
                      ))}

                      <div className="flex gap-2">
                        <button
                          className="flex-1 py-1.5 text-[10px] font-display uppercase border-2 border-[--color-ink] shadow-[2px_2px_0px_#0a0a0a] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                          style={{ backgroundColor: integration.color, color: '#0a0a0a' }}
                          onClick={() => updateIntegration(integration.key, { connected: true })}
                        >
                          CONNECT
                        </button>
                        <details className="flex-1">
                          <summary className="py-1.5 text-[10px] font-display uppercase border-2 border-white/20 text-white/50 text-center cursor-pointer hover:border-white/40 transition-all">
                            GUIDE
                          </summary>
                          <ol className="mt-2 space-y-1 pl-3">
                            {integration.setupGuide.map((step, i) => (
                              <li key={i} className="text-[9px] font-mono text-white/40 list-decimal">{step}</li>
                            ))}
                          </ol>
                        </details>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {/* Notification toggles */}
            <div className="border-2 border-[--color-ink] shadow-[3px_3px_0px_var(--color-ink)] overflow-hidden">
              <div className="px-3 py-2 border-b-2 border-[--color-ink]" style={{ backgroundColor: '#0a0a0a' }}>
                <span className="font-display text-sm" style={{ color: '#F9D616' }}>NOTIFICATIONS</span>
              </div>
              <div className="p-2 space-y-1" style={{ backgroundColor: '#1a1d27' }}>
                {NOTIFICATION_TYPES.map((notif) => {
                  const enabled = settings.notifications[notif.key as keyof typeof settings.notifications];
                  return (
                    <div
                      key={notif.key}
                      className="flex items-center justify-between p-2 border-2 cursor-pointer transition-all hover:translate-x-[-1px] hover:translate-y-[-1px]"
                      style={{
                        borderColor: enabled ? notif.color : 'rgba(255,255,255,0.08)',
                        backgroundColor: enabled ? notif.color + '15' : 'transparent',
                      }}
                      onClick={() => updateNotifications({ [notif.key]: !enabled })}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{notif.icon}</span>
                        <div>
                          <span className="text-[11px] font-display text-white">{notif.label}</span>
                          <p className="text-[8px] font-mono text-white/30">{notif.desc}</p>
                        </div>
                      </div>
                      <div
                        className="px-2 py-0.5 text-[9px] font-mono font-bold border-2 border-[--color-ink]"
                        style={{
                          backgroundColor: enabled ? notif.color : '#333',
                          color: enabled ? '#0a0a0a' : '#666',
                        }}
                      >
                        {enabled ? 'ON' : 'OFF'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="border-2 border-[--color-ink] p-3 text-center shadow-[2px_2px_0px_var(--color-ink)]" style={{ backgroundColor: '#2BB6B3' }}>
                <p className="font-display text-2xl text-[--color-ink]">{connectedCount}</p>
                <p className="text-[9px] font-mono text-[--color-ink]/60">CONNECTED</p>
              </div>
              <div className="border-2 border-[--color-ink] p-3 text-center shadow-[2px_2px_0px_var(--color-ink)]" style={{ backgroundColor: '#F9D616' }}>
                <p className="font-display text-2xl text-[--color-ink]">{activeNotifs}</p>
                <p className="text-[9px] font-mono text-[--color-ink]/60">ALERTS ACTIVE</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const AGENT_ROLES: Record<string, string> = {
  Chief: 'Team Lead',
  Hawk: 'Code Reviewer',
  Radar: 'Scout',
  'Bounty Hunter': 'Opportunity Scanner',
  Buddy: 'Wellness Agent',
};

function AgentModelCard({ name, config, currentProvider, providerInfo, isExpanded, onToggle, defaultApiKey }: {
  name: string;
  config?: { provider: string; apiKey: string; apiUrl: string; model: string };
  currentProvider: string;
  providerInfo?: typeof AI_PROVIDERS[number];
  isExpanded: boolean;
  onToggle: () => void;
  defaultApiKey: string;
}) {
  const color = getAgentColor(name);
  const hasConfig = config?.provider && config.provider !== '' && config.provider !== 'none';
  const isDisconnected = config?.provider === 'none';
  const activeApiKey = config?.apiKey || defaultApiKey;
  const needsKey = providerInfo?.needsKey;
  const isReady = !isDisconnected && (!needsKey || (activeApiKey && activeApiKey.length > 5));

  return (
    <div
      className="border-2 border-[--color-ink] shadow-[3px_3px_0px_var(--color-ink)] overflow-hidden"
      style={{ backgroundColor: '#1a1d27', borderLeftWidth: '5px', borderLeftColor: color }}
    >
      {/* Agent header */}
      <div
        className="flex items-center justify-between px-3 py-3 cursor-pointer hover:bg-white/5 transition-all"
        style={{ backgroundColor: '#0a0a0a' }}
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 border-2 border-[--color-ink] flex items-center justify-center text-sm font-display shrink-0"
            style={{ backgroundColor: color, color: '#0a0a0a', boxShadow: '2px 2px 0px #0a0a0a' }}
          >
            {name[0]}
          </div>
          <div>
            <span className="text-sm font-display text-white tracking-wider">{name.toUpperCase()}</span>
            <p className="text-[9px] font-mono text-white/30">{AGENT_ROLES[name] || 'Agent'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isReady && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateAgentModel(name, { provider: 'none', apiKey: '', apiUrl: '', model: '' });
              }}
              className="px-2 py-0.5 text-[9px] font-display uppercase border-2 border-[#E41937] hover:bg-[#E41937] hover:text-white transition-all"
              style={{ color: '#E41937', backgroundColor: 'rgba(228,25,55,0.1)' }}
            >
              DISCONNECT
            </button>
          )}
          {isDisconnected && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateAgentModel(name, { provider: 'nosana', apiKey: 'nosana', apiUrl: 'https://5i8frj7ann99bbw9gzpprvzj2esugg39hxbb4unypskq.node.k8s.prd.nos.ci/v1', model: 'Qwen3.5-9B-FP8' });
              }}
              className="px-2 py-0.5 text-[9px] font-display uppercase border-2 border-[#22C55E] hover:bg-[#22C55E] hover:text-[#0a0a0a] transition-all"
              style={{ color: '#22C55E', backgroundColor: 'rgba(34,197,94,0.1)' }}
            >
              RECONNECT DEFAULT
            </button>
          )}
          <span
            className="px-2 py-0.5 text-[9px] font-mono font-bold border-2 border-[--color-ink]"
            style={{
              backgroundColor: isReady ? (providerInfo?.color || '#333') : '#E41937',
              color: '#0a0a0a',
            }}
          >
            {isReady ? (currentProvider?.toUpperCase() || 'OLLAMA') : 'NO KEY'}
          </span>
          <span className="text-[12px] text-white/40">{isExpanded ? '▾' : '▸'}</span>
        </div>
      </div>

      {/* Expanded config */}
      {isExpanded && (
        <div className="px-3 py-3 space-y-3" style={{ backgroundColor: '#111' }}>
          {/* Provider grid */}
          <div>
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/30 block mb-1.5">PROVIDER</label>
            <div className="grid grid-cols-2 gap-1.5">
              {AI_PROVIDERS.map((p) => {
                const isSelected = currentProvider === p.value;
                return (
                  <button
                    key={p.value}
                    onClick={() => updateAgentModel(name, {
                      provider: p.value,
                      apiUrl: p.url,
                      model: p.models[0],
                      apiKey: p.needsKey ? (config?.apiKey || '') : (p.value === 'nosana' ? 'nosana' : 'ollama'),
                    })}
                    className="p-2 text-left border-2 border-[--color-ink] transition-all"
                    style={{
                      backgroundColor: isSelected ? p.color : '#0a0a0a',
                      color: isSelected ? '#0a0a0a' : '#F2F4F3',
                      boxShadow: isSelected ? `2px 2px 0px ${color}` : 'none',
                      transform: isSelected ? 'translate(-1px, -1px)' : 'none',
                    }}
                  >
                    <div className="text-[11px] font-display">{p.label}</div>
                    <div className="text-[9px] font-mono" style={{ opacity: 0.6 }}>{p.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* API Key */}
          {providerInfo?.needsKey && (
            <div>
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/30 block mb-1">API KEY</label>
              <input
                type="password"
                value={config?.apiKey || ''}
                onChange={(e) => updateAgentModel(name, { apiKey: e.target.value })}
                placeholder={`Enter ${providerInfo.label} API key for ${name}...`}
                className="w-full px-2.5 py-1.5 text-[11px] font-mono border-2 border-white/15 bg-black/30 text-white placeholder-white/20 focus:outline-none focus:border-white/30"
              />
            </div>
          )}

          {/* Model selector */}
          <div>
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/30 block mb-1">MODEL</label>
            <div className="flex flex-wrap gap-1.5">
              {(providerInfo?.models || []).map((m) => {
                const isSelected = (config?.model || providerInfo?.models[0]) === m;
                return (
                  <button
                    key={m}
                    onClick={() => updateAgentModel(name, { model: m })}
                    className="px-2.5 py-1 text-[10px] font-mono font-bold border-2 border-[--color-ink] transition-all"
                    style={{
                      backgroundColor: isSelected ? color : '#0a0a0a',
                      color: isSelected ? '#0a0a0a' : '#F2F4F3',
                      boxShadow: isSelected ? '2px 2px 0px #0a0a0a' : 'none',
                    }}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Test Connection button — show for keyless providers (ollama/nosana) or when a key is provided */}
          {((providerInfo && !providerInfo.needsKey) || (config?.apiKey && config.apiKey.length > 3)) && (
            <TestConnectionButton
              provider={config.provider}
              apiKey={config.apiKey || ''}
              apiUrl={config.apiUrl || providerInfo?.url || ''}
              model={config.model || providerInfo?.models[0] || ''}
            />
          )}
        </div>
      )}
    </div>
  );
}

function TestConnectionButton({ provider, apiKey, apiUrl, model }: { provider: string; apiKey: string; apiUrl: string; model: string }) {
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  // Reset status when credentials change
  useEffect(() => {
    setStatus('idle');
    setError('');
  }, [provider, apiKey, apiUrl, model]);

  const test = async () => {
    setStatus('testing');
    setError('');
    try {
      const res = await fetch(`${CONFIG_SERVER}/config/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey, apiUrl, model }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('success');
      } else {
        setStatus('error');
        setError(data.error || 'Connection failed');
      }
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'Network error');
    }
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      <button
        onClick={test}
        disabled={status === 'testing'}
        className="px-3 py-1 text-[10px] font-mono font-bold uppercase border-2 border-[--color-ink] transition-all hover:opacity-80 disabled:opacity-40"
        style={{
          backgroundColor: status === 'success' ? '#22c55e' : status === 'error' ? '#E41937' : '#1a1f2e',
          color: status === 'success' || status === 'error' ? '#0a0a0a' : '#F2F4F3',
        }}
      >
        {status === 'testing' ? 'TESTING...' : status === 'success' ? 'CONNECTED' : status === 'error' ? 'FAILED' : 'TEST CONNECTION'}
      </button>
      {status === 'error' && error && (
        <span className="text-[9px] font-mono" style={{ color: '#E41937' }}>{error.slice(0, 60)}</span>
      )}
    </div>
  );
}
