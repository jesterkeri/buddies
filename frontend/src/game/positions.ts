/**
 * Tile coordinates for agent positions.
 * MUST match where PixelOffice.tsx draws furniture:
 *   Workstations: WORKSTATIONS array (desks are 3 tiles wide, 2 tiles tall)
 *   Meeting table: MEETING = {col:13, row:5, w:3, h:3}
 *   Break room: BREAK_ROOM = {col:14, row:0, w:6, h:14}
 */

// Where agents sit — 1 tile below desk center (desk drawn at workstation col/row)
export const SEAT_POSITIONS: Record<string, { col: number; row: number }> = {
  Chief:          { col: 3,  row: 5  }, // desk at col:2/row:3, sit below center
  Hawk:           { col: 8,  row: 5  }, // desk at col:7/row:3
  Radar:          { col: 3,  row: 9  }, // desk at col:2/row:7
  'Bounty Hunter': { col: 8,  row: 9  }, // desk at col:7/row:7
  Buddy:          { col: 3,  row: 12 }, // desk at col:2/row:10
};

// Meeting table seats — around the table at col:13/row:5 (3x3)
export const MEETING_POSITIONS: Record<string, { col: number; row: number }> = {
  Chief:          { col: 13, row: 5  },
  Hawk:           { col: 15, row: 5  },
  Radar:          { col: 13, row: 7  },
  'Bounty Hunter': { col: 15, row: 7  },
  Buddy:          { col: 14, row: 5  },
};

// Break area — sofa in break room (sofa drawn at col:15/row:8)
export const BREAK_POSITION = { col: 15, row: 9 };
