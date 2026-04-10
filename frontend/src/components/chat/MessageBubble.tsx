import type React from 'react';
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

// Tiny safe markdown renderer — no dependencies, no dangerouslySetInnerHTML.
// Handles: **bold**, *italic*, `code`, [text](url), bare URLs, bullets, line breaks.
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  // Strip HTML tags first (defensive — in case scraped content leaks through)
  const cleaned = text.replace(/<[^>]*>/g, '');
  const nodes: React.ReactNode[] = [];
  let idx = 0;
  // Order matters: links first, then bold, then italic, then code, then bare URLs
  const re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|\*([^*\n]+)\*|`([^`]+)`|(https?:\/\/[^\s<>"']+)/g;
  let m: RegExpExecArray | null;
  let pos = 0;
  while ((m = re.exec(cleaned)) !== null) {
    if (m.index > pos) {
      nodes.push(cleaned.slice(pos, m.index));
    }
    if (m[1] && m[2]) {
      // [text](url)
      nodes.push(
        <a key={`${keyPrefix}-${idx++}`} href={m[2]} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80" style={{ color: '#2BB6B3' }}>
          {m[1]}
        </a>
      );
    } else if (m[3]) {
      // **bold**
      nodes.push(<strong key={`${keyPrefix}-${idx++}`}>{m[3]}</strong>);
    } else if (m[4]) {
      // *italic*
      nodes.push(<em key={`${keyPrefix}-${idx++}`}>{m[4]}</em>);
    } else if (m[5]) {
      // `code`
      nodes.push(
        <code key={`${keyPrefix}-${idx++}`} className="px-1 py-0.5 text-xs" style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '3px' }}>
          {m[5]}
        </code>
      );
    } else if (m[6]) {
      // bare URL
      nodes.push(
        <a key={`${keyPrefix}-${idx++}`} href={m[6]} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80 break-all" style={{ color: '#2BB6B3' }}>
          {m[6]}
        </a>
      );
    }
    pos = m.index + m[0].length;
  }
  if (pos < cleaned.length) nodes.push(cleaned.slice(pos));
  return nodes;
}
function renderMarkdown(text: string): React.ReactNode {
  // Split into lines, render bullets and headings, paragraph breaks
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const trimmed = line.trimStart();
    // Heading
    if (/^#{1,6}\s/.test(trimmed)) {
      const m = trimmed.match(/^(#{1,6})\s+(.*)/);
      if (m) {
        return (
          <div key={i} className="font-bold mt-2 mb-1" style={{ fontSize: m[1].length === 1 ? '1.05em' : '1em' }}>
            {renderInline(m[2], `h-${i}`)}
          </div>
        );
      }
    }
    // Bullet
    if (/^[-*]\s/.test(trimmed)) {
      const indent = line.length - trimmed.length;
      return (
        <div key={i} className="flex" style={{ paddingLeft: `${indent * 0.5 + 0.5}em` }}>
          <span className="mr-1.5 opacity-60">•</span>
          <span className="flex-1">{renderInline(trimmed.slice(2), `b-${i}`)}</span>
        </div>
      );
    }
    // Empty line (paragraph break)
    if (trimmed === '') {
      return <div key={i} className="h-2" />;
    }
    return <div key={i}>{renderInline(line, `l-${i}`)}</div>;
  });
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
            className="px-3 py-2 text-sm font-mono leading-relaxed break-words"
            style={{
              backgroundColor: '#1A3A3A',
              color: '#F2F4F3',
              borderRadius: '12px 12px 2px 12px',
              border: '1px solid rgba(43,182,179,0.3)',
            }}
          >
            {renderMarkdown(content)}
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
          className="px-3 py-2 text-sm font-mono leading-relaxed break-words"
          style={{
            backgroundColor: '#1A1A2E',
            color: '#E8E8E8',
            borderRadius: '12px 12px 12px 2px',
            borderLeft: `3px solid ${agentColor || '#64748b'}`,
          }}
        >
          {renderMarkdown(content)}
        </div>
      </div>
    </div>
  );
}
