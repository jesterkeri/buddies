import React from 'react';

interface HQChatBubbleProps {
  name: string;
  text: string;
  x: number;
  y: number;
}

export default function HQChatBubble({ name, text, x, y }: HQChatBubbleProps) {
  return (
    <div
      className="absolute z-50 pointer-events-none flex flex-col items-center animate-in fade-in slide-in-from-bottom-2 duration-300"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -100%)',
        marginBottom: '12px', // space between character and bubble
      }}
    >
      <div 
        className="px-3 py-2 border-2"
        style={{
          backgroundColor: '#1E2530',
          borderColor: '#2BB6B3',
          color: '#E2E8F0',
          boxShadow: '4px 4px 0px rgba(10, 10, 10, 0.5)',
          minWidth: '120px',
          maxWidth: '220px',
        }}
      >
        <div className="text-[9px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5" style={{ color: '#2BB6B3', fontFamily: '"Space Mono", monospace' }}>
          {name}
          <div className="flex-1 border-b border-dashed opacity-30" style={{ borderColor: '#2BB6B3' }} />
        </div>
        <div className="text-[11px] leading-snug drop-shadow-sm" style={{ fontFamily: '"Space Mono", monospace' }}>
          {text}
        </div>
      </div>
      {/* Speech bubble tail */}
      <div className="relative w-4 h-3 overflow-hidden">
        <div 
           className="absolute top-[-4px] left-1/2 w-3 h-3 border-b-2 border-r-2"
           style={{
             borderColor: '#2BB6B3',
             backgroundColor: '#1E2530',
             transform: 'translateX(-50%) rotate(45deg)',
             boxShadow: '3px 3px 0px rgba(10, 10, 10, 0.5)',
           }}
        />
      </div>
    </div>
  );
}
