export const TILE_SIZE = 48;
export const MAP_COLS = 16;
export const MAP_ROWS = 12;
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

// Colors for each tile type (comic book style)
export const TILE_COLORS: Record<Tile, number> = {
  [Tile.FLOOR]: 0x1a1f29,
  [Tile.WALL]: 0x0a0a0a,
  [Tile.DESK]: 0x4a3728,
  [Tile.MEETING_TABLE]: 0x3a2a1a,
  [Tile.BREAK_AREA]: 0x2a1a2a,
  [Tile.PLANT]: 0x1a5a2a,
  [Tile.MONITOR]: 0x2bb6b3,
};

// Walkable tiles
export const WALKABLE = new Set([Tile.FLOOR, Tile.BREAK_AREA]);

// Office layout: 16x12 grid
// W=wall, .=floor, D=desk, M=meeting table, B=break area, P=plant, S=monitor/screen
export const OFFICE_GRID: Tile[][] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 1],
  [1, 0, 2, 6, 0, 2, 6, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 2, 6, 0, 2, 6, 0, 0, 0, 3, 3, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 1],
  [1, 0, 2, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0, 5, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

export function isWalkable(col: number, row: number): boolean {
  if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) return false;
  return WALKABLE.has(OFFICE_GRID[row][col]);
}
