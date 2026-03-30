import type { ChatMessage } from '../../types';
import AgentAvatar from '../shared/AgentAvatar';

interface MessageBubbleProps {
  message: ChatMessage;
  showHeader: boolean;
  onReply?: (message: ChatMessage) => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageBubble({ message, showHeader, onReply }: MessageBubbleProps) {
  const { authorName, isAgent, content, timestamp, agentColor } = message;

  const replyButton = onReply ? (
    <button
      onClick={() => onReply(message)}
      className="opacity-0 group-hover:opacity-100 text-[9px] font-mono px-1.5 py-0.5 transition-opacity hover:bg-white/10"
      style={{ color: 'rgba(242,244,243,0.5)' }}
    >
      reply
    </button>
  ) : null;

  // User messages on right
  if (!isAgent) {
    return (
      <div className={`group flex justify-end px-4 ${showHeader ? 'pt-3' : 'pt-1'}`}>
        <div className="max-w-[75%]">
          {showHeader && (
            <div className="flex items-baseline justify-end gap-2 mb-1">
              {replyButton}
              <span className="text-[9px] font-mono" style={{ color: 'rgba(242,244,243,0.4)' }}>
                {formatTime(timestamp)}
              </span>
              <span className="text-xs font-display uppercase tracking-wider" style={{ color: '#2BB6B3' }}>
                YOU
              </span>
            </div>
          )}
          <div
            className="px-3 py-2 text-sm font-mono leading-relaxed whitespace-pre-wrap break-words"
            style={{
              backgroundColor: '#1A3A3A',
              color: '#F2F4F3',
              borderRadius: '12px 12px 2px 12px',
              border: '1px solid rgba(43,182,179,0.3)',
            }}
          >
            {content}
          </div>
        </div>
      </div>
    );
  }

  // Agent messages on left
  return (
    <div className={`group flex gap-2.5 px-4 ${showHeader ? 'pt-3' : 'pt-1'}`}>
      {showHeader ? (
        <AgentAvatar name={authorName} size="md" />
      ) : (
        <div className="w-10 shrink-0" />
      )}
      <div className="max-w-[75%]">
        {showHeader && (
          <div className="flex items-baseline gap-2 mb-1">
            <span
              className="text-xs font-display uppercase tracking-wider"
              style={{ color: agentColor || '#F2F4F3' }}
            >
              {authorName}
            </span>
            <span className="text-[9px] font-mono" style={{ color: 'rgba(242,244,243,0.4)' }}>
              {formatTime(timestamp)}
            </span>
            {replyButton}
          </div>
        )}
        <div
          className="px-3 py-2 text-sm font-mono leading-relaxed whitespace-pre-wrap break-words"
          style={{
            backgroundColor: '#1A1A2E',
            color: '#E8E8E8',
            borderRadius: '12px 12px 12px 2px',
            borderLeft: `3px solid ${agentColor || '#64748b'}`,
          }}
        >
          {content}
        </div>
      </div>
    </div>
  );
}
