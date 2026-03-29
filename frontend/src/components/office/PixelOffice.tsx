import { useEffect, useRef, useState } from 'react';
import { useAgentStates } from '../../api/hooks';
import { createCharacter, updateCharacter, type CharacterData } from '../../game/characters';
import { loadCharacterFrames, loadImage, type CharacterFrames, type Direction } from '../../game/sprites';

const AGENT_CHARS: Record<string, number> = {
  Chief: 0, Hawk: 1, Radar: 2, 'Bounty Hunter': 3, Buddy: 4,
};
const AGENT_COLORS: Record<string, number> = {
  Chief: 0x3b82f6, Hawk: 0xe41937, Radar: 0x2bb6b3, 'Bounty Hunter': 0xf9d616, Buddy: 0xa855f7,
};

const TILE = 16; // base tile size
const ZOOM = 3;  // render at 3x for crisp detail
const T = TILE * ZOOM; // rendered tile size = 48px

// Office dimensions in tiles
const COLS = 20;
const ROWS = 14;
const CW = COLS * T;
const CH = ROWS * T;

// Floor colors (warm wood)
const WOOD_LIGHT = '#c4a67a';
const WOOD_DARK = '#b89768';
const WOOD_GRID = '#a88a5c';
// Break room floor
const BREAK_LIGHT = '#7a9cb4';
const BREAK_DARK = '#6e8fa6';

// Workstation positions: {agent, deskCol, deskRow} (desk is 3 tiles wide, agent sits 1 tile below)
const WORKSTATIONS = [
  { agent: 'Chief',   col: 2,  row: 3 },
  { agent: 'Hawk',    col: 7,  row: 3 },
  { agent: 'Radar',   col: 2,  row: 7 },
  { agent: 'Bounty Hunter', col: 7,  row: 7 },
  { agent: 'Buddy',   col: 2,  row: 10 },
];

// Meeting table area
const MEETING = { col: 13, row: 5, w: 3, h: 3 };
// Break room area (right side)
const BREAK_ROOM = { col: 14, row: 0, w: 6, h: 14 };

interface PixelOfficeProps {
  onAgentClick?: (name: string) => void;
}

