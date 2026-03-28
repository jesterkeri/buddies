import type { Task, TaskStatus } from './taskStore';
import { moveTask, deleteTask } from './taskStore';
import AgentAvatar from '../shared/AgentAvatar';

const PRIORITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  P0: { bg: '#E41937', text: '#F2F4F3', label: 'CRITICAL' },
  P1: { bg: '#F9D616', text: '#0A0A0A', label: 'HIGH' },
  P2: { bg: '#2BB6B3', text: '#0A0A0A', label: 'MEDIUM' },
  P3: { bg: '#F2F4F3', text: '#0A0A0A', label: 'LOW' },
};

const NEXT_STATUS: Record<TaskStatus, TaskStatus | null> = {
  todo: 'in_progress',
  in_progress: 'review',
  review: 'done',
  done: null,
};

const PREV_STATUS: Record<TaskStatus, TaskStatus | null> = {
  todo: null,
  in_progress: 'todo',
  review: 'in_progress',
  done: 'review',
};

interface TaskCardProps {
  task: Task;
  cardBg?: string;
}

export default function TaskCard({ task, cardBg }: TaskCardProps) {
  const pStyle = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.P3;
  const next = NEXT_STATUS[task.status];
  const prev = PREV_STATUS[task.status];

  return (
    <div
      className="border-2 border-[--color-ink] shadow-[3px_3px_0px_var(--color-ink)] p-3 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_var(--color-ink)] transition-all"
      style={{ backgroundColor: cardBg || 'var(--color-paper)' }}
    >
      {/* Top row: priority + delete */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[10px] font-bold font-mono px-2 py-0.5 border-2 border-[--color-ink] inline-block"
          style={{ backgroundColor: pStyle.bg, color: pStyle.text }}
        >
          {task.priority} // {pStyle.label}
        </span>
        <button
          onClick={() => deleteTask(task.id)}
          className="w-5 h-5 flex items-center justify-center text-xs font-bold text-[--color-ink]/20 hover:text-[--color-red] hover:bg-[--color-red]/10 border border-transparent hover:border-[--color-red] transition-all"
        >
          x
        </button>
      </div>

      {/* Title */}
      <p className="text-sm font-bold font-mono text-[--color-ink] leading-snug mb-3">
        {task.title}
      </p>

      {/* Footer: assignee + move buttons */}
      <div className="flex items-center justify-between pt-2 border-t border-[--color-ink]/10">
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

        <div className="flex gap-1.5">
          {prev && (
            <button
              onClick={() => moveTask(task.id, prev)}
              className="text-[11px] font-mono font-bold px-2 py-1 border-2 border-[--color-ink] bg-[--color-paper] hover:bg-[--color-ink] hover:text-[--color-paper] transition-colors"
              title={`Move to ${prev.replace('_', ' ')}`}
            >
              ◂ BACK
            </button>
          )}
          {next && (
            <button
              onClick={() => moveTask(task.id, next)}
              className="text-[11px] font-mono font-bold px-2 py-1 border-2 border-[--color-ink] bg-[--color-ink] text-[--color-paper] hover:bg-[--color-yellow] hover:text-[--color-ink] transition-colors"
              title={`Move to ${next.replace('_', ' ')}`}
            >
              NEXT ▸
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
