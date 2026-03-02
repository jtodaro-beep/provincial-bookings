// app/bookingConfig.ts

export const VENUE = {
  name: "THE PROVINCIAL",
  closedDays: [0, 1] as const, // 0=Sunday, 1=Monday
  openTime: "16:30",
  lastBookingTime: "20:30",
  slotMinutes: 30,
  maxGuests: 20,
};

// Base tables
export const TABLES: Record<string, number> = {
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

// Merge rules
// NOTE: group4 (T1..T5 zone) is capped to 6 guests total, even though seats add up.
export type MergeGroup = {
  id: string;
  tables: string[];
  maxTablesToCombine: number;
  maxGuests?: number;
};

export const MERGE_GROUPS: MergeGroup[] = [
  {
    id: "group1",
    tables: ["T34", "T35", "T36", "T37"],
    maxTablesToCombine: 2,
    maxGuests: 4, // 2x2
  },
  {
    id: "group2",
    tables: ["T30", "T31"],
    maxTablesToCombine: 2,
    maxGuests: 8, // 4+4
  },
  {
    id: "group3",
    tables: ["T13", "T14", "T18"],
    maxTablesToCombine: 3,
    maxGuests: 6, // 2+2+2
  },
  {
    id: "group4",
    tables: ["T1", "T2", "T3", "T4", "T5"],
    maxTablesToCombine: 2,
    maxGuests: 6, // ✅ your rule
  },
];

// Helpers
function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function toHHMM(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function buildTimeSlots(): string[] {
  const start = toMinutes(VENUE.openTime);
  const end = toMinutes(VENUE.lastBookingTime);
  const out: string[] = [];
  for (let t = start; t <= end; t += VENUE.slotMinutes) out.push(toHHMM(t));
  return out;
}

export function isClosedDay(date: Date) {
  return (VENUE.closedDays as readonly number[]).includes(date.getDay());
}