import { useState, useEffect } from 'react';
import { useTeamSession, useMessages, useSendMessage, useAgents, useTypingAgent, getSessions, getActiveSessionId, deleteSession } from '../../api/hooks';
import { useSession } from '../session/sessionStore';
import type { ChatMessage } from '../../types';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';

export default function ChatRoom() {
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
      <div className="h-full panel panel-terminal flex items-center justify-center">
        <div className="text-center">
          <p className="font-display text-xl" style={{ color: '#2BB6B3' }}>CONNECTING...</p>
          <p className="font-mono text-xs mt-2" style={{ color: 'rgba(242,244,243,0.4)' }}>// Establishing secure channel</p>
          <div className="cursor-blink mx-auto mt-3" />
        </div>
      </div>
    );
  }

  if (!teamSession) {
    return (
      <div className="h-full panel panel-terminal flex items-center justify-center">
        <div className="text-center">
          <p className="font-display text-2xl" style={{ color: '#E41937' }}>NO SIGNAL</p>
          <p className="font-mono text-xs mt-2" style={{ color: 'rgba(242,244,243,0.4)' }}>
            // Make sure the backend is running
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
    <div className="h-full panel panel-terminal flex flex-col relative">
      <div className="tape tape-tr" />
      <div className="panel-header">
        <span>TEAM_COMMS</span>
        <span className="badge" style={{ backgroundColor: badgeColor, color: '#F2F4F3' }}>● {badgeLabel}</span>
      </div>

      {/* Session bar */}
      <div className="flex items-center gap-3 px-4 py-1.5 border-b-2" style={{ borderColor: 'rgba(242,244,243,0.15)' }}>
        {pastSessions.length > 0 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-[10px] font-mono px-2 py-0.5 rounded border hover:opacity-80 transition-opacity cursor-pointer"
            style={{ borderColor: 'rgba(242,244,243,0.3)', color: 'rgba(242,244,243,0.5)' }}
          >
            HISTORY ({pastSessions.length})
          </button>
        )}
        {isViewingPast && (
          <button
            onClick={handleBackToLive}
            className="text-[10px] font-mono px-2 py-0.5 rounded border hover:opacity-80 transition-opacity cursor-pointer"
            style={{ borderColor: '#E41937', color: '#E41937' }}
          >
            BACK TO LIVE
          </button>
        )}
        <span className="text-[10px] font-mono ml-auto" style={{ color: 'rgba(242,244,243,0.5)' }}>AGENTS: {agents?.length ?? '...'}</span>
        <span className="text-[10px] font-mono" style={{ color: session.active ? '#2BB6B3' : 'rgba(242,244,243,0.3)' }}>
          {session.active ? 'SECURE CONNECTION' : session.endedAt ? 'SESSION COMPLETE' : 'AWAITING SESSION'}
        </span>
      </div>

      {/* Viewing past session banner */}
      {isViewingPast && (
        <div className="px-4 py-2 text-center border-b-2" style={{ borderColor: 'rgba(242,244,243,0.1)', backgroundColor: 'rgba(228,25,55,0.1)' }}>
          <span className="text-[11px] font-mono" style={{ color: '#E41937' }}>
            VIEWING PAST SESSION — READ ONLY
          </span>
        </div>
      )}

      {/* Session history dropdown */}
      {showHistory && (
        <div
          className="absolute left-4 top-[88px] z-50 rounded border shadow-lg max-h-60 overflow-y-auto w-72"
          style={{ backgroundColor: '#1B2432', borderColor: 'rgba(242,244,243,0.2)' }}
        >
          {pastSessions.slice().reverse().map((s) => (
            <div
              key={s.id}
              onClick={() => handleViewSession(s.id)}
              className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-white/5 transition-colors"
              style={{ borderBottom: '1px solid rgba(242,244,243,0.08)' }}
            >
              <div>
                <p className="text-[11px] font-mono" style={{ color: viewingId === s.id ? '#2BB6B3' : 'rgba(242,244,243,0.7)' }}>
                  {s.label}
                </p>
                <p className="text-[9px] font-mono" style={{ color: 'rgba(242,244,243,0.35)' }}>
                  {s.messageCount} messages
                </p>
              </div>
              <button
                onClick={(e) => handleDeleteSession(e, s.id)}
                className="text-[10px] font-mono px-1.5 py-0.5 rounded hover:opacity-80 transition-opacity"
                style={{ color: '#E41937' }}
                title="Delete session"
              >
                X
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
        <div className="px-4 py-3 border-t-2 text-center" style={{ borderColor: 'rgba(242,244,243,0.15)' }}>
          <button
            onClick={handleBackToLive}
            className="text-xs font-mono px-4 py-1.5 rounded border cursor-pointer hover:opacity-80 transition-opacity"
            style={{ borderColor: '#2BB6B3', color: '#2BB6B3' }}
          >
            BACK TO LIVE SESSION
          </button>
        </div>
      ) : canSend ? (
        <MessageInput
          onSend={(content) => sendMessage.mutate(content)}
          disabled={false}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
        />
      ) : (
        <div className="px-4 py-3 border-t-2 text-center" style={{ borderColor: 'rgba(242,244,243,0.15)' }}>
          <span className="text-[11px] font-mono" style={{ color: 'rgba(242,244,243,0.4)' }}>
            {session.endedAt ? 'SESSION ENDED — Click START SESSION to begin a new one' : 'Click START SESSION to begin'}
          </span>
        </div>
      )}
    </div>
  );
}
