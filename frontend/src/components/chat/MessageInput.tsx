import { useState, useRef, useCallback, useEffect } from 'react';
import { AGENT_NAMES, getAgentColor, type ChatMessage } from '../../types';
import type { OutgoingMessagePayload } from '../../api/hooks';

interface MessageInputProps {
  onSend: (payload: string | OutgoingMessagePayload) => void;
  disabled?: boolean;
  replyTo?: ChatMessage | null;
  onCancelReply?: () => void;
  pendingMention?: string | null;
  onMentionConsumed?: () => void;
}

export default function MessageInput({ onSend, disabled, replyTo, onCancelReply, pendingMention, onMentionConsumed }: MessageInputProps) {
  const [value, setValue] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const filteredAgents = AGENT_NAMES.filter((name) =>
    name.toLowerCase().startsWith(mentionFilter.toLowerCase())
  );

  useEffect(() => {
    if (replyTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyTo]);

  useEffect(() => {
    if (pendingMention) {
      setValue(`@${pendingMention} `);
      onMentionConsumed?.();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [pendingMention, onMentionConsumed]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setValue(text);

    const cursorPos = e.target.selectionStart;
    const textBefore = text.slice(0, cursorPos);
    const atMatch = textBefore.match(/@(\w*)$/);

    if (atMatch) {
      setShowMentions(true);
      setMentionFilter(atMatch[1]);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = useCallback(
    (name: string) => {
      const cursorPos = inputRef.current?.selectionStart || value.length;
      const textBefore = value.slice(0, cursorPos);
      const textAfter = value.slice(cursorPos);
      const atIndex = textBefore.lastIndexOf('@');
      const newText = textBefore.slice(0, atIndex) + `@${name} ` + textAfter;

      setValue(newText);
      setShowMentions(false);
      inputRef.current?.focus();
    },
    [value]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      setShowMentions(false);
      if (replyTo) onCancelReply?.();
    }
  };

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;

    let finalContent = trimmed;
    if (replyTo?.isAgent && !trimmed.startsWith('@')) {
      finalContent = `@${replyTo.authorName} ${trimmed}`;
    }

    if (replyTo) {
      const agentContent = `${finalContent}

[Replying to ${replyTo.isAgent ? replyTo.authorName : 'the previous message'}]
${replyTo.content.slice(0, 900)}`;
      onSend({ displayContent: finalContent, agentContent });
    } else {
      onSend(finalContent);
    }
    setValue('');
    setShowMentions(false);
    onCancelReply?.();
  };

  return (
    <div className="relative z-20" style={{ borderTop: '2px solid rgba(242,244,243,0.05)', backgroundColor: '#1A202C' }}>
      
      {/* Reply preview bar */}
      {replyTo && (
        <div
          className="flex items-center justify-between px-4 py-2 text-sm"
          style={{
            backgroundColor: '#1E2530',
            borderBottom: `2px solid ${replyTo.isAgent ? (replyTo.agentColor || '#2BB6B3') : '#475569'}`,
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-1.5 h-6 shrink-0"
              style={{ backgroundColor: replyTo.isAgent ? (replyTo.agentColor || '#2BB6B3') : '#475569' }}
            />
            <div className="min-w-0">
              <span
                className="text-[10px] uppercase font-bold tracking-wider"
                style={{ color: replyTo.isAgent ? (replyTo.agentColor || '#F2F4F3') : '#E2E8F0', fontFamily: '"Space Mono", monospace' }}
              >
                {replyTo.isAgent ? replyTo.authorName : 'YOU'}
              </span>
              <p className="text-[11px] font-mono truncate" style={{ color: 'rgba(242,244,243,0.6)' }}>
                {replyTo.content.slice(0, 80)}{replyTo.content.length > 80 ? '...' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onCancelReply}
            className="text-xs font-mono px-2 py-1 transition-opacity hover:opacity-60 shrink-0"
            style={{ color: 'rgba(242,244,243,0.5)' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* @mention dropdown */}
      {showMentions && filteredAgents.length > 0 && (
        <div 
          className="absolute bottom-full left-4 right-4 mb-3 rounded border-2 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
          style={{ backgroundColor: '#1E2530', borderColor: '#2BB6B3', boxShadow: '0 -4px 20px rgba(0,0,0,0.5)' }}
        >
          <div className="px-3 py-1.5 border-b" style={{ borderColor: 'rgba(43,182,179,0.3)', backgroundColor: 'rgba(43,182,179,0.1)' }}>
            <span className="text-[9px] uppercase font-bold tracking-wider" style={{ color: '#2BB6B3', fontFamily: '"Space Mono", monospace' }}>Select Agent</span>
          </div>
          {filteredAgents.map((name) => {
            const agentColor = getAgentColor(name) || '#F2F4F3';
            return (
              <button
                key={name}
                onClick={() => insertMention(name)}
                className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors border-b last:border-b-0 hover:bg-white/5 active:bg-white/10"
                style={{ borderColor: 'rgba(242,244,243,0.05)' }}
              >
                <div
                  className="w-5 h-5 flex items-center justify-center text-[10px] font-bold"
                  style={{ backgroundColor: `${agentColor}33`, color: agentColor, border: `1px solid ${agentColor}` }}
                >
                  {name[0]}
                </div>
                <span className="text-[12px] font-mono font-bold tracking-wider" style={{ color: '#F2F4F3' }}>
                  {name}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-end gap-3 p-4 bg-[#1A202C]">
        <span className="font-bold text-lg pb-1.5 font-mono" style={{ color: '#2BB6B3' }}>$</span>
        <textarea
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={replyTo ? `Reply to ${replyTo.isAgent ? replyTo.authorName : 'yourself'}...` : 'Enter command... (@ to mention agent)'}
          disabled={disabled}
          rows={1}
          className="flex-1 text-sm font-mono resize-none focus:outline-none disabled:opacity-50 min-h-[38px] max-h-[120px] py-2 px-3 rounded shadow-inner"
          style={{
            backgroundColor: '#151A21',
            color: '#F2F4F3',
            border: '1px solid rgba(242,244,243,0.1)',
            fieldSizing: 'content',
            caretColor: '#2BB6B3',
          } as React.CSSProperties}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className="px-6 py-2.5 rounded font-bold text-[11px] uppercase disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          style={{ 
            backgroundColor: '#2BB6B3', 
            color: '#151A21', 
            boxShadow: '2px 2px 0px rgba(10,14,18,0.7)',
            transform: 'translateY(-1px)',
            fontFamily: '"Space Mono", monospace'
          }}
        >
          SEND
        </button>
      </div>
    </div>
  );
}
