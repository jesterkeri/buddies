interface TypingIndicatorProps {
  agentNames?: string[];
}

export default function TypingIndicator({ agentNames }: TypingIndicatorProps) {
  if (!agentNames?.length) return null;

  const label = agentNames.length === 1
    ? `${agentNames[0]} is processing`
    : `${agentNames.join(', ')} are processing`;

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <span className="text-[--color-yellow] font-bold">&gt;</span>
      <span className="text-xs font-mono text-[--color-teal]">{label}</span>
      <div className="cursor-blink" />
    </div>
  );
}
