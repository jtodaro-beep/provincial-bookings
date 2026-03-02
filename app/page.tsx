"use client";

import { useMemo, useState } from "react";
import { z } from "zod";
import { MERGE_GROUPS, TABLES, VENUE, buildTimeSlots, isClosedDay } from "./bookingConfig";

type SeatingSuggestion = { tables: string[]; seats: number; reason: string };

function sumSeats(tables: string[]) {
  return tables.reduce((acc, t) => acc + (TABLES[t] ?? 0), 0);
}

function combos<T>(arr: T[], k: number): T[][] {
  const res: T[][] = [];
  const walk = (start: number, path: T[]) => {
    if (path.length === k) return void res.push(path.slice());
    for (let i = start; i < arr.length; i++) {
      path.push(arr[i]);
      walk(i + 1, path);
      path.pop();
    }
  };
  walk(0, []);
  return res;
}

function findSeating(guests: number): SeatingSuggestion | null {
  if (!Number.isFinite(guests) || guests <= 0) return null;

  // 1) Try single table first (best fit / least wasted seats)
  const singleFits = Object.entries(TABLES)
    .map(([t, seats]) => ({ tables: [t], seats }))
    .filter((x) => x.seats >= guests)
    .sort((a, b) => a.seats - b.seats);

  if (singleFits.length) {
    return { ...singleFits[0], reason: "Single table" };
  }

  // 2) Try merge groups with caps (no cross-group mega combos)
  let best: SeatingSuggestion | null = null;

  for (const g of MERGE_GROUPS) {
    // Respect maxGuests cap per group (e.g. group4 max 6)
    if (g.maxGuests && guests > g.maxGuests) continue;

    const maxK = Math.min(g.maxTablesToCombine, g.tables.length);

    for (let k = 2; k <= maxK; k++) {
      const all = combos(g.tables, k)
        .map((tables) => ({ tables, seats: sumSeats(tables) }))
        .filter((x) => x.seats >= guests);

      for (const c of all) {
        const candidate: SeatingSuggestion = {
          tables: c.tables,
          seats: c.seats,
          reason: `Merge (${g.id})`,
        };

        if (!best) best = candidate;
        else {
          // choose least wasted seats; tie-breaker: fewer tables
          const wasteBest = best.seats - guests;
          const wasteNew = candidate.seats - guests;
          if (wasteNew < wasteBest) best = candidate;
          else if (wasteNew === wasteBest && candidate.tables.length < best.tables.length) best = candidate;
        }
      }
    }
  }

  return best;
}

// IMPORTANT: parse YYYY-MM-DD safely (avoids timezone/UTC shifting)
function parseISODateToLocal(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3) return null;
  const [y, m, d] = parts;
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

// Keep guests as TEXT while typing to avoid "012" issues.
const BookingSchema = z.object({
  date: z.string().min(1, "Choose a date"),
  time: z.string().min(1, "Choose a time"),
  guestsText: z
    .string()
    .min(1, "Enter number of guests")
    .refine((v) => /^\d+$/.test(v), "Guests must be a number")
    .transform((v) => Number(v))
    .refine((n) => n >= 1 && n <= VENUE.maxGuests, `Guests must be 1–${VENUE.maxGuests}`),
  mobile: z.string().min(6, "Enter a mobile number"),
  email: z.string().email("Enter a valid email"),
  name: z.string().min(2, "Enter your name"),
  notes: z.string().optional(),
});

type Submitted = {
  date: string;
  time: string;
  guests: number;
  mobile: string;
  email: string;
  name: string;
  notes?: string;
  seating?: SeatingSuggestion | null;
};

