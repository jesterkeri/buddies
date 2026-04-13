import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useAgents, useAgentStates } from '../../api/hooks';
import { useSettings } from '../settings/settingsStore';
import { isAgentConnected } from '../../utils/agent-status';
import { createCharacter, updateCharacter, type CharacterData } from '../../game/characters';
import { loadCharacterFrames, loadImage, type CharacterFrames, type Direction } from '../../game/sprites';
import AgentChatBubble from './AgentChatBubble';

const AGENT_CHARS: Record<string, number> = {
  Chief: 0, Hawk: 1, Radar: 2, 'Bounty Hunter': 3, Buddy: 4,
};
const AGENT_COLORS: Record<string, number> = {
  Chief: 0x3b82f6, Hawk: 0xe41937, Radar: 0x2bb6b3, 'Bounty Hunter': 0xf9d616, Buddy: 0xa855f7,
};

const TILE = 16;
const ZOOM = 3;
const T = TILE * ZOOM;

const COLS = 20;
const ROWS = 14;
const CW = COLS * T;
const CH = ROWS * T;

// Warm Tech Startup Palette
const FLOOR_BASE = '#E2E8F0';
const FLOOR_GRID = '#CBD5E1';
const WALL_BASE = '#0F172A';
const BREAK_FLOOR = '#F1F5F9';

const WORKSTATIONS = [
  { agent: 'Chief',   col: 2,  row: 3 },
  { agent: 'Hawk',    col: 7,  row: 3 },
  { agent: 'Radar',   col: 2,  row: 7 },
  { agent: 'Bounty Hunter', col: 7,  row: 7 },
  { agent: 'Buddy',   col: 2,  row: 10 },
];

const MEETING = { col: 13, row: 5, w: 3, h: 3 };
const BREAK_ROOM = { col: 14, row: 0, w: 6, h: 14 };

interface PixelOfficeProps {
  onAgentClick?: (name: string) => void;
}

interface CanvasViewport {
  scale: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

export default function PixelOffice({ onAgentClick }: PixelOfficeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: agentStates } = useAgentStates();
  const { data: agents } = useAgents();
  const settings = useSettings();
  const [viewport, setViewport] = useState<CanvasViewport>({
    scale: 1, width: CW, height: CH, offsetX: 0, offsetY: 0,
  });
  const [characters, setCharacters] = useState<CharacterData[]>(() =>
    Object.entries(AGENT_COLORS).map(([name, color]) => createCharacter(name, color))
  );
  const [activeBubbleAgent, setActiveBubbleAgent] = useState<string | null>(null);
  const [charFrames, setCharFrames] = useState<Map<string, CharacterFrames>>(new Map());
  const [furniture, setFurniture] = useState<Map<string, HTMLImageElement>>(new Map());
  const [ready, setReady] = useState(false);
  const frameRef = useRef(0);

  const stateMap = new Map<string, string>();
  agentStates?.forEach((s) => stateMap.set(s.agentName, s.status));

  useEffect(() => {
    async function load() {
      const frames = new Map<string, CharacterFrames>();
      for (const [name, idx] of Object.entries(AGENT_CHARS)) {
        frames.set(name, await loadCharacterFrames(idx, ZOOM));
      }
      setCharFrames(frames);

      const furn = new Map<string, HTMLImageElement>();
      const assets = [
        ['plant', '/assets/furniture/PLANT/PLANT.png'],
        ['large_plant', '/assets/furniture/LARGE_PLANT/LARGE_PLANT.png'],
        ['bookshelf', '/assets/furniture/BOOKSHELF/BOOKSHELF.png'],
        ['coffee', '/assets/furniture/COFFEE/COFFEE.png'],
      ];
      for (const [key, src] of assets) {
        try { furn.set(key, await loadImage(src)); } catch {}
      }
      setFurniture(furn);
      setReady(true);
    }
    load();
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const updateViewport = () => {
      const { clientWidth, clientHeight } = node;
      if (!clientWidth || !clientHeight) return;
      const sx = clientWidth / CW;
      const sy = clientHeight / CH;
      const scale = Math.max(sx, sy);
      const width = CW * scale;
      const height = CH * scale;
      setViewport({
        scale, width, height,
        offsetX: (clientWidth - width) / 2,
        offsetY: (clientHeight - height) / 2,
      });
    };
    updateViewport();
    const observer = new ResizeObserver(updateViewport);
    observer.observe(node);
    window.addEventListener('resize', updateViewport);
    return () => { observer.disconnect(); window.removeEventListener('resize', updateViewport); };
  }, []);

