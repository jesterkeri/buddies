import { getAgentColor } from '../../types';

interface AgentAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 'w-8 h-8 text-xs border-2',
  md: 'w-10 h-10 text-sm border-3',
  lg: 'w-14 h-14 text-lg border-4',
};

export default function AgentAvatar({ name, size = 'md' }: AgentAvatarProps) {
  const color = getAgentColor(name);
  const initial = name.charAt(0).toUpperCase();

  return (
    <div
      className={`${sizes[size]} border-[--color-ink] rounded-none flex items-center justify-center font-display text-[--color-ink] shrink-0`}
      style={{ backgroundColor: color, boxShadow: '2px 2px 0px var(--color-ink)' }}
    >
      {initial}
    </div>
  );
}