export default function Home() {
  const timeSlots = useMemo(() => buildTimeSlots(), []);

  const [submitted, setSubmitted] = useState<Submitted | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    date: "",
    time: "",
    guestsText: "",
    mobile: "",
    email: "",
    name: "",
    notes: "",
  });

  const dateObj = useMemo(() => parseISODateToLocal(form.date), [form.date]);
  const closed = useMemo(() => (dateObj ? isClosedDay(dateObj) : false), [dateObj]);

  const guestsNumber = useMemo(() => {
    if (!form.guestsText) return null;
    const n = Number(form.guestsText);
    return Number.isFinite(n) ? n : null;
  }, [form.guestsText]);

  const seating = useMemo(() => {
    if (!guestsNumber) return null;
    return findSeating(guestsNumber);
  }, [guestsNumber]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      const copy = { ...e };
      delete copy[key as string];
      return copy;
    });

    // If date changes, clear time (prevents stale selections)
    if (key === "date") {
      setForm((f) => ({ ...f, time: "" }));
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setSubmitted(null);

    const parsed = BookingSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const k = String(issue.path[0] ?? "form");
        next[k] = issue.message;
      }
      setErrors(next);
      return;
    }

    const d = parseISODateToLocal(form.date);
    if (!d) {
      setErrors((e) => ({ ...e, date: "Choose a valid date" }));
      return;
    }
    if (isClosedDay(d)) {
      setErrors((e) => ({ ...e, date: "Closed Sundays & Mondays" }));
      return;
    }

    const guests = parsed.data.guestsText;

    setSubmitted({
      date: form.date,
      time: form.time,
      guests,
      mobile: form.mobile,
      email: form.email,
      name: form.name,
      notes: form.notes || undefined,
      seating,
    });
  }

  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto max-w-md px-6 py-10">
        <p className="text-xs tracking-widest text-zinc-500">{VENUE.name}</p>
        <h1 className="mt-2 text-4xl font-semibold">Book a Table</h1>

        <p className="mt-3 text-sm text-zinc-600">
          Bookings every 30 minutes from 4:30pm. Last booking 8:30pm.
          <br />
          Closed Sundays &amp; Mondays.
        </p>

        <section className="mt-8 rounded-2xl border border-zinc-200 p-5 shadow-sm">
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium">Date</label>
              <input
                type="date"
                className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-base outline-none focus:border-zinc-900"
                value={form.date}
                onChange={(e) => update("date", e.target.value)}
              />
              {closed && form.date ? <p className="mt-2 text-sm text-red-600">Closed Sundays &amp; Mondays</p> : null}
              {errors.date ? <p className="mt-2 text-sm text-red-600">{errors.date}</p> : null}
            </div>

            <div>
              <label className="block text-sm font-medium">Time</label>
              <select
                className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-base outline-none focus:border-zinc-900"
                value={form.time}
                onChange={(e) => update("time", e.target.value)}
                disabled={!form.date || closed}
              >
                <option value="">Choose a time</option>
                {timeSlots.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {errors.time ? <p className="mt-2 text-sm text-red-600">{errors.time}</p> : null}
            </div>

            <div>
              <label className="block text-sm font-medium">Number of guests</label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={VENUE.maxGuests}
                className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-base outline-none focus:border-zinc-900"
                value={form.guestsText}
                onChange={(e) => update("guestsText", e.target.value)}
                placeholder="2"
              />
              {errors.guestsText ? <p className="mt-2 text-sm text-red-600">{errors.guestsText}</p> : null}

              {form.guestsText && guestsNumber && (
                <p className="mt-2 text-sm text-zinc-600">
                  {seating
                    ? `Seating suggestion: ${seating.tables.join(" + ")} (${seating.seats} seats)`
                    : "No available table merge for this number of guests"}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium">Mobile</label>
              <input
                className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-base outline-none focus:border-zinc-900"
                placeholder="04xx xxx xxx"
                value={form.mobile}
                onChange={(e) => update("mobile", e.target.value)}
              />
              {errors.mobile ? <p className="mt-2 text-sm text-red-600">{errors.mobile}</p> : null}
            </div>

            <div>
              <label className="block text-sm font-medium">Email</label>
              <input
                className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-base outline-none focus:border-zinc-900"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
              {errors.email ? <p className="mt-2 text-sm text-red-600">{errors.email}</p> : null}
            </div>

            <div>
              <label className="block text-sm font-medium">Name</label>
              <input
                className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-base outline-none focus:border-zinc-900"
                placeholder="Your name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
              />
              {errors.name ? <p className="mt-2 text-sm text-red-600">{errors.name}</p> : null}
            </div>

            <div>
              <label className="block text-sm font-medium">Notes (optional)</label>
              <textarea
                className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-base outline-none focus:border-zinc-900"
                rows={3}
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-zinc-900 px-5 py-4 text-base font-medium text-white shadow-sm"
              disabled={closed}
            >
              Send booking request
            </button>

            {submitted && (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-800">
                <p className="font-medium">Request captured</p>
                <p className="mt-1">
                  {submitted.date} at {submitted.time} — {submitted.guests} guests
                </p>
                {submitted.seating ? (
                  <p className="mt-1 text-zinc-600">
                    Seating: {submitted.seating.tables.join(" + ")} ({submitted.seating.seats} seats)
                  </p>
                ) : null}
                <p className="mt-2 text-zinc-600">Next step: admin confirmation + availability check.</p>
              </div>
            )}
          </form>
        </section>
      </div>
    </main>
  );
}