export const VENUE = {
  name: "THE PROVINCIAL",
  maxGuests: 20,
  startTime: "16:30",
  endTime: "20:30",
  intervalMinutes: 30,
  closedWeekdays: [0, 1],
};

export const ZONES = [
  { id: "ENTRY", label: "Entry" },
  { id: "BAR", label: "Bar" },
  { id: "BOOTH", label: "The Booth" },
  { id: "COURTYARD", label: "Courtyard" },
];

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
  T18: 2,
  T19: 12,
  T30: 4,
  T31: 4,
  T34: 2,
  T35: 2,
  T36: 2,
  T37: 2,
};

export const TABLE_MIN_GUESTS: Record<string, number> = {
  T10: 6,
  T15: 8,
  T19: 8,
};

export const TABLE_ZONES: Record<string, string[]> = {
  ENTRY: ["T30", "T31", "T34", "T35", "T36", "T37"],
  BAR: ["T1", "T2", "T3", "T4", "T5"],
  BOOTH: ["T10"],
  COURTYARD: ["T11", "T12", "T13", "T14", "T15", "T18", "T19"],
};

export function buildTimeSlots() {
  const [sh, sm] = VENUE.startTime.split(":").map(Number);
  const [eh, em] = VENUE.endTime.split(":").map(Number);

  const start = sh * 60 + sm;
  const end = eh * 60 + em;

  const slots: string[] = [];

  for (let m = start; m <= end; m += VENUE.intervalMinutes) {
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    slots.push(`${hh}:${mm}`);
  }

  return slots;
}

export function isClosedDay(d: Date) {
  return VENUE.closedWeekdays.includes(d.getDay());
}
