import { useSettings, updateIntegration, updateNotifications, type IntegrationConfig } from './settingsStore';

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
    key: 'discord',
    label: 'DISCORD',
    icon: '🎮',
    color: '#5865F2',
    bgColor: '#1a1a3a',
    desc: 'Notifications in your Discord server.',
    fields: [
      { key: 'webhookUrl', label: 'WEBHOOK URL', placeholder: 'https://discord.com/api/webhooks/...', type: 'text' },
    ],
    setupGuide: [
      'Server Settings → Integrations → Webhooks',
      'Create webhook named "Buddies"',
      'Copy the URL above',
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
  { key: 'breakReminders', label: 'BREAK REMINDERS', desc: 'Beans reminds you to rest', icon: '☕', color: '#a855f7' },
  { key: 'securityAlerts', label: 'SECURITY ALERTS', desc: 'Hawk flags vulnerabilities', icon: '🔍', color: '#E41937' },
  { key: 'opportunityAlerts', label: 'OPPORTUNITIES', desc: 'Tracker finds matches', icon: '💰', color: '#F9D616' },
  { key: 'celebrations', label: 'CELEBRATIONS', desc: 'Beans celebrates your wins', icon: '🎉', color: '#2BB6B3' },
  { key: 'standupSummary', label: 'DAILY STANDUP', desc: 'Chief sends morning summary', icon: '📋', color: '#3b82f6' },
] as const;

export default function SettingsPage() {
  const settings = useSettings();
  const connectedCount = Object.values(settings.integrations).filter((i) => i.connected).length;
  const activeNotifs = Object.values(settings.notifications).filter(Boolean).length;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Two-column layout */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-4 max-w-5xl mx-auto">

          {/* Left column: Integrations */}
          <div className="space-y-3">
            {/* Header */}
            <div className="panel p-3 border-2 border-[--color-ink]" style={{ backgroundColor: '#F9D616' }}>
              <p className="font-display text-lg text-[--color-ink]">CONNECTIONS</p>
              <p className="text-[10px] font-mono text-[--color-ink]/60 mt-0.5">
                Beans relays all messages outside the Command Center
              </p>
            </div>

            {/* Integration cards */}
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
          </div>

          {/* Right column: Notifications + Beans info */}
          <div className="space-y-3">
            {/* Beans relay card */}
            <div className="panel border-2 border-[--color-ink] shadow-[3px_3px_0px_var(--color-ink)] overflow-hidden" style={{ backgroundColor: '#a855f7' }}>
              <div className="p-4 text-center">
                <div className="text-4xl mb-2">☕</div>
                <p className="font-display text-xl text-white">BEANS</p>
                <p className="font-display text-sm text-white/80">YOUR PERSONAL RELAY</p>
                <p className="text-[10px] font-mono text-white/50 mt-2 leading-relaxed">
                  Only Beans sends messages outside the<br/>Command Center. Other agents relay<br/>through Beans using their names.
                </p>
              </div>
            </div>

            {/* How it works */}
            <div className="border-2 border-[--color-ink] shadow-[3px_3px_0px_var(--color-ink)] p-3" style={{ backgroundColor: '#1a1d27' }}>
              <p className="font-display text-xs text-[--color-yellow] mb-2">HOW IT WORKS</p>
              <div className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <span className="text-[9px]">🔍</span>
                  <p className="text-[10px] font-mono text-white/60"><strong className="text-[#E41937]">Hawk</strong> finds a bug → Beans tells you on Telegram</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[9px]">💰</span>
                  <p className="text-[10px] font-mono text-white/60"><strong className="text-[#F9D616]">Tracker</strong> finds a bounty → Beans sends the details</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[9px]">🎯</span>
                  <p className="text-[10px] font-mono text-white/60"><strong className="text-[#3b82f6]">Chief</strong> writes standup → Beans emails the summary</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[9px]">☕</span>
                  <p className="text-[10px] font-mono text-white/60"><strong className="text-[#a855f7]">Beans</strong> says take a break → WhatsApp ping</p>
                </div>
              </div>
            </div>

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
