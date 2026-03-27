import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../../types';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

export default function MessageList({ messages, isLoading }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      isAtBottomRef.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 50;
    };
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isAtBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="font-mono text-sm text-[--color-teal]">// LOADING TRANSMISSION LOG...</p>
          <div className="cursor-blink mx-auto mt-2" />
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto pb-4">
      {messages.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center px-8">
            <p className="font-display text-2xl text-[--color-yellow]" style={{ transform: 'rotate(-2deg)' }}>
              CHANNEL OPEN
            </p>
            <p className="font-mono text-xs text-[--color-paper]/40 mt-3 leading-relaxed">
              // TEAM_COMMS initialized<br />
              // 5 agents standing by<br />
              // Type a message to begin transmission<br />
              // Use @AgentName to address specific agent
            </p>
          </div>
        </div>
      )}

      {messages.map((msg, i) => {
        const prev = messages[i - 1];
        const showHeader =
          !prev ||
          prev.authorId !== msg.authorId ||
          msg.timestamp - prev.timestamp > 120_000;

        return <MessageBubble key={msg.id} message={msg} showHeader={showHeader} />;
      })}

      <TypingIndicator />
    </div>
  );
}
