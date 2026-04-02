import { useState } from 'react';
import { addTask, type Priority } from './taskStore';
import { AGENT_NAMES, getAgentColor } from '../../types';
import AgentAvatar from '../shared/AgentAvatar';

const PRIORITY_INFO: Record<Priority, { label: string; color: string }> = {
  P0: { label: 'CRITICAL', color: '#E41937' },
  P1: { label: 'HIGH', color: '#F9D616' },
  P2: { label: 'MEDIUM', color: '#2BB6B3' },
  P3: { label: 'LOW', color: '#F2F4F3' },
};

interface AddTaskModalProps {
  onClose: () => void;
}

export default function AddTaskModal({ onClose }: AddTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('P2');
  const [assignee, setAssignee] = useState('');

  const handleSubmit = () => {
    if (!title.trim()) return;
    addTask(title.trim(), priority, assignee || undefined, description.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="border-2 border-[--color-ink] shadow-[6px_6px_0px_#000] w-full max-w-md overflow-hidden"
        style={{ backgroundColor: '#1a1d27' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3 border-b-2 border-[--color-ink]" style={{ backgroundColor: '#E41937' }}>
          <h3 className="font-display text-lg text-white tracking-wider">NEW MISSION</h3>
          <p className="text-[10px] font-mono text-white/60">Create a task for the team</p>
        </div>

        <div className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs font-mono font-bold uppercase tracking-wider text-white/40 block mb-1.5">
              OBJECTIVE
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
              className="w-full px-3 py-2 text-sm font-mono border-2 border-white/15 bg-black/30 text-white placeholder-white/20 focus:outline-none focus:border-[#E41937] rounded"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-mono font-bold uppercase tracking-wider text-white/40 block mb-1.5">
              DETAILS <span className="text-white/20">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional context or requirements..."
              rows={2}
              className="w-full px-3 py-2 text-sm font-mono border-2 border-white/15 bg-black/30 text-white placeholder-white/20 focus:outline-none focus:border-[#E41937] rounded resize-none"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs font-mono font-bold uppercase tracking-wider text-white/40 block mb-1.5">
              PRIORITY
            </label>
            <div className="flex gap-2">
              {(['P0', 'P1', 'P2', 'P3'] as Priority[]).map((p) => {
                const info = PRIORITY_INFO[p];
                const isSelected = priority === p;
                return (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className="flex-1 py-2 text-xs font-mono font-bold border-2 transition-all"
                    style={{
                      borderColor: isSelected ? info.color : 'rgba(255,255,255,0.15)',
                      backgroundColor: isSelected ? info.color : 'transparent',
                      color: isSelected ? (p === 'P3' ? '#0a0a0a' : '#fff') : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {info.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Assign Agent */}
          <div>
            <label className="text-xs font-mono font-bold uppercase tracking-wider text-white/40 block mb-1.5">
              ASSIGN AGENT
            </label>
            <div className="space-y-1.5">
              <button
                onClick={() => setAssignee('')}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono font-bold border-2 transition-all rounded"
                style={{
                  borderColor: !assignee ? '#F9D616' : 'rgba(255,255,255,0.1)',
                  backgroundColor: !assignee ? 'rgba(249,214,22,0.1)' : 'transparent',
                  color: !assignee ? '#F9D616' : 'rgba(255,255,255,0.4)',
                }}
              >
                UNASSIGNED — Chief will decide
              </button>
              <div className="grid grid-cols-2 gap-1.5">
                {AGENT_NAMES.map((name) => {
                  const isSelected = assignee === name;
                  const color = getAgentColor(name);
                  return (
                    <button
                      key={name}
                      onClick={() => setAssignee(name)}
                      className="flex items-center gap-2 px-3 py-2 border-2 transition-all rounded"
                      style={{
                        borderColor: isSelected ? color : 'rgba(255,255,255,0.1)',
                        backgroundColor: isSelected ? `${color}20` : 'transparent',
                      }}
                    >
                      <div
                        className="w-5 h-5 border border-[--color-ink] flex items-center justify-center text-[8px] font-display shrink-0"
                        style={{ backgroundColor: color, color: '#0a0a0a' }}
                      >
                        {name[0]}
                      </div>
                      <span className="text-[10px] font-mono font-bold" style={{ color: isSelected ? color : 'rgba(255,255,255,0.5)' }}>
                        {name.toUpperCase()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t-2" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="flex-1 py-2.5 font-display text-sm uppercase border-2 border-[--color-ink] shadow-[3px_3px_0px_#000] hover:shadow-[1px_1px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#E41937', color: 'white' }}
          >
            DEPLOY MISSION
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 font-display text-sm uppercase border-2 text-white/50 hover:text-white hover:border-white/30 transition-all"
            style={{ borderColor: 'rgba(255,255,255,0.15)' }}
          >
            ABORT
          </button>
        </div>
      </div>
    </div>
  );
}
