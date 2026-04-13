export const TILE_SIZE = 48;
export const MAP_COLS = 20;
export const MAP_ROWS = 14;
export const MAP_WIDTH = MAP_COLS * TILE_SIZE;
export const MAP_HEIGHT = MAP_ROWS * TILE_SIZE;

export enum Tile {
  FLOOR = 0,
  WALL = 1,
  DESK = 2,
  MEETING_TABLE = 3,
  BREAK_AREA = 4,
  PLANT = 5,
  MONITOR = 6,
}

export const TILE_COLORS: Record<Tile, number> = {
  [Tile.FLOOR]: 0x1a1f29,
  [Tile.WALL]: 0x0a0a0a,
  [Tile.DESK]: 0x4a3728,
  [Tile.MEETING_TABLE]: 0x3a2a1a,
  [Tile.BREAK_AREA]: 0x2a1a2a,
  [Tile.PLANT]: 0x1a5a2a,
  [Tile.MONITOR]: 0x2bb6b3,
};

export const WALKABLE = new Set([Tile.FLOOR, Tile.BREAK_AREA]);

/**
 * Office layout: 20x14 grid (matches PixelOffice.tsx COLS/ROWS)
 *
 * Left side (cols 1-12): main office with 5 workstations
 *   - Desks at (2,3), (7,3), (2,7), (7,7), (2,10)
 * Col 13: divider wall with doorway at rows 4-6
 * Right side (cols 14-19): break room + meeting area
 *   - Meeting table at (13,5) 3x3
 *   - Break room furniture at (15,8)
 */
// W=1, F=0, D=2, M=3, B=4, P=5, S=6
const W = Tile.WALL;
const F = Tile.FLOOR;
const D = Tile.DESK;
const M = Tile.MEETING_TABLE;
const B = Tile.BREAK_AREA;
const P = Tile.PLANT;

export const OFFICE_GRID: Tile[][] = [
  //0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19
  [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W], // 0
  [W, P, F, F, F, F, F, F, F, F, F, F, F, W, B, W, W, W, W, W], // 1 (Kitchen counter at 15-18)
  [W, F, F, F, F, F, F, F, F, F, F, F, F, W, B, F, F, B, W, W], // 2 (Shelf at 18)
  [W, F, D, D, D, F, F, D, D, D, F, F, P, W, B, B, B, B, B, W], // 3  desks
  [W, F, F, F, F, F, F, F, F, F, F, F, F, F, B, B, B, B, B, W], // 4  doorway
  [W, F, F, F, F, F, F, F, F, F, F, F, F, F, B, B, B, B, B, W], // 5  meeting floor (table removed)
  [W, F, F, F, F, F, F, F, F, F, F, F, F, F, B, B, B, B, B, W], // 6  doorway
  [W, F, D, D, D, F, F, D, D, D, F, F, F, W, B, B, B, B, B, W], // 7  desks
  [W, F, F, F, F, F, F, F, F, F, F, F, F, W, B, W, W, W, W, W], // 8  Sofa backrest (col 15-18)
  [W, F, F, F, F, F, F, F, F, F, F, F, F, W, B, B, B, B, B, W], // 9  Sofa seat / walk space
  [W, F, D, D, D, F, F, F, F, F, F, F, F, W, B, W, W, B, W, W], // 10 Coffee table (15-16), Plant (18)
  [W, P, F, F, F, F, F, F, F, F, F, F, F, W, B, B, B, B, B, W], // 11
  [W, F, F, F, F, F, F, F, F, F, F, F, F, W, B, B, B, B, P, W], // 12
  [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W], // 13
];

export function isWalkable(col: number, row: number): boolean {
  if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) return false;
  return WALKABLE.has(OFFICE_GRID[row][col]);
}
