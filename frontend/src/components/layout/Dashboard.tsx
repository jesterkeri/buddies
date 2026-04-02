import { useState } from 'react';
import type { TabId } from '../../types';
import TopNav from './TopNav';
import Sidebar from './Sidebar';
import ChatRoom from '../chat/ChatRoom';
import PixelOffice from '../office/PixelOffice';
import TaskBoard from '../tasks/TaskBoard';
import ActivityFeed from '../activity/ActivityFeed';
import SessionPage from '../session/SessionPage';
import SettingsPage from '../settings/SettingsPage';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('chat');

  const handleAgentClick = (name: string) => {
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
          {activeTab === 'tasks' && <TaskBoard />}
          {activeTab === 'activity' && <ActivityFeed />}
          {activeTab === 'session' && <SessionPage />}
          {activeTab === 'connect' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}
