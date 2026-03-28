import { useState } from 'react';
import { addTask, type Priority } from './taskStore';
import { AGENT_NAMES, getAgentColor } from '../../types';

interface AddTaskModalProps {
  onClose: () => void;
}

export default function AddTaskModal({ onClose }: AddTaskModalProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('P2');
  const [assignee, setAssignee] = useState('');

  const handleSubmit = () => {
    if (!title.trim()) return;
    addTask(title.trim(), priority, assignee || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[--color-paper] border-4 border-[--color-ink] shadow-[8px_8px_0px_var(--color-ink)] p-4 w-96"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tape tape-tl" />

        <h3 className="font-display text-lg mb-4 tracking-wider">NEW MISSION</h3>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[--color-ink]/60 block mb-1">
              OBJECTIVE
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task description..."
              autoFocus
              className="w-full px-2 py-1.5 text-sm font-mono border-2 border-[--color-ink] focus:outline-none focus:shadow-[2px_2px_0px_var(--color-ink)]"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          <div>
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[--color-ink]/60 block mb-1">
              PRIORITY
            </label>
            <div className="flex gap-1">
              {(['P0', 'P1', 'P2', 'P3'] as Priority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`px-2 py-1 text-[10px] font-mono font-bold border-2 border-[--color-ink] transition-all ${
                    priority === p
                      ? 'bg-[--color-ink] text-[--color-paper] shadow-[2px_2px_0px_var(--color-yellow)]'
                      : 'bg-[--color-paper] text-[--color-ink] hover:bg-[--color-ink]/10'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[--color-ink]/60 block mb-1">
              ASSIGN AGENT
            </label>
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => setAssignee('')}
                className={`px-2 py-1 text-[10px] font-mono font-bold border-2 border-[--color-ink] ${
                  !assignee ? 'bg-[--color-ink] text-[--color-paper]' : 'bg-[--color-paper]'
                }`}
              >
                NONE
              </button>
              {AGENT_NAMES.map((name) => (
                <button
                  key={name}
                  onClick={() => setAssignee(name)}
                  className="px-2 py-1 text-[10px] font-mono font-bold border-2 border-[--color-ink] transition-all"
                  style={{
                    backgroundColor: assignee === name ? getAgentColor(name) : 'var(--color-paper)',
                    color: assignee === name ? '#0a0a0a' : 'var(--color-ink)',
                  }}
                >
                  {name.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="flex-1 py-2 font-display text-sm uppercase bg-[--color-red] text-[--color-ink] border-2 border-[--color-ink] shadow-[3px_3px_0px_var(--color-ink)] hover:shadow-[1px_1px_0px_var(--color-ink)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-30"
          >
            DEPLOY
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 font-display text-sm uppercase border-2 border-[--color-ink] bg-[--color-paper] hover:bg-[--color-ink]/10 transition-all"
          >
            ABORT
          </button>
        </div>
      </div>
    </div>
  );
}
