export type Table = { id: string; seats: number };
export type MergeGroup = { id: string; tableIds: string[] };

export const TABLES: Table[] = [
  { id: "T1", seats: 4 },
  { id: "T2", seats: 2 },
  { id: "T3", seats: 4 },
  { id: "T4", seats: 2 },
  { id: "T5", seats: 4 },
  { id: "T10", seats: 8 },
  { id: "T11", seats: 6 },
  { id: "T12", seats: 4 },
  { id: "T13", seats: 2 },
  { id: "T14", seats: 2 },
  { id: "T15", seats: 12 },
  { id: "T16", seats: 2 },
  { id: "T17", seats: 2 },
  { id: "T18", seats: 2 },
  { id: "T19", seats: 12 },
  { id: "T30", seats: 4 },
  { id: "T31", seats: 4 },
  { id: "T34", seats: 2 },
  { id: "T35", seats: 2 },
  { id: "T36", seats: 2 },
  { id: "T37", seats: 2 },
];

export const MERGE_GROUPS: MergeGroup[] = [
  { id: "G1", tableIds: ["T34", "T35", "T36", "T37"] },
  { id: "G2", tableIds: ["T30", "T31"] },
  { id: "G3", tableIds: ["T13", "T14", "T18"] },
  { id: "G4", tableIds: ["T1", "T2", "T3", "T4", "T5"] },
];

// Booking times (30 min intervals) — edit end time later if you want.
export const TIME_SLOTS = [
  "16:30","17:00","17:30",
  "18:00","18:30","19:00","19:30",
  "20:00","20:30","21:00",
];

export function isClosedDay(dateStr: string) {
  if (!dateStr) return false;
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay(); // 0=Sun, 1=Mon
  return day === 0 || day === 1;
}