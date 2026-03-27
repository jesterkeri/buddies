import { useTeamChannel, useMessages, useSendMessage } from '../../api/hooks';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

export default function ChatRoom() {
  const { data: channelId, isLoading: channelLoading } = useTeamChannel();
  const { data: messages, isLoading: messagesLoading } = useMessages(channelId);
  const sendMessage = useSendMessage(channelId);

  if (channelLoading) {
    return (
      <div className="h-full panel panel-terminal flex items-center justify-center">
        <div className="text-center">
          <p className="font-display text-xl text-[--color-teal]">CONNECTING...</p>
          <p className="font-mono text-xs text-[--color-paper]/50 mt-2">// Establishing secure channel</p>
          <div className="cursor-blink mx-auto mt-3" />
        </div>
      </div>
    );
  }

  if (!channelId) {
    return (
      <div className="h-full panel panel-terminal flex items-center justify-center">
        <div className="text-center">
          <p className="font-display text-2xl text-[--color-red]">NO SIGNAL</p>
          <p className="font-mono text-xs text-[--color-paper]/50 mt-2">
            // Waiting for CHIEF to establish team channel<br />
            // Make sure backend is running
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
        <span className="badge badge-live">● LIVE</span>
      </div>

      <div className="flex items-center gap-4 px-4 py-1.5 border-b-2 border-[--color-paper]/10 text-[10px] font-mono text-[--color-paper]/40">
        <span>CHANNEL: team_chat</span>
        <span>AGENTS: 5</span>
        <span>ENCRYPTION: ACTIVE</span>
        <span className="ml-auto text-[--color-teal]">SECURE CONNECTION</span>
      </div>

      <MessageList messages={messages || []} isLoading={messagesLoading} />

      <MessageInput
        onSend={(content) => sendMessage.mutate(content)}
        disabled={sendMessage.isPending}
      />
    </div>
  );
}
