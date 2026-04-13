import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAutonomousMessages } from '../../api/client';
import { AUTONOMOUS_MESSAGES_KEY } from '../../api/hooks';
import { getAgentColor } from '../../types';
import { useSession } from '../session/sessionStore';

export default function WarRoomTimeline() {
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [replaySnapshot, setReplaySnapshot] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const session = useSession();
  const sessionStart = session.startTime || 0;

  // Reads from Dashboard's poller cache. staleTime: Infinity prevents remount refetches.
  // queryFn is kept as fallback if cache is cold on first mount (joins Dashboard's in-flight query).
  const { data: allMessagesRaw = [], isLoading } = useQuery({
    queryKey: AUTONOMOUS_MESSAGES_KEY,
    queryFn: getAutonomousMessages,
    staleTime: Infinity,
  });

  // Filter out messages from previous sessions
  const allMessages = useMemo(
    () => allMessagesRaw.filter((msg: any) => !msg.timestamp || msg.timestamp >= sessionStart),
    [allMessagesRaw, sessionStart]
  );

  // Replay effect
  useEffect(() => {
    if (!isReplaying) return;
    
    if (replayIndex < replaySnapshot.length) {
      const timer = setTimeout(() => {
        setReplayIndex(prev => prev + 1);
      }, 500); // 1 message per 500ms
      return () => clearTimeout(timer);
    } else {
      // Auto-stop replay when done
      const timer = setTimeout(() => {
        setIsReplaying(false);
        setReplaySnapshot([]);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isReplaying, replayIndex, replaySnapshot.length]);

  // Auto-scroll logic
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [isReplaying, replayIndex, allMessages]);

  const toggleReplay = () => {
    if (isReplaying) {
      setIsReplaying(false);
      setReplaySnapshot([]);
    } else {
      setReplaySnapshot([...allMessages]);
      setReplayIndex(1); // Start with showing the first message
      setIsReplaying(true);
    }
  };

  const displayedMessages = isReplaying 
    ? replaySnapshot.slice(0, replayIndex) 
    : allMessages;

  return (
    <div className="h-full panel rounded-none flex flex-col" style={{ backgroundColor: '#232A38' }}>
      <div className="tape tape-tl" />
      <div className="tape tape-br" />
      
      <div className="panel-header group flex justify-between items-center bg-black border-b-[4px] border-black">
        <span className="truncate pr-2">WAR_ROOM</span>
        
        <button 
          onClick={toggleReplay}
          className="badge px-2 py-0.5 text-[0.65rem] transition-transform hover:scale-110 active:scale-95 border-2 border-black"
          style={{ 
            backgroundColor: isReplaying ? '#E41937' : '#F9D616',
            color: isReplaying ? '#F2F4F3' : '#0A0A0A',
            cursor: 'pointer',
            boxShadow: '1px 1px 0px #0A0A0A',
            transform: 'rotate(2deg)'
          }}
        >
          {isReplaying ? 'STOP' : 'REPLAY'}
        </button>
      </div>

      <div 
        className="flex-1 overflow-y-auto p-3 space-y-3 relative custom-scrollbar" 
        ref={scrollRef}
      >
        {isLoading && !allMessages.length && (
          <div className="text-[10px] font-mono text-center opacity-50 pt-10">
            // SYNCING COMMS...
          </div>
        )}
        {!isLoading && !allMessages.length && (
          <div className="text-[10px] font-mono text-center opacity-50 pt-10">
            // AWAITING TRANSMISSIONS...
          </div>
        )}

        {displayedMessages.map((msg: any, idx: number) => {
          const fromColor = getAgentColor(msg.from) || '#F2F4F3';
          const toColor = getAgentColor(msg.to) || '#F2F4F3';
          
          return (
             <div 
               key={msg.id || idx} 
               className="panel rounded-none border-[3px] border-black p-2 warroom-card-in"
               style={{ 
                 backgroundColor: '#1a1d27', 
                 boxShadow: '3px 3px 0px #0A0A0A'
               }}
             >
                <div className="flex items-center gap-1.5 mb-1 text-[9px] font-mono uppercase tracking-wider">
                  <span style={{ color: fromColor }} className="font-bold">{msg.from}</span>
                  <span className="text-gray-500 opacity-60">→</span>
                  <span style={{ color: toColor }} className="font-bold">{msg.to}</span>
                  <span className="ml-auto text-gray-500 opacity-40">
                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}) : ''}
                  </span>
                </div>
                
                <p className="text-[11px] font-mono leading-snug text-gray-300 mt-1 break-words whitespace-pre-wrap">
                  &gt; {msg.content}
                </p>

                {msg.response && (
                  <div className="mt-2 pl-2 border-l-2" style={{ borderColor: 'rgba(242,244,243,0.15)' }}>
                    <div className="text-[8px] font-mono mb-0.5" style={{ color: 'rgba(242,244,243,0.5)' }}>
                      RESPONSE FROM {msg.to.toUpperCase()}:
                    </div>
                    <p className="text-[10px] font-mono leading-snug break-words whitespace-pre-wrap" style={{ color: 'rgba(242,244,243,0.75)' }}>
                      &gt; {msg.response}
                    </p>
                  </div>
                )}
             </div>
          );
        })}
        
        {/* Terminal cursor blink indicator at the bottom to continue the aesthetic */}
        <div className="pt-2 pl-1 pb-4">
          <span className="cursor-blink" style={{ height: '0.8em', width: '6px' }} />
        </div>
      </div>
    </div>
  );
}
