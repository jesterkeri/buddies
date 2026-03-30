import { useState, useRef, useCallback, useEffect } from 'react';
import { AGENT_NAMES, getAgentColor, type ChatMessage } from '../../types';

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  replyTo?: ChatMessage | null;
  onCancelReply?: () => void;
}

export default function MessageInput({ onSend, disabled, replyTo, onCancelReply }: MessageInputProps) {
  const [value, setValue] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const filteredAgents = AGENT_NAMES.filter((name) =>
    name.toLowerCase().startsWith(mentionFilter.toLowerCase())
  );

  // Focus input when replying
  useEffect(() => {
    if (replyTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyTo]);

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

    // If replying to an agent, prefix with @mention if not already there
    let finalContent = trimmed;
    if (replyTo?.isAgent && !trimmed.startsWith('@')) {
      finalContent = `@${replyTo.authorName} ${trimmed}`;
    }

    onSend(finalContent);
    setValue('');
    setShowMentions(false);
    onCancelReply?.();
  };

  return (
    <div className="relative" style={{ borderTop: '3px solid #2BB6B3', backgroundColor: '#1A1A2E' }}>
      {/* Reply preview bar */}
      {replyTo && (
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{
            backgroundColor: '#252540',
            borderBottom: `2px solid ${replyTo.isAgent ? (replyTo.agentColor || '#64748b') : '#2BB6B3'}`,
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-1 h-8 shrink-0 rounded"
              style={{ backgroundColor: replyTo.isAgent ? (replyTo.agentColor || '#64748b') : '#2BB6B3' }}
            />
            <div className="min-w-0">
              <span
                className="text-[10px] font-display uppercase tracking-wider"
                style={{ color: replyTo.isAgent ? (replyTo.agentColor || '#F2F4F3') : '#2BB6B3' }}
              >
                {replyTo.isAgent ? replyTo.authorName : 'YOU'}
              </span>
              <p className="text-[11px] font-mono truncate" style={{ color: 'rgba(242,244,243,0.5)' }}>
                {replyTo.content.slice(0, 80)}{replyTo.content.length > 80 ? '...' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onCancelReply}
            className="text-xs font-mono px-2 py-1 hover:bg-white/10 transition-colors shrink-0"
            style={{ color: 'rgba(242,244,243,0.4)' }}
          >
            x
          </button>
        </div>
      )}

      {/* @mention dropdown */}
      {showMentions && filteredAgents.length > 0 && (
        <div className="absolute bottom-full left-3 right-3 mb-1 bg-[--color-slate] border-4 border-[--color-ink] shadow-[4px_4px_0px_var(--color-ink)] overflow-hidden z-50">
          {filteredAgents.map((name) => (
            <button
              key={name}
              onClick={() => insertMention(name)}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[--color-paper]/10 transition-colors text-left border-b border-[--color-paper]/10 last:border-b-0"
            >
              <div
                className="w-6 h-6 border-2 border-[--color-ink] flex items-center justify-center text-[10px] font-display text-[--color-ink]"
                style={{ backgroundColor: getAgentColor(name) }}
              >
                {name[0]}
              </div>
              <span className="text-sm font-mono font-bold text-[--color-paper] uppercase tracking-wider">
                {name}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-3 p-4">
        <span className="font-bold text-xl pb-1" style={{ color: '#2BB6B3' }}>&gt;</span>
        <textarea
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={replyTo ? `Reply to ${replyTo.isAgent ? replyTo.authorName : 'yourself'}...` : 'Enter transmission... (@ to mention agent)'}
          disabled={disabled}
          rows={1}
          className="flex-1 border-none text-sm font-mono resize-none focus:outline-none disabled:opacity-50 min-h-[28px] max-h-[120px] py-1.5 px-3 rounded"
          style={{
            backgroundColor: '#252540',
            color: '#F2F4F3',
            fieldSizing: 'content',
            caretColor: '#2BB6B3',
          } as React.CSSProperties}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className="px-5 py-2 font-display text-sm uppercase border-2 border-[--color-ink] shadow-[3px_3px_0px_var(--color-ink)] hover:shadow-[1px_1px_0px_var(--color-ink)] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          style={{ backgroundColor: '#E41937', color: '#F2F4F3' }}
        >
          TRANSMIT
        </button>
      </div>
    </div>
  );
}
