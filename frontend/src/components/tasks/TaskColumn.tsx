import { useState } from 'react';
import type { Task, TaskStatus } from './taskStore';
import { moveTask } from './taskStore';
import TaskCard from './TaskCard';

const COLUMN_CONFIG: Record<TaskStatus, { label: string; bg: string; text: string; cardBg: string }> = {
  todo: { label: 'TODO', bg: '#F2F4F3', text: '#0A0A0A', cardBg: '#F2F4F3' },
  in_progress: { label: 'IN PROGRESS', bg: '#F9D616', text: '#0A0A0A', cardBg: '#fef8d4' },
  review: { label: 'REVIEW', bg: '#2BB6B3', text: '#0A0A0A', cardBg: '#d4f0ef' },
  done: { label: 'DONE', bg: '#22c55e', text: '#0A0A0A', cardBg: '#d4f5df' },
};

interface TaskColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
}

export default function TaskColumn({ status, tasks, onTaskClick }: TaskColumnProps) {
  const config = COLUMN_CONFIG[status];
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      moveTask(taskId, status);
    }
  };

  return (
    <div
      className="flex flex-col min-w-0"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div
        className="flex items-center justify-between px-3 py-2.5 border-2 border-[--color-ink] shadow-[2px_2px_0px_var(--color-ink)] font-display text-base tracking-wider mb-3"
        style={{ backgroundColor: config.bg, color: config.text }}
      >
        <span>{config.label}</span>
        <span className="bg-[--color-ink] text-[--color-paper] text-xs font-mono font-bold w-6 h-6 flex items-center justify-center">
          {tasks.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        className="flex-1 space-y-3 overflow-y-auto pr-1 transition-all rounded"
        style={{
          backgroundColor: dragOver ? `${config.bg}15` : 'transparent',
          border: dragOver ? `2px dashed ${config.bg}` : '2px dashed transparent',
          padding: dragOver ? '8px' : '0',
        }}
      >
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} cardBg={config.cardBg} onClick={() => onTaskClick?.(task.id)} />
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-[--color-paper]/10">
            <p className="text-xs font-mono text-[--color-paper]/25">
              {dragOver ? 'DROP HERE' : '// EMPTY'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
