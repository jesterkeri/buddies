import { useState, useRef, useCallback } from 'react';
import { AGENT_NAMES, getAgentColor } from '../../types';

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export default function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [value, setValue] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const filteredAgents = AGENT_NAMES.filter((name) =>
    name.toLowerCase().startsWith(mentionFilter.toLowerCase())
  );

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
    }
  };

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    setShowMentions(false);
  };

  return (
    <div className="relative border-t-2 border-[--color-paper]/10 p-3">
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

      <div className="flex items-end gap-2">
        <span className="text-[--color-yellow] font-bold text-lg pb-1">&gt;</span>
        <textarea
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Enter transmission... (@ to mention agent)"
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent border-none text-sm font-mono text-[--color-paper] placeholder-[--color-paper]/20 resize-none focus:outline-none disabled:opacity-50 min-h-[24px] max-h-[120px]"
          style={{ fieldSizing: 'content' } as React.CSSProperties}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className="px-4 py-1.5 bg-[--color-red] text-[--color-ink] font-display text-sm uppercase border-2 border-[--color-ink] shadow-[3px_3px_0px_var(--color-ink)] hover:shadow-[1px_1px_0px_var(--color-ink)] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          TRANSMIT
        </button>
      </div>
    </div>
  );
}
