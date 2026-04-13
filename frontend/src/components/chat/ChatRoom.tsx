import { useState, useEffect } from 'react';
import { useTeamSession, useMessages, useSendMessage, useAgents, useTypingAgent, getSessions, getActiveSessionId, deleteSession, type OutgoingMessagePayload } from '../../api/hooks';
import { useSession } from '../session/sessionStore';
import type { ChatMessage } from '../../types';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';

interface ChatRoomProps {
  pendingMention?: string | null;
  onMentionConsumed?: () => void;
}

export default function ChatRoom({ pendingMention, onMentionConsumed }: ChatRoomProps = {}) {
  const [viewingId, setViewingId] = useState<string | undefined>(undefined);
  const [showHistory, setShowHistory] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [, forceRender] = useState(0);

  const session = useSession();
  const { data: agents } = useAgents();
  const { data: teamSession, isLoading: sessionLoading } = useTeamSession();
  const { data: messages, isLoading: messagesLoading } = useMessages(viewingId);
  const sendMessage = useSendMessage();
  const typingAgent = useTypingAgent();

  const sessions = getSessions();
  const activeId = getActiveSessionId();
  const isViewingPast = !!viewingId && viewingId !== activeId;

  // Reset to live view when a new session starts
  useEffect(() => {
    if (session.active) {
      setViewingId(undefined);
      setShowHistory(false);
    }
  }, [session.active, session.startTime]);

  // Determine badge state
  const badgeLabel = session.active ? 'LIVE' : session.endedAt ? 'ENDED' : 'STANDBY';
  const badgeColor = session.active ? '#E41937' : session.endedAt ? 'rgba(242,244,243,0.4)' : 'rgba(242,244,243,0.3)';

  // Can user send messages? Only in active session, not viewing history
  const canSend = session.active && !isViewingPast;

  if (sessionLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#151A21]">
        <div className="text-center">
          <p className="font-display text-xl font-bold tracking-widest uppercase" style={{ color: '#2BB6B3' }}>Connecting</p>
          <div className="flex justify-center gap-2 mt-4">
            <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: '#2BB6B3' }} />
            <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: '#2BB6B3', animationDelay: '0.1s' }} />
            <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: '#2BB6B3', animationDelay: '0.2s' }} />
          </div>
        </div>
      </div>
    );
  }

  if (!teamSession) {
    return (
      <div className="h-full flex items-center justify-center bg-[#151A21]">
        <div className="text-center">
          <p className="font-display text-2xl font-bold tracking-widest uppercase" style={{ color: '#E41937' }}>Offline</p>
          <p className="font-mono text-[10px] mt-2 opacity-60" style={{ color: '#F2F4F3' }}>
            System disabled or offline.
          </p>
        </div>
      </div>
    );
  }

  const handleViewSession = (sessionId: string) => {
    setViewingId(sessionId === activeId ? undefined : sessionId);
    setShowHistory(false);
  };

  const handleBackToLive = () => {
    setViewingId(undefined);
  };

  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    deleteSession(sessionId);
    if (viewingId === sessionId) setViewingId(undefined);
    forceRender((n) => n + 1);
  };

  const pastSessions = sessions.filter((s) => s.id !== activeId);

  return (
    <div className="h-full flex flex-col relative" style={{ backgroundColor: '#151A21' }}>
      <div 
        className="flex items-center justify-between px-4 py-2 border-b" 
        style={{ borderColor: 'rgba(242,244,243,0.05)', backgroundColor: '#1E2530' }}
      >
        <span className="font-display text-[12px] font-bold uppercase tracking-widest" style={{ color: '#F2F4F3' }}>
          TEAM_COMMS
        </span>
        <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded flex items-center gap-1.5" style={{ backgroundColor: badgeColor, color: '#F2F4F3', fontFamily: '"Space Mono", monospace' }}>
          <div className="w-1 h-1 rounded-full bg-white opacity-80" />
          {badgeLabel}
        </span>
      </div>

      {/* Session bar */}
      <div className="flex items-center gap-3 px-4 py-1.5 border-b shadow-sm" style={{ borderColor: 'rgba(242,244,243,0.05)', backgroundColor: '#1A202C' }}>
        {pastSessions.length > 0 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-[9px] font-bold tracking-wider uppercase px-2 py-1 rounded border transition-colors cursor-pointer hover:bg-white/5"
            style={{ borderColor: 'rgba(242,244,243,0.2)', color: 'rgba(242,244,243,0.6)', fontFamily: '"Space Mono", monospace' }}
          >
            HISTORY ({pastSessions.length})
          </button>
        )}
        {isViewingPast && (
          <button
            onClick={handleBackToLive}
            className="text-[9px] font-bold tracking-wider uppercase px-2 py-1 rounded transition-colors cursor-pointer"
            style={{ backgroundColor: 'rgba(228,25,55,0.1)', color: '#E41937', fontFamily: '"Space Mono", monospace' }}
          >
            BACK TO LIVE
          </button>
        )}
        <span className="text-[10px] font-mono ml-auto" style={{ color: 'rgba(242,244,243,0.4)' }}>
          AGENTS: {agents?.length ?? '...'}
        </span>
        <span className="text-[10px] font-mono" style={{ color: session.active ? '#2BB6B3' : 'rgba(242,244,243,0.3)' }}>
          {session.active ? 'SECURE CHANNEL' : session.endedAt ? 'CHANNEL CLOSED' : 'AWAITING CONNECTION'}
        </span>
      </div>

      {/* Viewing past session banner */}
      {isViewingPast && (
        <div className="px-4 py-1.5 border-b text-center" style={{ borderColor: 'rgba(228,25,55,0.1)', backgroundColor: 'rgba(228,25,55,0.05)' }}>
          <span className="text-[10px] uppercase font-bold tracking-widest" style={{ color: '#E41937', fontFamily: '"Space Mono", monospace' }}>
            VIEWING PAST SESSION — READ ONLY
          </span>
        </div>
      )}

      {/* Session history dropdown */}
      {showHistory && (
        <div
          className="absolute left-4 top-[74px] z-50 rounded border-2 shadow-2xl max-h-60 overflow-y-auto w-72 animate-in fade-in slide-in-from-top-2 duration-150"
          style={{ backgroundColor: '#1E2530', borderColor: 'rgba(242,244,243,0.1)', boxShadow: '0 8px 30px rgba(0,0,0,0.6)' }}
        >
          {pastSessions.slice().reverse().map((s) => (
            <div
              key={s.id}
              onClick={() => handleViewSession(s.id)}
              className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-white/5 transition-colors border-b last:border-b-0"
              style={{ borderColor: 'rgba(242,244,243,0.05)' }}
            >
              <div>
                <p className="text-[11px] font-mono font-bold tracking-wider" style={{ color: viewingId === s.id ? '#2BB6B3' : 'rgba(242,244,243,0.8)' }}>
                  {s.label}
                </p>
                <p className="text-[9px] font-mono" style={{ color: 'rgba(242,244,243,0.4)' }}>
                  {s.messageCount} messages
                </p>
              </div>
              <button
                onClick={(e) => handleDeleteSession(e, s.id)}
                className="text-[12px] font-mono px-2 hover:opacity-80 transition-opacity"
                style={{ color: '#E41937' }}
                title="Delete session"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <MessageList
        messages={messages || []}
        isLoading={messagesLoading}
        onReply={setReplyTo}
      />

      {typingAgent && <TypingIndicator agentNames={[typingAgent]} />}

      {/* Footer: input or read-only state */}
      {isViewingPast ? (
        <div className="px-4 py-3 border-t text-center" style={{ borderColor: 'rgba(242,244,243,0.05)', backgroundColor: '#1A202C' }}>
          <button
            onClick={handleBackToLive}
            className="text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded transition-opacity hover:opacity-80 shadow-md"
            style={{ backgroundColor: '#2BB6B3', color: '#151A21', fontFamily: '"Space Mono", monospace' }}
          >
            RETURN TO LIVE SESSION
          </button>
        </div>
      ) : canSend ? (
        <MessageInput
          onSend={(payload: string | OutgoingMessagePayload) => sendMessage.mutate(payload)}
          disabled={false}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          pendingMention={pendingMention}
          onMentionConsumed={onMentionConsumed}
        />
      ) : (
        <div className="px-4 py-3 border-t text-center shadow-inner" style={{ borderColor: 'rgba(242,244,243,0.05)', backgroundColor: '#1A202C' }}>
          <span className="text-[10px] uppercase font-bold tracking-widest" style={{ color: 'rgba(242,244,243,0.3)', fontFamily: '"Space Mono", monospace' }}>
            {session.endedAt ? 'CHANNEL CLOSED / START SESSION TO BEGIN' : 'WAITING FOR SESSION'}
          </span>
        </div>
      )}
    </div>
  );
}
