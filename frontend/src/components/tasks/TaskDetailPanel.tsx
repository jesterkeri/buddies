import { useState, useRef, useEffect } from 'react';
import {
  useTasks, deleteTask, approveTask, requestChanges, resumeTask,
  addDiscussionMessage, updateTask,
  type Task, type Priority, type TaskStatus,
} from './taskStore';
import { useSendMessage } from '../../api/hooks';
import { getAgentColor } from '../../types';
import AgentAvatar from '../shared/AgentAvatar';

const PRIORITY_INFO: Record<Priority, { label: string; color: string }> = {
  P0: { label: 'CRITICAL', color: '#E41937' },
  P1: { label: 'HIGH', color: '#F9D616' },
  P2: { label: 'MEDIUM', color: '#2BB6B3' },
  P3: { label: 'LOW', color: '#F2F4F3' },
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'TODO',
  in_progress: 'IN PROGRESS',
  review: 'REVIEW',
  done: 'DONE',
};

interface TaskDetailPanelProps {
  taskId: string;
  onClose: () => void;
}

export default function TaskDetailPanel({ taskId, onClose }: TaskDetailPanelProps) {
  const tasks = useTasks();
  const task = tasks.find((t) => t.id === taskId);
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  const [changesNote, setChangesNote] = useState('');
  const [showChangesInput, setShowChangesInput] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const sendMessage = useSendMessage();

  // Auto-scroll discussion
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [task?.discussion.length]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!task) return null;

  const pInfo = PRIORITY_INFO[task.priority];
  const isReview = task.status === 'review';
  const isDone = task.status === 'done';
  const shouldRouteThroughTaskWorker = task.status === 'in_progress' && !!task.assignee;

  const triggerTaskResume = async (force = false) => {
    if (!task.assignee) return;
    if (!force && task.status !== 'in_progress') return;
    try {
      await resumeTask(taskId);
    } catch {
      addDiscussionMessage(taskId, 'Chief', 'Could not resume this task right now. Try again shortly.');
    }
  };

  const handleSendMessage = async () => {
    const text = chatInput.trim();
    if (!text || sending) return;

    addDiscussionMessage(taskId, 'user', text);
    setChatInput('');
    setSending(true);

    try {
      if (shouldRouteThroughTaskWorker) {
        await triggerTaskResume();
      } else {
        // Review-stage discussion stays on the normal chat path.
        const targets = [task.assignee, 'Chief'].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);

        for (const target of targets) {
          if (!target) continue;
          const prompt = `[Task Review: "${task.title}"]\nUser says: ${text}\n\nRespond in context of this task. Keep it concise.`;
          try {
            const data: any = await sendMessage.mutateAsync(`@${target} ${prompt}`);
            const response = data?.agentResponse?.text;
            if (response) {
              addDiscussionMessage(taskId, target, response);
            }
          } catch {
            addDiscussionMessage(taskId, target, `Could not reach ${target}. They may be disconnected.`);
          }
        }
      }
    } finally {
      setSending(false);
    }
  };

  const notifyAgents = async (message: string) => {
    const targets = [task.assignee, 'Chief'].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
    for (const target of targets) {
      if (!target) continue;
      try {
        await sendMessage.mutateAsync(`@${target} ${message}`);
      } catch {}
    }
  };

  const handleApprove = async () => {
    approveTask(taskId);
    addDiscussionMessage(taskId, 'user', 'Task approved. Moving to DONE.');
    await notifyAgents(`[Task Approved: "${task.title}"]\nThe user has approved this task and moved it to DONE. Good work.`);
  };

  const handleRequestChanges = async () => {
    if (!changesNote.trim()) return;
    addDiscussionMessage(taskId, 'user', `Requesting changes: ${changesNote}`);
    requestChanges(taskId, changesNote);
    await triggerTaskResume(true);
    setChangesNote('');
    setShowChangesInput(false);
  };

  const handleDelete = () => {
    deleteTask(taskId);
    onClose();
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.toLocaleDateString('en', { month: 'short', day: 'numeric' })} ${formatTime(ts)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/50" onClick={onClose} />

      {/* Side Panel */}
      <div
        className="w-[420px] h-full flex flex-col border-l-2"
        style={{ backgroundColor: '#1a1d27', borderColor: '#0A0A0A' }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b-2" style={{ borderColor: 'rgba(242,244,243,0.1)' }}>
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-[10px] font-mono font-bold px-2 py-0.5 border-2 border-[--color-ink]"
              style={{ backgroundColor: pInfo.color, color: pInfo.label === 'LOW' ? '#0a0a0a' : '#fff' }}
            >
              {pInfo.label}
            </span>
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded"
                style={{
                  backgroundColor: isDone ? '#22c55e' : isReview ? '#2BB6B3' : task.status === 'in_progress' ? '#F9D616' : 'rgba(242,244,243,0.2)',
                  color: '#0a0a0a',
                }}
              >
                {STATUS_LABELS[task.status]}
              </span>
              <button onClick={onClose} className="text-xs font-mono text-white/30 hover:text-white/60 px-1">x</button>
            </div>
          </div>

          <h2 className="font-display text-lg text-white tracking-wide leading-tight">{task.title}</h2>

          {task.description && (
            <p className="text-[11px] font-mono text-white/40 mt-1.5 leading-relaxed">{task.description}</p>
          )}

          <div className="flex items-center gap-3 mt-3">
            {task.assignee ? (
              <div className="flex items-center gap-1.5">
                <AgentAvatar name={task.assignee} size="sm" />
                <span className="text-[10px] font-mono font-bold uppercase" style={{ color: getAgentColor(task.assignee) }}>
                  {task.assignee}
                </span>
              </div>
            ) : (
              <span className="text-[10px] font-mono text-white/25 italic">Unassigned</span>
            )}
            <span className="text-[9px] font-mono text-white/20">Created {formatDate(task.createdAt)}</span>
            <span className="text-[9px] font-mono text-white/20">by {task.createdBy}</span>
          </div>
        </div>

        {/* Status Timeline */}
        {task.statusHistory.length > 0 && (
          <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(242,244,243,0.06)' }}>
            <p className="text-[9px] font-mono font-bold uppercase text-white/20 mb-1.5">STATUS HISTORY</p>
            <div className="space-y-1">
              {task.statusHistory.map((h, i) => (
                <div key={i} className="flex items-center gap-2 text-[9px] font-mono text-white/30">
                  <span>{STATUS_LABELS[h.from]}</span>
                  <span style={{ color: '#2BB6B3' }}>→</span>
                  <span>{STATUS_LABELS[h.to]}</span>
                  <span className="text-white/15">by {h.by}</span>
                  {h.note && <span className="text-white/20 italic">"{h.note}"</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Work Output */}
        {task.workOutput.length > 0 && (
          <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(242,244,243,0.06)' }}>
            <p className="text-[9px] font-mono font-bold uppercase text-white/20 mb-2">WORK OUTPUT</p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {task.workOutput.map((w) => (
                <div key={w.id} className="px-3 py-2 rounded border" style={{ borderColor: `${getAgentColor(w.agent)}33`, backgroundColor: `${getAgentColor(w.agent)}08` }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[9px] font-display uppercase" style={{ color: getAgentColor(w.agent) }}>{w.agent}</span>
                    <span className="text-[8px] font-mono text-white/15">{formatTime(w.timestamp)}</span>
                  </div>
                  <p className="text-[11px] font-mono text-white/70 leading-relaxed whitespace-pre-wrap">{w.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Discussion Thread */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-5 py-2">
            <p className="text-[9px] font-mono font-bold uppercase text-white/20">
              {isReview ? 'REVIEW DISCUSSION' : 'DISCUSSION'}
            </p>
            {isReview && (
              <p className="mt-1 text-[10px] font-mono text-white/30 leading-relaxed">
                Review comments do not resume work. Use <span className="text-[#F9D616]">REQUEST CHANGES</span> to send this task back for another pass.
              </p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-5 space-y-2 pb-2">
            {task.discussion.length === 0 && (
              <p className="text-[10px] font-mono text-white/15 py-4 text-center">
                {isReview
                  ? `Leave review comments here. Use REQUEST CHANGES if ${task.assignee || 'the agent'} needs to rework the task.`
                  : 'No discussion yet.'}
              </p>
            )}
            {task.discussion.map((msg) => {
              const isUser = msg.from === 'user';
              const agentColor = isUser ? '#2BB6B3' : getAgentColor(msg.from);
              return (
                <div key={msg.id}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[9px] font-display uppercase" style={{ color: agentColor }}>
                      {isUser ? 'YOU' : msg.from}
                    </span>
                    <span className="text-[8px] font-mono text-white/15">{formatTime(msg.timestamp)}</span>
                  </div>
                  <div
                    className="px-3 py-1.5 rounded text-[11px] font-mono leading-relaxed"
                    style={{
                      backgroundColor: isUser ? 'rgba(43,182,179,0.08)' : `${agentColor}08`,
                      borderLeft: `2px solid ${agentColor}`,
                      color: 'rgba(242,244,243,0.75)',
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          {!isDone && (
            <div className="px-4 py-3 border-t" style={{ borderColor: 'rgba(242,244,243,0.08)' }}>
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={isReview ? 'Add a review comment (does not resume work)...' : 'Add a comment...'}
                  className="flex-1 px-3 py-1.5 text-[11px] font-mono bg-black/30 border border-white/10 text-white placeholder-white/20 rounded outline-none focus:border-white/25"
                  disabled={sending}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sending || !chatInput.trim()}
                  className="px-3 py-1.5 text-[10px] font-display uppercase border border-[--color-ink] disabled:opacity-30"
                  style={{ backgroundColor: '#2BB6B3', color: '#0a0a0a' }}
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="px-4 py-3 border-t-2 space-y-2" style={{ borderColor: 'rgba(242,244,243,0.1)' }}>
          {isReview && !showChangesInput && (
            <div className="flex gap-2">
              <button
                onClick={handleApprove}
                className="flex-1 py-2 text-[11px] font-display uppercase border-2 border-[--color-ink] shadow-[2px_2px_0px_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                style={{ backgroundColor: '#22c55e', color: '#0a0a0a' }}
              >
                APPROVE
              </button>
              <button
                onClick={() => setShowChangesInput(true)}
                className="flex-1 py-2 text-[11px] font-display uppercase border-2 border-[--color-ink] shadow-[2px_2px_0px_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                style={{ backgroundColor: '#F9D616', color: '#0a0a0a' }}
              >
                REQUEST CHANGES
              </button>
            </div>
          )}

          {isReview && showChangesInput && (
            <div className="space-y-2">
              <p className="text-[10px] font-mono text-white/35 leading-relaxed">
                This sends the task back to <span style={{ color: task.assignee ? getAgentColor(task.assignee) : '#F9D616' }}>{task.assignee || 'the assignee'}</span> and resumes backend task work.
              </p>
              <input
                value={changesNote}
                onChange={(e) => setChangesNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRequestChanges()}
                placeholder="What needs to change?"
                autoFocus
                className="w-full px-3 py-1.5 text-[11px] font-mono bg-black/30 border border-white/10 text-white placeholder-white/20 rounded outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleRequestChanges}
                  disabled={!changesNote.trim()}
                  className="flex-1 py-1.5 text-[10px] font-display uppercase disabled:opacity-30"
                  style={{ backgroundColor: '#F9D616', color: '#0a0a0a' }}
                >
                  SEND BACK
                </button>
                <button
                  onClick={() => setShowChangesInput(false)}
                  className="px-3 py-1.5 text-[10px] font-mono text-white/30 hover:text-white/60"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            {!isDone && !isReview && (
              <select
                value={task.status}
                onChange={(e) => moveTask(taskId, e.target.value as TaskStatus, 'user')}
                className="text-[10px] font-mono bg-black/30 border border-white/10 text-white/50 px-2 py-1 rounded outline-none"
              >
                <option value="todo">TODO</option>
                <option value="in_progress">IN PROGRESS</option>
                <option value="review">REVIEW</option>
              </select>
            )}
            <button
              onClick={handleDelete}
              className="text-[9px] font-mono text-white/20 hover:text-[#E41937] transition-colors ml-auto"
            >
              DELETE TASK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
