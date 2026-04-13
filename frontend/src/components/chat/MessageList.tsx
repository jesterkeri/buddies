import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../../types';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onReply?: (message: ChatMessage) => void;
}

export default function MessageList({ messages, isLoading, onReply }: MessageListProps) {
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
          <div className="text-center px-8 border-2 border-dashed rounded py-6 opacity-60" style={{ borderColor: 'rgba(242,244,243,0.1)' }}>
            <p className="font-display text-[14px] font-bold tracking-widest uppercase mb-1" style={{ color: '#2BB6B3' }}>
              Channel Open
            </p>
            <p className="font-mono text-[10px] leading-relaxed" style={{ color: 'rgba(242,244,243,0.4)' }}>
              Secure TEAM_COMMS initialized.<br />
              All agents standing by.<br />
              Transmit a command below to begin.<br />
              Use <span style={{ color: '#2BB6B3' }}>@AgentName</span> to tag operators.
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

        return <MessageBubble key={msg.id} message={msg} showHeader={showHeader} onReply={onReply} />;
      })}

      <TypingIndicator />
    </div>
  );
}
