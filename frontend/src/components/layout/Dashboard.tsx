import { useState } from 'react';
import type { TabId } from '../../types';
import TopNav from './TopNav';
import Sidebar from './Sidebar';
import ChatRoom from '../chat/ChatRoom';
import PixelOffice from '../office/PixelOffice';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('chat');

  const handleAgentClick = (name: string) => {
    // Switch to chat room and could pre-fill @mention
    setActiveTab('chat');
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopNav activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 flex overflow-hidden p-3 gap-3">
        <Sidebar />

        <main className="flex-1 overflow-hidden">
          {activeTab === 'chat' && <ChatRoom />}
          {activeTab === 'office' && <PixelOffice onAgentClick={handleAgentClick} />}
          {activeTab === 'tasks' && <ComingSoon label="MISSIONS" sub="TASK BOARD MODULE" />}
          {activeTab === 'activity' && <ComingSoon label="INTEL" sub="ACTIVITY FEED MODULE" />}
        </main>
      </div>
    </div>
  );
}

function ComingSoon({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="h-full panel flex items-center justify-center bg-[--color-slate]">
      <div className="text-center">
        <p className="font-display text-4xl text-[--color-paper]/20" style={{ transform: 'rotate(-3deg)' }}>
          {label}
        </p>
        <p className="text-xs font-mono text-[--color-paper]/30 mt-2 tracking-wider">{sub}</p>
        <p className="text-xs font-mono text-[--color-yellow]/50 mt-4">// COMING SOON</p>
      </div>
    </div>
  );
}
