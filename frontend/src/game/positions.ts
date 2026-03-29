// Tile coordinates for agent desks (col, row) — where agents sit
export const DESK_POSITIONS: Record<string, { col: number; row: number }> = {
  Chief: { col: 2, row: 2 },
  Hawk: { col: 5, row: 2 },
  Radar: { col: 2, row: 4 },
  'Bounty Hunter': { col: 5, row: 4 },
  Buddy: { col: 2, row: 6 },
};

// Standing positions next to desks (where characters stand/sit)
export const SEAT_POSITIONS: Record<string, { col: number; row: number }> = {
  Chief: { col: 2, row: 3 },
  Hawk: { col: 5, row: 3 },
  Radar: { col: 2, row: 5 },
  'Bounty Hunter': { col: 5, row: 5 },
  Buddy: { col: 2, row: 7 },
};

// Meeting table seats (where agents go during meetings)
export const MEETING_POSITIONS: Record<string, { col: number; row: number }> = {
  Chief: { col: 9, row: 4 },
  Hawk: { col: 12, row: 4 },
  Radar: { col: 9, row: 5 },
  'Bounty Hunter': { col: 12, row: 5 },
  Buddy: { col: 10, row: 3 },
};

// Break area (Buddy goes here for break reminders)
export const BREAK_POSITION = { col: 9, row: 8 };
