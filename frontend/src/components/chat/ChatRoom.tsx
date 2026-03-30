import { useState } from 'react';
import { useTeamSession, useMessages, useSendMessage } from '../../api/hooks';
import type { ChatMessage } from '../../types';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

export default function ChatRoom() {
  const { data: session, isLoading: sessionLoading } = useTeamSession();
  const { data: messages, isLoading: messagesLoading } = useMessages(session?.channelId);
  const sendMessage = useSendMessage(session?.channelId);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);

  if (sessionLoading) {
    return (
      <div className="h-full panel panel-terminal flex items-center justify-center">
        <div className="text-center">
          <p className="font-display text-xl" style={{ color: '#2BB6B3' }}>CONNECTING...</p>
          <p className="font-mono text-xs mt-2" style={{ color: 'rgba(242,244,243,0.4)' }}>// Establishing secure channel</p>
          <div className="cursor-blink mx-auto mt-3" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="h-full panel panel-terminal flex items-center justify-center">
        <div className="text-center">
          <p className="font-display text-2xl" style={{ color: '#E41937' }}>NO SIGNAL</p>
          <p className="font-mono text-xs mt-2" style={{ color: 'rgba(242,244,243,0.4)' }}>
            // Make sure backend is running at localhost:3000
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full panel panel-terminal flex flex-col">
      <div className="tape tape-tr" />
      <div className="panel-header">
        <span>TEAM_COMMS</span>
        <span className="badge badge-live" style={{ backgroundColor: '#E41937', color: '#F2F4F3' }}>● LIVE</span>
      </div>

      <div className="flex items-center gap-4 px-4 py-1.5 border-b-2" style={{ borderColor: 'rgba(242,244,243,0.15)', color: 'rgba(242,244,243,0.5)' }}>
        <span className="text-[10px] font-mono">AGENTS: 5</span>
        <span className="text-[10px] font-mono" style={{ color: '#2BB6B3', marginLeft: 'auto' }}>SECURE CONNECTION</span>
      </div>

      <MessageList
        messages={messages || []}
        isLoading={messagesLoading}
        onReply={setReplyTo}
      />

      <MessageInput
        onSend={(content) => sendMessage.mutate(content)}
        disabled={false}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  );
}
