// Sprite loading and frame extraction for Pixel Agents-style characters
// Character sprite sheets are 112x96px: 7 columns × 3 rows
// Each frame is 16×32px
// Row 0: facing down, Row 1: facing up, Row 2: facing right

const CHAR_FRAME_W = 16;
const CHAR_FRAME_H = 32;
const FRAMES_PER_ROW = 7;

export type Direction = 'down' | 'up' | 'right' | 'left';

export interface CharacterFrames {
  walk: Record<Direction, HTMLCanvasElement[]>;
  typing: Record<Direction, HTMLCanvasElement[]>;
  idle: Record<Direction, HTMLCanvasElement[]>;
}

const spriteCache = new Map<string, HTMLImageElement>();
const frameCache = new Map<string, CharacterFrames>();

export async function loadImage(src: string): Promise<HTMLImageElement> {
  if (spriteCache.has(src)) return spriteCache.get(src)!;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      spriteCache.set(src, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
}

function extractFrame(
  img: HTMLImageElement,
  col: number,
  row: number,
  scale: number = 2
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = CHAR_FRAME_W * scale;
  canvas.height = CHAR_FRAME_H * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    img,
    col * CHAR_FRAME_W,
    row * CHAR_FRAME_H,
    CHAR_FRAME_W,
    CHAR_FRAME_H,
    0,
    0,
    CHAR_FRAME_W * scale,
    CHAR_FRAME_H * scale
  );
  return canvas;
}

export async function loadCharacterFrames(
  charIndex: number,
  scale: number = 2
): Promise<CharacterFrames> {
  const key = `char_${charIndex}_${scale}`;
  if (frameCache.has(key)) return frameCache.get(key)!;

  const img = await loadImage(`/assets/characters/char_${charIndex}.png`);

  // Extract frames per direction
  // Row 0 = down, Row 1 = up, Row 2 = right
  const dirRows: [Direction, number][] = [
    ['down', 0],
    ['up', 1],
    ['right', 2],
  ];

  const frames: CharacterFrames = {
    walk: { down: [], up: [], right: [], left: [] },
    typing: { down: [], up: [], right: [], left: [] },
    idle: { down: [], up: [], right: [], left: [] },
  };

  for (const [dir, row] of dirRows) {
    // Walk: frames 0, 1, 2, 1 (looping)
    const w0 = extractFrame(img, 0, row, scale);
    const w1 = extractFrame(img, 1, row, scale);
    const w2 = extractFrame(img, 2, row, scale);
    frames.walk[dir] = [w0, w1, w2, w1];

    // Typing: frames 3, 4
    frames.typing[dir] = [
      extractFrame(img, 3, row, scale),
      extractFrame(img, 4, row, scale),
    ];

    // Idle: frame 0 (standing still)
    frames.idle[dir] = [w0];

    // Left = mirrored right
    if (dir === 'right') {
      frames.walk['left'] = frames.walk['right'].map((c) => mirrorCanvas(c));
      frames.typing['left'] = frames.typing['right'].map((c) => mirrorCanvas(c));
      frames.idle['left'] = frames.idle['right'].map((c) => mirrorCanvas(c));
    }
  }

  frameCache.set(key, frames);
  return frames;
}

function mirrorCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(source, 0, 0);
  return canvas;
}

// Load a furniture/floor/wall image
export async function loadSprite(src: string, scale: number = 2): Promise<HTMLCanvasElement> {
  const img = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}
