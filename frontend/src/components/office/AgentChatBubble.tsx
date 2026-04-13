import { useState, useRef, useEffect } from 'react';
import { useSendMessage } from '../../api/hooks';
import { getAgentColor } from '../../types';

interface AgentChatBubbleProps {
  agentName: string;
  /** Position in CSS pixels relative to the HQ container */
  x: number;
  y: number;
  containerWidth: number;
  containerHeight: number;
  onClose: () => void;
  onOpenComms?: (agentName: string) => void;
}

const BUBBLE_WIDTH = 260;

export default function AgentChatBubble({
  agentName,
  x,
  y,
  containerWidth,
  containerHeight,
  onClose,
  onOpenComms,
}: AgentChatBubbleProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ from: string; text: string }[]>([]);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const sendMessage = useSendMessage();
  const color = getAgentColor(agentName) || '#2BB6B3';

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setMessages((prev) => [...prev, { from: 'You', text }]);
    setInput('');
    setSending(true);

    try {
      const data: any = await sendMessage.mutateAsync(`@${agentName} ${text}`);
      const response =
        data?.agentResponse?.text ||
        data?.data?.agentResponse?.text ||
        data?.response?.text ||
        data?.text ||
        '';

      setMessages((prev) => [
        ...prev,
        {
          from: agentName,
          text: response || `${agentName} did not return a usable response. Open COMMS for the full thread.`,
        },
      ]);
    } catch (err: any) {
      const message =
        err?.serverError ||
        err?.message ||
        'Could not reach agent.';
      setMessages((prev) => [...prev, { from: agentName, text: message }]);
    } finally {
      setSending(false);
    }
  };

  // Clamping X so the bubble doesn't go off screen
  const halfWidth = BUBBLE_WIDTH / 2;
  const clampedX = Math.max(halfWidth + 8, Math.min(x, containerWidth - halfWidth - 8));
  
  // Calculate tail offset based on clamping translation
  const tailOffset = x - clampedX; 

  const bubbleStyle: React.CSSProperties = {
    position: 'absolute',
    left: clampedX,
    top: Math.max(20, y), 
    transform: 'translate(-50%, calc(-100% - 10px))', 
    zIndex: 100,
    width: BUBBLE_WIDTH,
  };

  return (
    <div style={bubbleStyle} className="animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div
        className="rounded shadow-2xl flex flex-col relative"
        style={{
          backgroundColor: '#1E2530',
          borderColor: color,
          borderWidth: '2px',
          boxShadow: '4px 4px 0 rgba(10, 14, 18, 0.6)', 
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-1.5 border-b"
          style={{ borderColor: `${color}44`, backgroundColor: `${color}1A` }}
        >
          <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color, fontFamily: '"Space Mono", monospace' }}>
            {agentName}
          </span>
          <button
            onClick={onClose}
            className="text-[12px] font-mono hover:opacity-60 transition-opacity"
            style={{ color: 'rgba(242,244,243,0.6)' }}
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="max-h-40 overflow-y-auto px-3 py-2 space-y-2">
          {messages.length === 0 && (
            <p className="text-[10px] font-mono py-1" style={{ color: 'rgba(242,244,243,0.4)' }}>
              Say something to {agentName}...
            </p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className="leading-snug">
              <span
                className="text-[9px] uppercase font-bold mr-2"
                style={{ color: msg.from === 'You' ? 'rgba(242,244,243,0.8)' : color, fontFamily: '"Space Mono", monospace' }}
              >
                {msg.from}:
              </span>
              <span className="text-[11px] font-mono" style={{ color: '#F2F4F3' }}>
                {msg.text}
              </span>
            </div>
          ))}
          {sending && (
            <div className="flex gap-2 items-center py-1">
              <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: color }} />
              <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: color, animationDelay: '0.1s' }} />
              <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: color, animationDelay: '0.2s' }} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex border-t" style={{ borderColor: `${color}44` }}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={`Talk to ${agentName}...`}
            className="flex-1 px-3 py-2.5 text-[11px] font-mono bg-transparent border-none outline-none"
            style={{ color: '#F2F4F3', caretColor: color }}
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="px-3 py-2.5 text-[10px] font-bold uppercase transition-opacity disabled:opacity-30 hover:opacity-80"
            style={{ color, fontFamily: '"Space Mono", monospace' }}
          >
            SEND
          </button>
        </div>

        {onOpenComms && (
          <div className="flex justify-end border-t px-3 py-1.5" style={{ borderColor: `${color}33`, backgroundColor: `${color}0D` }}>
            <button
              onClick={() => onOpenComms(agentName)}
              className="text-[9px] font-bold uppercase flex items-center gap-1 hover:opacity-80 transition-opacity"
              style={{ color, fontFamily: '"Space Mono", monospace' }}
            >
              [ Open Full Comms ]
            </button>
          </div>
        )}
      </div>

      {/* Arrow pointing down to agent */}
      <div 
        className="absolute w-0 h-0"
        style={{
          left: `calc(50% + ${tailOffset}px)`,
          bottom: '-10px',
          transform: 'translateX(-50%)',
          borderLeft: '10px solid transparent',
          borderRight: '10px solid transparent',
          borderTop: `10px solid ${color}`,
        }}
      />
    </div>
  );
}
