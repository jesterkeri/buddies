import type { Task } from './taskStore';
import { deleteTask } from './taskStore';
import AgentAvatar from '../shared/AgentAvatar';

const PRIORITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  P0: { bg: '#E41937', text: '#F2F4F3', label: 'CRITICAL' },
  P1: { bg: '#F9D616', text: '#0A0A0A', label: 'HIGH' },
  P2: { bg: '#2BB6B3', text: '#0A0A0A', label: 'MEDIUM' },
  P3: { bg: '#F2F4F3', text: '#0A0A0A', label: 'LOW' },
};

interface TaskCardProps {
  task: Task;
  cardBg?: string;
  onClick?: () => void;
}

export default function TaskCard({ task, cardBg, onClick }: TaskCardProps) {
  const pStyle = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.P3;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
    (e.target as HTMLElement).style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = '1';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={onClick}
      className="border-2 border-[--color-ink] shadow-[3px_3px_0px_var(--color-ink)] p-3 cursor-pointer active:cursor-grabbing hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_var(--color-ink)] transition-all"
      style={{ backgroundColor: cardBg || 'var(--color-paper)' }}
    >
      {/* Top row: priority + delete */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[10px] font-bold font-mono px-2 py-0.5 border-2 border-[--color-ink] inline-block"
          style={{ backgroundColor: pStyle.bg, color: pStyle.text }}
        >
          {pStyle.label}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
          className="w-5 h-5 flex items-center justify-center text-xs font-bold text-[--color-ink]/20 hover:text-[--color-red] hover:bg-[--color-red]/10 border border-transparent hover:border-[--color-red] transition-all"
        >
          x
        </button>
      </div>

      {/* Title */}
      <p className="text-sm font-bold font-mono text-[--color-ink] leading-snug mb-3">
        {task.title}
      </p>

      {/* Description */}
      {task.description && (
        <p className="text-[10px] font-mono text-[--color-ink]/50 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Footer: assignee */}
      <div className="flex items-center pt-2 border-t border-[--color-ink]/10">
        {task.assignee ? (
          <div className="flex items-center gap-2">
            <AgentAvatar name={task.assignee} size="sm" />
            <span className="text-[11px] font-mono font-bold text-[--color-ink]/50 uppercase">
              {task.assignee}
            </span>
          </div>
        ) : (
          <span className="text-[11px] font-mono text-[--color-ink]/25 italic">Unassigned</span>
        )}
        <span className="text-[8px] font-mono text-[--color-ink]/20 ml-auto">
          drag to move
        </span>
      </div>
    </div>
  );
}
