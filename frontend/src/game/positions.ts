// Tile coordinates for agent desks (col, row) — where agents sit
export const DESK_POSITIONS: Record<string, { col: number; row: number }> = {
  Chief: { col: 2, row: 2 },
  Hawk: { col: 5, row: 2 },
  Radar: { col: 2, row: 4 },
  Tracker: { col: 5, row: 4 },
  Beans: { col: 2, row: 6 },
};

// Standing positions next to desks (where characters stand/sit)
export const SEAT_POSITIONS: Record<string, { col: number; row: number }> = {
  Chief: { col: 2, row: 3 },
  Hawk: { col: 5, row: 3 },
  Radar: { col: 2, row: 5 },
  Tracker: { col: 5, row: 5 },
  Beans: { col: 2, row: 7 },
};

// Meeting table seats (where agents go during meetings)
export const MEETING_POSITIONS: Record<string, { col: number; row: number }> = {
  Chief: { col: 9, row: 4 },
  Hawk: { col: 12, row: 4 },
  Radar: { col: 9, row: 5 },
  Tracker: { col: 12, row: 5 },
  Beans: { col: 10, row: 3 },
};

// Break area (Beans goes here for break reminders)
export const BREAK_POSITION = { col: 9, row: 8 };