  const visibleNames = useMemo(
    () => new Set(agents ? Object.keys(AGENT_COLORS).filter((name) => isAgentConnected(name, settings.aiConfig, agents)) : Object.keys(AGENT_COLORS)),
    [agents, settings.aiConfig]
  );

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const canvasX = ((e.clientX - rect.left) / rect.width) * CW;
    const canvasY = ((e.clientY - rect.top) / rect.height) * CH;

    for (const char of characters) {
      if (!visibleNames.has(char.name)) continue;
      const hitX = char.pixelX - 10;
      const hitY = char.pixelY - 20;
      const hitW = T + 20;
      const hitH = T * 2 + 20;

      if (canvasX >= hitX && canvasX <= hitX + hitW && canvasY >= hitY && canvasY <= hitY + hitH) {
        setActiveBubbleAgent(char.name);
        return;
      }
    }
  }, [characters, visibleNames]);

  useEffect(() => {
    if (!ready) return;
    const interval = setInterval(() => {
      frameRef.current++;
      setCharacters((prev) =>
        prev.map((c) => visibleNames.has(c.name) ? updateCharacter(c, stateMap.get(c.name) || 'IDLE') : c)
      );
    }, 1000 / 20);
    return () => clearInterval(interval);
  }, [ready, agentStates, visibleNames]);

  useEffect(() => {
    if (!activeBubbleAgent) return;
    if (!visibleNames.has(activeBubbleAgent)) {
      setActiveBubbleAgent(null);
    }
  }, [activeBubbleAgent, visibleNames]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const drawPanel = (x: number, y: number, w: number, h: number, fill: string | CanvasGradient, stroke?: string, radius = 6) => {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, radius);
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };

    const drawPill = (x: number, y: number, w: number, h: number, fill: string, stroke?: string) => {
      drawPanel(x, y, w, h, fill, stroke, h / 2);
    };

    const drawModernDesk = (ws: (typeof WORKSTATIONS)[number]) => {
      const dx = ws.col * T;
      const dy = ws.row * T;
      const accent = `#${AGENT_COLORS[ws.agent].toString(16).padStart(6, '0')}`;

      // Desk drop shadow
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.roundRect(dx + 4, dy + 22, T * 3 - 8, 20, 6);
      ctx.fill();

      // Main desk wooden surface
      drawPanel(dx + 4, dy + 16, T * 3 - 8, 20, '#D4A373', '#B08962', 6);
      
      // Monitor pedestal
      ctx.fillStyle = '#475569';
      ctx.fillRect(dx + T * 1.5 - 8, dy + 16, 16, 14);

      // Monitor Screen
      drawPanel(dx + T * 1.5 - 24, dy - 2, 48, 26, '#0F172A', '#1E293B', 4);
      // Screen glow
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(dx + T * 1.5 - 20, dy + 2, 40, 18);
      
      // Screen contents (mock code)
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(dx + T * 1.5 - 16, dy + 6, 20, 2);
      ctx.fillRect(dx + T * 1.5 - 16, dy + 10, 30, 2);
      ctx.fillRect(dx + T * 1.5 - 16, dy + 14, 15, 2);

      // Keyboard & accent mat
      ctx.fillStyle = accent;
      ctx.fillRect(dx + T * 1.5 - 30, dy + 26, 60, 8);
      ctx.fillStyle = '#334155';
      ctx.fillRect(dx + T * 1.5 - 16, dy + 28, 32, 4);

      // Coffee mug
      const coffee = furniture.get('coffee');
      if (coffee) ctx.drawImage(coffee, dx + T * 2.2, dy + 18, 14, 14);
    };

    const drawMeetingRoom = () => {
      const gx = (MEETING.col - 0.45) * T;
      const gy = (MEETING.row - 1.05) * T;
      const gw = 4.15 * T;
      const gh = 4.9 * T;

      // Clean glass footprint
      ctx.fillStyle = 'rgba(241, 245, 249, 0.04)';
      ctx.fillRect(gx + 14, gy + 10, gw - 28, gh - 26);
      
      // Screen on the wall
      drawPanel(gx + 38, gy + 18, 110, 24, '#0F172A', '#1E293B', 4);
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(gx + 42, gy + 22, 102, 16);
    };

    const drawBreakRoom = () => {
      const bx = BREAK_ROOM.col * T;

      // Clean tech kitchen counter
      drawPanel(bx + 20, T + 10, T * 4.6, 24, '#E2E8F0', '#94A3B8', 4);
      ctx.fillStyle = '#334155';
      ctx.fillRect(bx + 24, T + 34, T * 4.55, 14);

      // Sleek lounge rug
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.beginPath();
      ctx.roundRect(bx + 16, T * 8 + 8, T * 4.8, T * 2.5, 10);
      ctx.fill();
      drawPill(bx + 16, T * 8 + 6, T * 4.8, T * 2.5, '#475569', '#334155');

      // Modern couch silhouette - clean L-shape
      drawPanel(bx + 24, T * 7 + 24, T * 4.4, 30, '#1E293B', '#0F172A', 8);
      drawPanel(bx + 24, T * 8 + 6, T * 4.4, 40, '#334155', '#1E293B', 10);
      drawPanel(bx + 16, T * 8 + 10, 18, 50, '#1E293B', '#0F172A', 6);
      drawPanel(bx + T * 4.5, T * 8 + 10, 18, 50, '#1E293B', '#0F172A', 6);
      
      // Cushions (Terracotta, Sage)
      drawPill(bx + 40, T * 8 + 16, 40, 20, '#C2410C', '#9A3412');
      drawPill(bx + 100, T * 8 + 14, 32, 18, '#4D7C0F', '#3F6212');

      // Glass coffee table
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.ellipse(bx + 96, T * 10 + 34, 40, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      drawPill(bx + 64, T * 10 + 12, 64, 18, 'rgba(241,245,249,0.8)', '#94A3B8');

      // Plants and shelf
      const shelf = furniture.get('bookshelf');
      const plant = furniture.get('large_plant');
      if (shelf) ctx.drawImage(shelf, bx + T * 4.4, T * 2.1, T * 1.2, T * 2.6);
      if (plant) ctx.drawImage(plant, bx + T * 4.2, T * 10.2, T * 1.4, T * 2.2);
    };

    // CLEAR CANVAS
    ctx.fillStyle = FLOOR_BASE;
    ctx.fillRect(0, 0, CW, CH);

    // DRAW GRID / ROOMS
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const x = col * T;
        const y = row * T;
        const isWall = row === 0 || row === ROWS - 1 || col === 0 || col === COLS - 1 || (col === 13 && (row < 4 || row > 6));
        const isBreakRoom = col >= BREAK_ROOM.col;

        if (isWall) {
          ctx.fillStyle = WALL_BASE;
          ctx.fillRect(x, y, T, T);
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          ctx.fillRect(x, y + T - 6, T, 4);
        } else if (isBreakRoom) {
          ctx.fillStyle = BREAK_FLOOR;
          ctx.fillRect(x, y, T, T);
          ctx.strokeStyle = FLOOR_GRID;
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, T, T);
        } else {
          ctx.fillStyle = FLOOR_BASE;
          ctx.fillRect(x, y, T, T);
          ctx.strokeStyle = FLOOR_GRID;
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, T, T);
        }
      }
    }

    // DRAW FURNITURE
    for (const ws of WORKSTATIONS) {
      drawModernDesk(ws);
    }
    drawMeetingRoom();
    drawBreakRoom();

    const plant = furniture.get('large_plant');
    const smallPlant = furniture.get('plant');
    if (plant) ctx.drawImage(plant, T * 1.0, T * 0.95, T * 1.45, T * 2.25);
    if (smallPlant) {
      ctx.drawImage(smallPlant, T * 11.7, T * 1.15, T * 0.9, T * 1.3);
      ctx.drawImage(smallPlant, T * 1.15, T * 11.2, T * 0.9, T * 1.3);
    }

    // DRAW CHARACTERS
    const sorted = [...characters].filter((c) => visibleNames.has(c.name)).sort((a, b) => a.pixelY - b.pixelY);
    for (const char of sorted) {
      const frames = charFrames.get(char.name);
      if (!frames) continue;

      const anim = char.state === 'typing' ? 'typing' : char.state === 'walking' ? 'walk' : 'idle';
      const dir: Direction = 'down';
      const animFrames = frames[anim]?.[dir] || frames.idle.down;
      const fi = Math.floor(frameRef.current / 6) % animFrames.length;
      const sprite = animFrames[fi];

      if (sprite) {
        const cx = char.pixelX;
        const cy = char.pixelY + char.bounceOffset * ZOOM;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
        ctx.beginPath();
        ctx.ellipse(cx + T / 2, char.pixelY + T + 8, 18, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.drawImage(sprite, cx + (T - sprite.width) / 2, cy);
      }

      // Name label
      drawPanel(char.pixelX + T / 2 - 30, char.pixelY - 14, 60, 16, 'rgba(15, 23, 42, 0.9)', 'rgba(255,255,255,0.1)', 4);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 10px "Space Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(char.name.toUpperCase(), char.pixelX + T / 2, char.pixelY - 2);
    }
  }, [characters, ready, charFrames, furniture, visibleNames]);

  return (
    <div className="h-full panel bg-[--color-ink] flex flex-col">
      <div className="panel-header">
        <span>HEADQUARTERS</span>
        <span className="badge">LIVE VIEW</span>
      </div>

      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{ backgroundColor: WALL_BASE }}
      >
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          onClick={handleCanvasClick}
          style={{
            position: 'absolute',
            top: viewport.offsetY,
            left: viewport.offsetX,
            width: viewport.width,
            height: viewport.height,
            imageRendering: 'pixelated',
            cursor: onAgentClick ? 'pointer' : 'default',
          }}
        />

        {activeBubbleAgent && (() => {
          const bubbleChar = characters.find((char) => char.name === activeBubbleAgent);
          if (!bubbleChar || !visibleNames.has(bubbleChar.name)) return null;
          const bubbleX = viewport.offsetX + (bubbleChar.pixelX + T / 2) * viewport.scale;
          const bubbleY = viewport.offsetY + (bubbleChar.pixelY - 12) * viewport.scale;

          return (
          <AgentChatBubble
            agentName={bubbleChar.name}
            x={bubbleX}
            y={bubbleY}
            containerWidth={containerRef.current?.clientWidth || viewport.width}
            containerHeight={containerRef.current?.clientHeight || viewport.height}
            onClose={() => setActiveBubbleAgent(null)}
            onOpenComms={(name) => {
              setActiveBubbleAgent(null);
              onAgentClick?.(name);
            }}
          />
          );
        })()}
      </div>

      <div className="flex items-center gap-4 px-4 py-1.5 border-t-2 border-[--color-paper]/10 text-[9px] font-mono text-[--color-paper]/40">
        <span>AGENTS: {visibleNames.size}</span>
        <span>OFFICE: {COLS}x{ROWS}</span>
        <span className="ml-auto text-[--color-teal]">MONITORING ACTIVE</span>
      </div>
    </div>
  );
}
