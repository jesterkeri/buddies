const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  IDLE: { bg: 'var(--color-teal)', color: 'var(--color-ink)' },
  WORKING: { bg: 'var(--color-yellow)', color: 'var(--color-ink)' },
  REVIEWING: { bg: 'var(--color-red)', color: 'var(--color-paper)' },
  RESEARCHING: { bg: '#a855f7', color: 'var(--color-paper)' },
  SCANNING: { bg: 'var(--color-yellow)', color: 'var(--color-ink)' },
  MEETING: { bg: 'var(--color-red)', color: 'var(--color-paper)' },
};

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.IDLE;

  return (
    <span
      className="inline-block px-2 py-0.5 text-[9px] font-bold font-mono border-2 border-[--color-ink] tracking-wider"
      style={{
        backgroundColor: style.bg,
        color: style.color,
        transform: 'rotate(-2deg)',
      }}
    >
      {status}
    </span>
  );
}
