// app/bookingConfig.ts

export type TableId = string;

export const TABLES: Record<TableId, number> = {
  T1: 4,
  T2: 2,
  T3: 4,
  T4: 2,
  T5: 4,
  T10: 8,
  T11: 6,
  T12: 4,
  T13: 2,
  T14: 2,
  T15: 12,
  T16: 2,
  T17: 2,
  T18: 2,
  T19: 12,
  T30: 4,
  T31: 4,
  T34: 2,
  T35: 2,
  T36: 2,
  T37: 2,
};

export const MERGE_GROUPS: TableId[][] = [
  // MERGE GROUP 1
  ["T34", "T35", "T36", "T37"],

  // MERGE GROUP 2
  ["T30", "T31"],

  // MERGE GROUP 3
  ["T13", "T14", "T18"],

  // MERGE GROUP 4
  ["T1", "T2", "T3", "T4", "T5"],
];

// Booking rules
export const OPEN_DAYS_CLOSED = [0, 1] as const; // Sunday=0, Monday=1
export const START_TIME = "16:30";
export const END_TIME = "20:30"; // last booking time
export const SLOT_MINUTES = 30;