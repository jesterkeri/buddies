import type { Point } from './pathfinding';
import { findPath } from './pathfinding';
import { SEAT_POSITIONS, MEETING_POSITIONS, BREAK_POSITION } from './positions';
import { TILE_SIZE } from './tilemap';

export type CharacterState = 'idle' | 'walking' | 'typing' | 'meeting' | 'break';

export interface CharacterData {
  name: string;
  color: number;
  col: number;
  row: number;
  pixelX: number;
  pixelY: number;
  state: CharacterState;
  path: Point[];
  pathIndex: number;
  bounceOffset: number;
  bounceDir: number;
}

const WALK_SPEED = 2; // pixels per frame

export function createCharacter(name: string, color: number): CharacterData {
  const seat = SEAT_POSITIONS[name] || { col: 1, row: 1 };
  return {
    name,
    color,
    col: seat.col,
    row: seat.row,
    pixelX: seat.col * TILE_SIZE,
    pixelY: seat.row * TILE_SIZE,
    state: 'idle',
    path: [],
    pathIndex: 0,
    bounceOffset: 0,
    bounceDir: 1,
  };
}

export function getTargetPosition(name: string, agentStatus: string): Point {
  if (agentStatus === 'MEETING') {
    return MEETING_POSITIONS[name] || SEAT_POSITIONS[name];
  }
  if (agentStatus === 'BREAK' || (name === 'Buddy' && agentStatus === 'IDLE')) {
    // Buddy hangs out at break area when idle
  }
  // Default: go to desk
  return SEAT_POSITIONS[name] || { col: 1, row: 1 };
}

export function updateCharacter(char: CharacterData, agentStatus: string): CharacterData {
  const target = getTargetPosition(char.name, agentStatus);

  // Check if we need to move
  if (char.state !== 'walking' && (char.col !== target.col || char.row !== target.row)) {
    const path = findPath({ col: char.col, row: char.row }, target);
    if (path.length > 0) {
      return { ...char, state: 'walking', path, pathIndex: 0 };
    }
  }

  // Walking logic
  if (char.state === 'walking' && char.path.length > 0) {
    const target = char.path[char.pathIndex];
    const targetX = target.col * TILE_SIZE;
    const targetY = target.row * TILE_SIZE;

    let { pixelX, pixelY } = char;

    // Move towards target pixel position
    if (pixelX < targetX) pixelX = Math.min(pixelX + WALK_SPEED, targetX);
    else if (pixelX > targetX) pixelX = Math.max(pixelX - WALK_SPEED, targetX);
    if (pixelY < targetY) pixelY = Math.min(pixelY + WALK_SPEED, targetY);
    else if (pixelY > targetY) pixelY = Math.max(pixelY - WALK_SPEED, targetY);

    // Reached current waypoint
    if (pixelX === targetX && pixelY === targetY) {
      const nextIndex = char.pathIndex + 1;
      if (nextIndex >= char.path.length) {
        // Reached destination
        const newState = mapStatusToState(agentStatus);
        return {
          ...char,
          pixelX, pixelY,
          col: target.col, row: target.row,
          state: newState,
          path: [],
          pathIndex: 0,
        };
      }
      return {
        ...char,
        pixelX, pixelY,
        col: target.col, row: target.row,
        pathIndex: nextIndex,
      };
    }

    return { ...char, pixelX, pixelY };
  }

  // Bounce animation for idle/typing
  let { bounceOffset, bounceDir } = char;
  const bounceSpeed = char.state === 'typing' ? 0.4 : 0.15;
  const bounceMax = char.state === 'typing' ? 3 : 2;

  bounceOffset += bounceDir * bounceSpeed;
  if (bounceOffset > bounceMax || bounceOffset < -bounceMax) {
    bounceDir *= -1;
  }

  return { ...char, bounceOffset, bounceDir };
}

function mapStatusToState(status: string): CharacterState {
  switch (status) {
    case 'MEETING': return 'meeting';
    case 'REVIEWING':
    case 'RESEARCHING':
    case 'SCANNING':
    case 'WORKING': return 'typing';
    case 'IDLE':
    default: return 'idle';
  }
}
