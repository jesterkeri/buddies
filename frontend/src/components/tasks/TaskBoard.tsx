import { useState } from 'react';
import { useTasks, type TaskStatus } from './taskStore';
import TaskColumn from './TaskColumn';
import AddTaskModal from './AddTaskModal';
import TaskDetailPanel from './TaskDetailPanel';

const COLUMNS: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];

export default function TaskBoard() {
  const tasks = useTasks();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const tasksByStatus = (status: TaskStatus) =>
    tasks
      .filter((t) => t.status === status)
      .sort((a, b) => {
        const pOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
        return (pOrder[a.priority] || 3) - (pOrder[b.priority] || 3);
      });

  return (
    <div className="h-full panel bg-[--color-slate] flex flex-col">
      <div className="tape tape-tl" />
      <div className="panel-header">
        <span>MISSION_BOARD</span>
        <div className="flex items-center gap-2">
          <span className="badge">{tasks.length} TASKS</span>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-[--color-red] text-[--color-ink] font-display text-xs px-2 py-0.5 border border-[--color-ink] hover:bg-[--color-yellow] transition-colors"
          >
            + NEW
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-3">
        <div className="grid grid-cols-4 gap-3 h-full min-w-[700px]">
          {COLUMNS.map((status) => (
            <TaskColumn key={status} status={status} tasks={tasksByStatus(status)} onTaskClick={setSelectedTaskId} />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 px-4 py-1.5 border-t-2 border-[--color-paper]/10 text-[9px] font-mono text-[--color-paper]/40">
        <span>TODO: {tasksByStatus('todo').length}</span>
        <span>ACTIVE: {tasksByStatus('in_progress').length}</span>
        <span>REVIEW: {tasksByStatus('review').length}</span>
        <span>DONE: {tasksByStatus('done').length}</span>
        <span className="ml-auto text-[--color-yellow]">CHIEF MANAGES PRIORITIES</span>
      </div>

      {showAdd && <AddTaskModal onClose={() => setShowAdd(false)} />}
      {selectedTaskId && <TaskDetailPanel taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />}
    </div>
  );
}
