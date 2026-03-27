import { isWalkable } from './tilemap';

export interface Point {
  col: number;
  row: number;
}

const DIRECTIONS: [number, number][] = [
  [0, -1], // up
  [0, 1],  // down
  [-1, 0], // left
  [1, 0],  // right
];

export function findPath(start: Point, goal: Point): Point[] {
  if (start.col === goal.col && start.row === goal.row) return [];
  if (!isWalkable(goal.col, goal.row)) return [];

  const queue: { point: Point; path: Point[] }[] = [
    { point: start, path: [start] },
  ];
  const visited = new Set<string>();
  visited.add(`${start.col},${start.row}`);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const { point, path } = current;

    for (const [dc, dr] of DIRECTIONS) {
      const next: Point = { col: point.col + dc, row: point.row + dr };
      const key = `${next.col},${next.row}`;

      if (visited.has(key)) continue;
      if (!isWalkable(next.col, next.row)) continue;

      const newPath = [...path, next];

      if (next.col === goal.col && next.row === goal.row) {
        return newPath.slice(1); // exclude start position
      }

      visited.add(key);
      queue.push({ point: next, path: newPath });
    }
  }

  return []; // no path found
}
