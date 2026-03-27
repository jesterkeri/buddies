import type { ChatMessage } from '../../types';
import AgentAvatar from '../shared/AgentAvatar';

interface MessageBubbleProps {
  message: ChatMessage;
  showHeader: boolean;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function MessageBubble({ message, showHeader }: MessageBubbleProps) {
  const { authorName, isAgent, content, timestamp, agentColor } = message;

  return (
    <div className={`flex gap-3 px-4 ${showHeader ? 'pt-3' : 'pt-0.5'}`}>
      {showHeader ? (
        isAgent ? (
          <AgentAvatar name={authorName} size="md" />
        ) : (
          <div className="w-10 h-10 border-2 border-[--color-ink] bg-[--color-paper] flex items-center justify-center text-sm font-display text-[--color-ink] shrink-0" style={{ boxShadow: '2px 2px 0px var(--color-ink)' }}>
            U
          </div>
        )
      ) : (
        <div className="w-10 shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        {showHeader && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span
              className="text-sm font-display uppercase tracking-wider"
              style={{ color: isAgent ? agentColor : 'var(--color-paper)' }}
            >
              {isAgent ? authorName : 'OPERATOR'}
            </span>
            <span className="text-[9px] font-mono text-[--color-paper]/30">
              [{formatTime(timestamp)}]
            </span>
          </div>
        )}
        <p className="text-sm font-mono text-[--color-paper]/90 leading-relaxed whitespace-pre-wrap break-words">
          {content}
        </p>
      </div>
    </div>
  );
}