export default function PixelOffice({ onAgentClick }: PixelOfficeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: agentStates } = useAgentStates();
  const [cssScale, setCssScale] = useState(1);
  const [characters, setCharacters] = useState<CharacterData[]>(() =>
    Object.entries(AGENT_COLORS).map(([name, color]) => createCharacter(name, color))
  );
  const [charFrames, setCharFrames] = useState<Map<string, CharacterFrames>>(new Map());
  const [furniture, setFurniture] = useState<Map<string, HTMLImageElement>>(new Map());
  const [ready, setReady] = useState(false);
  const frameRef = useRef(0);

  const stateMap = new Map<string, string>();
  agentStates?.forEach((s) => stateMap.set(s.agentName, s.status));

  // Load assets
  useEffect(() => {
    async function load() {
      const frames = new Map<string, CharacterFrames>();
      for (const [name, idx] of Object.entries(AGENT_CHARS)) {
        frames.set(name, await loadCharacterFrames(idx, ZOOM));
      }
      setCharFrames(frames);

      const furn = new Map<string, HTMLImageElement>();
      const assets = [
        ['desk', '/assets/furniture/DESK/DESK_FRONT.png'],
        ['pc_on', '/assets/furniture/PC/PC_FRONT_ON_1.png'],
        ['pc_off', '/assets/furniture/PC/PC_FRONT_OFF.png'],
        ['plant', '/assets/furniture/PLANT/PLANT.png'],
        ['large_plant', '/assets/furniture/LARGE_PLANT/LARGE_PLANT.png'],
        ['bookshelf', '/assets/furniture/BOOKSHELF/BOOKSHELF.png'],
        ['sofa_front', '/assets/furniture/SOFA/SOFA_FRONT.png'],
        ['coffee', '/assets/furniture/COFFEE/COFFEE.png'],
        ['chair_front', '/assets/furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png'],
        ['chair_back', '/assets/furniture/CUSHIONED_CHAIR/CUSHIONED_CHAIR_BACK.png'],
        ['small_table', '/assets/furniture/SMALL_TABLE/SMALL_TABLE_FRONT.png'],
      ];
      for (const [key, src] of assets) {
        try { furn.set(key, await loadImage(src)); } catch {}
      }
      setFurniture(furn);
      setReady(true);
    }
    load();
  }, []);

  // Responsive scale
  useEffect(() => {
    const resize = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      const sx = clientWidth / CW;
      const sy = clientHeight / CH;
      setCssScale(Math.min(sx, sy));
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Game loop
  useEffect(() => {
    if (!ready) return;
    const interval = setInterval(() => {
      frameRef.current++;
      setCharacters((prev) =>
        prev.map((c) => updateCharacter(c, stateMap.get(c.name) || 'IDLE'))
      );
    }, 1000 / 20);
    return () => clearInterval(interval);
  }, [ready, agentStates]);

  // Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // Clear
    ctx.fillStyle = '#1a1520';
    ctx.fillRect(0, 0, CW, CH);

    // --- FLOORS ---
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const x = col * T;
        const y = row * T;
        const isWall = row === 0 || row === ROWS - 1 || col === 0 || col === COLS - 1;
        const isBreakRoom = col >= BREAK_ROOM.col;

        if (isWall) {
          ctx.fillStyle = '#1a1520';
          ctx.fillRect(x, y, T, T);
          // Brick pattern
          if (row > 0 && row < ROWS - 1) {
            ctx.strokeStyle = '#252030';
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 1, y + 1, T - 2, T / 2 - 1);
            const off = row % 2 === 0 ? 0 : T / 2;
            ctx.strokeRect(x + off, y + T / 2, T / 2 - 1, T / 2 - 1);
          }
        } else if (isBreakRoom) {
          ctx.fillStyle = (col + row) % 2 === 0 ? BREAK_LIGHT : BREAK_DARK;
          ctx.fillRect(x, y, T, T);
          ctx.strokeStyle = '#6585a0';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, T, T);
        } else {
          ctx.fillStyle = (col + row) % 2 === 0 ? WOOD_LIGHT : WOOD_DARK;
          ctx.fillRect(x, y, T, T);
          // Wood grain lines
          ctx.strokeStyle = WOOD_GRID;
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, T, T);
          // Horizontal grain
          ctx.beginPath();
          ctx.moveTo(x, y + T * 0.3);
          ctx.lineTo(x + T, y + T * 0.3);
          ctx.moveTo(x, y + T * 0.7);
          ctx.lineTo(x + T, y + T * 0.7);
          ctx.stroke();
        }
      }
    }

    // Room divider (wall between main office and break room)
    for (let row = 1; row < ROWS - 1; row++) {
      if (row >= 4 && row <= 6) continue; // doorway
      const x = (BREAK_ROOM.col - 1) * T;
      const y = row * T;
      ctx.fillStyle = '#1a1520';
      ctx.fillRect(x, y, T, T);
    }

    // Helper: draw scaled furniture sprite
    const drawFurn = (key: string, x: number, y: number, w: number, h: number) => {
      const img = furniture.get(key);
      if (img) {
        ctx.drawImage(img, x, y, w, h);
      }
    };

    // --- WORKSTATIONS (desk + PC on top) ---
    for (const ws of WORKSTATIONS) {
      const dx = ws.col * T;
      const dy = ws.row * T;
      // Desk (3 tiles wide, 2 tiles tall)
      drawFurn('desk', dx, dy, T * 3, T * 2);
      // PC on desk
      drawFurn('pc_on', dx + T * 0.9, dy - T * 0.6, T, T * 1.5);
      // Coffee cup
      drawFurn('coffee', dx + T * 2, dy + T * 0.2, T * 0.5, T * 0.5);
    }

    // --- BREAK ROOM FURNITURE ---
    drawFurn('sofa_front', BREAK_ROOM.col * T + T, 8 * T, T * 3, T * 2);
    drawFurn('small_table', BREAK_ROOM.col * T + T * 1.5, 10 * T, T * 2, T * 1.5);
    drawFurn('bookshelf', (BREAK_ROOM.col + 4) * T, 2 * T, T * 1.5, T * 3);
    drawFurn('chair_front', BREAK_ROOM.col * T + T, 3 * T, T, T);
    drawFurn('chair_front', (BREAK_ROOM.col + 3) * T, 3 * T, T, T);

    // --- PLANTS ---
    drawFurn('large_plant', 1 * T, 1 * T, T * 1.5, T * 2.5);
    drawFurn('plant', 12 * T, 1 * T, T, T * 1.5);
    drawFurn('plant', 1 * T, 11 * T, T, T * 1.5);
    drawFurn('large_plant', (BREAK_ROOM.col + 4) * T, 10 * T, T * 1.5, T * 2.5);
    drawFurn('plant', BREAK_ROOM.col * T + T * 0.3, 6 * T, T, T * 1.5);

    // --- MEETING TABLE ---
    const mx = MEETING.col * T;
    const my = MEETING.row * T;
    ctx.fillStyle = '#5c3d2e';
    ctx.strokeStyle = '#0a0a0a';
    ctx.lineWidth = 2;
    const mw = MEETING.w * T;
    const mh = MEETING.h * T;
    ctx.beginPath();
    ctx.roundRect(mx + 8, my + 8, mw - 16, mh - 16, 6);
    ctx.fill();
    ctx.stroke();
    // Table highlight
    ctx.fillStyle = '#6d4a38';
    ctx.beginPath();
    ctx.roundRect(mx + 14, my + 14, mw - 28, mh - 28, 4);
    ctx.fill();

    // --- CHARACTERS (sorted by Y for depth) ---
    const sorted = [...characters].sort((a, b) => a.pixelY - b.pixelY);
    for (const char of sorted) {
      const frames = charFrames.get(char.name);
      if (!frames) continue;

      const anim = char.state === 'typing' ? 'typing' : char.state === 'walking' ? 'walk' : 'idle';
      const dir: Direction = 'down';
      const animFrames = frames[anim]?.[dir] || frames.idle.down;
      const fi = Math.floor(frameRef.current / 6) % animFrames.length;
      const sprite = animFrames[fi];

      if (sprite) {
        // Characters positioned relative to their workstation (below the desk)
        const cx = char.pixelX * ZOOM;
        const cy = (char.pixelY + char.bounceOffset) * ZOOM;
        ctx.drawImage(sprite, cx + (T - sprite.width) / 2, cy);
      }

      // Name label
      ctx.fillStyle = 'rgba(10,10,10,0.7)';
      ctx.fillRect(
        char.pixelX * ZOOM + T / 2 - 24,
        char.pixelY * ZOOM - 6,
        48, 12
      );
      ctx.fillStyle = '#f2f4f3';
      ctx.font = 'bold 9px "Space Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        char.name.toUpperCase(),
        char.pixelX * ZOOM + T / 2,
        char.pixelY * ZOOM + 4
      );
    }
  }, [characters, ready, charFrames, furniture]);

  return (
    <div className="h-full panel bg-[--color-ink] flex flex-col">
      <div className="panel-header">
        <span>HEADQUARTERS</span>
        <span className="badge">LIVE VIEW</span>
      </div>

      <div ref={containerRef} className="flex-1 flex items-center justify-center overflow-hidden bg-[#1a1520]">
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          style={{
            width: CW * cssScale,
            height: CH * cssScale,
            imageRendering: 'pixelated',
          }}
        />
      </div>

      <div className="flex items-center gap-4 px-4 py-1.5 border-t-2 border-[--color-paper]/10 text-[9px] font-mono text-[--color-paper]/40">
        <span>AGENTS: 5</span>
        <span>OFFICE: {COLS}x{ROWS}</span>
        <span className="ml-auto text-[--color-teal]">MONITORING ACTIVE</span>
      </div>
    </div>
  );
}
