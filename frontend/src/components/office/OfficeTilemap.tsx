import { useCallback } from 'react';
import { extend } from '@pixi/react';
import { Graphics as PixiGraphics, Container as PixiContainer } from 'pixi.js';
import { OFFICE_GRID, TILE_SIZE, MAP_COLS, MAP_ROWS, Tile } from '../../game/tilemap';

extend({ Graphics: PixiGraphics, Container: PixiContainer });

// Comic book office color palette
const FLOOR_COLOR = 0x1e2330;
const FLOOR_ALT = 0x222838;
const WALL_COLOR = 0x0a0a0a;
const WALL_TOP = 0x151520;

export default function OfficeTilemap() {
  const draw = useCallback((g: PixiGraphics) => {
    g.clear();

    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const tile = OFFICE_GRID[row][col];
        const x = col * TILE_SIZE;
        const y = row * TILE_SIZE;

        switch (tile) {
          case Tile.WALL:
            // Wall with depth effect
            g.rect(x, y, TILE_SIZE, TILE_SIZE);
            g.fill(WALL_COLOR);
            // Top highlight
            g.rect(x, y, TILE_SIZE, 4);
            g.fill(WALL_TOP);
            // Brick pattern
            if (row > 0 && row < MAP_ROWS - 1) {
              const offset = row % 2 === 0 ? 0 : TILE_SIZE / 2;
              g.moveTo(x + offset, y);
              g.lineTo(x + offset, y + TILE_SIZE);
              g.stroke({ color: 0x1a1a2a, width: 1 });
              g.moveTo(x, y + TILE_SIZE / 2);
              g.lineTo(x + TILE_SIZE, y + TILE_SIZE / 2);
              g.stroke({ color: 0x1a1a2a, width: 1 });
            }
            break;

          case Tile.FLOOR:
            // Checkerboard floor
            g.rect(x, y, TILE_SIZE, TILE_SIZE);
            g.fill((col + row) % 2 === 0 ? FLOOR_COLOR : FLOOR_ALT);
            // Subtle grid
            g.rect(x, y, TILE_SIZE, TILE_SIZE);
            g.stroke({ color: 0x2a3040, width: 0.5 });
            break;

          case Tile.DESK:
            // Floor underneath
            g.rect(x, y, TILE_SIZE, TILE_SIZE);
            g.fill(FLOOR_COLOR);
            // Desk surface
            g.roundRect(x + 3, y + 6, TILE_SIZE - 6, TILE_SIZE - 10, 2);
            g.fill(0x5c3d2e);
            g.roundRect(x + 3, y + 6, TILE_SIZE - 6, TILE_SIZE - 10, 2);
            g.stroke({ color: 0x0a0a0a, width: 2 });
            // Desk top highlight
            g.rect(x + 5, y + 8, TILE_SIZE - 10, 3);
            g.fill(0x6d4a38);
            // Drawer
            g.rect(x + 8, y + TILE_SIZE - 12, TILE_SIZE - 16, 6);
            g.fill(0x4a3020);
            g.rect(x + 8, y + TILE_SIZE - 12, TILE_SIZE - 16, 6);
            g.stroke({ color: 0x0a0a0a, width: 1 });
            // Drawer knob
            g.circle(x + TILE_SIZE / 2, y + TILE_SIZE - 9, 2);
            g.fill(0xf9d616);
            break;

          case Tile.MONITOR:
            // Floor underneath
            g.rect(x, y, TILE_SIZE, TILE_SIZE);
            g.fill(FLOOR_COLOR);
            // Monitor body
            g.roundRect(x + 6, y + 4, TILE_SIZE - 12, TILE_SIZE - 16, 2);
            g.fill(0x0a0a0a);
            g.roundRect(x + 6, y + 4, TILE_SIZE - 12, TILE_SIZE - 16, 2);
            g.stroke({ color: 0x333, width: 1 });
            // Screen (glowing)
            g.roundRect(x + 8, y + 6, TILE_SIZE - 16, TILE_SIZE - 22, 1);
            g.fill(0x1a3a3a);
            // Screen text lines
            for (let i = 0; i < 3; i++) {
              const lineWidth = 8 + Math.random() * 12;
              g.rect(x + 10, y + 9 + i * 5, lineWidth, 2);
              g.fill(0x2bb6b3);
            }
            // Stand
            g.rect(x + TILE_SIZE / 2 - 3, y + TILE_SIZE - 12, 6, 6);
            g.fill(0x333333);
            // Base
            g.rect(x + TILE_SIZE / 2 - 8, y + TILE_SIZE - 7, 16, 3);
            g.fill(0x333333);
            break;

          case Tile.MEETING_TABLE:
            // Floor underneath
            g.rect(x, y, TILE_SIZE, TILE_SIZE);
            g.fill(FLOOR_ALT);
            // Table surface
            g.roundRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4, 4);
            g.fill(0x3a2a1a);
            g.roundRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4, 4);
            g.stroke({ color: 0x0a0a0a, width: 2 });
            // Table top highlight
            g.roundRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8, 3);
            g.fill(0x4a3828);
            // Center decoration
            g.circle(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 4);
            g.fill(0xf9d616);
            g.circle(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 4);
            g.stroke({ color: 0x0a0a0a, width: 1 });
            break;

          case Tile.BREAK_AREA:
            // Floor underneath
            g.rect(x, y, TILE_SIZE, TILE_SIZE);
            g.fill(0x1a1525);
            // Cozy rug pattern
            g.roundRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4, 3);
            g.fill(0x2a1a2a);
            g.roundRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4, 3);
            g.stroke({ color: 0x3a2a3a, width: 1 });
            // Rug pattern
            g.rect(x + 6, y + TILE_SIZE / 2 - 1, TILE_SIZE - 12, 2);
            g.fill(0x4a2a4a);
            g.rect(x + TILE_SIZE / 2 - 1, y + 6, 2, TILE_SIZE - 12);
            g.fill(0x4a2a4a);
            break;

          case Tile.PLANT:
            // Floor underneath
            g.rect(x, y, TILE_SIZE, TILE_SIZE);
            g.fill((col + row) % 2 === 0 ? FLOOR_COLOR : FLOOR_ALT);
            // Pot
            g.roundRect(x + TILE_SIZE / 2 - 8, y + TILE_SIZE - 14, 16, 12, 2);
            g.fill(0x8b4513);
            g.roundRect(x + TILE_SIZE / 2 - 8, y + TILE_SIZE - 14, 16, 12, 2);
            g.stroke({ color: 0x0a0a0a, width: 2 });
            // Leaves
            g.circle(x + TILE_SIZE / 2, y + TILE_SIZE / 2 - 4, 10);
            g.fill(0x2a8a3a);
            g.circle(x + TILE_SIZE / 2, y + TILE_SIZE / 2 - 4, 10);
            g.stroke({ color: 0x0a0a0a, width: 2 });
            g.circle(x + TILE_SIZE / 2 - 6, y + TILE_SIZE / 2 - 8, 6);
            g.fill(0x3aaa4a);
            g.circle(x + TILE_SIZE / 2 + 5, y + TILE_SIZE / 2 - 6, 5);
            g.fill(0x3aaa4a);
            break;
        }
      }
    }
  }, []);

  return <pixiGraphics draw={draw} />;
}
