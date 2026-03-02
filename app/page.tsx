"use client";

import { useMemo, useState } from "react";
import { z } from "zod";
import { END_TIME, MERGE_GROUPS, OPEN_DAYS_CLOSED, SLOT_MINUTES, START_TIME, TABLES, type TableId } from "./bookingConfig";

/** ---------- helpers ---------- */

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function timeToMinutes(t: string) {
  const [hh, mm] = t.split(":").map(Number);
  return hh * 60 + mm;
}

function minutesToTime(m: number) {
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${pad2(hh)}:${pad2(mm)}`;
}

function buildTimeSlots(start: string, end: string, stepMinutes: number) {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  const out: string[] = [];
  for (let m = s; m <= e; m += stepMinutes) out.push(minutesToTime(m));
  return out;
}

function isClosedDay(dateISO: string) {
  // dateISO is "YYYY-MM-DD" from <input type="date">
  if (!dateISO) return false;
  const d = new Date(`${dateISO}T00:00:00`);
  const day = d.getDay(); // Sun=0 Mon=1 ...
  return (OPEN_DAYS_CLOSED as readonly number[]).includes(day);
}

function allCombos<T>(arr: T[]) {
  // non-empty subsets
  const res: T[][] = [];
  const n = arr.length;
  for (let mask = 1; mask < (1 << n); mask++) {
    const subset: T[] = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) subset.push(arr[i]);
    }
    res.push(subset);
  }
  return res;
}

type SeatingSuggestion = {
  tables: TableId[];
  seats: number;
};

function findSeating(partySize: number): SeatingSuggestion | null {
  if (!Number.isFinite(partySize) || partySize < 1) return null;

  // Build candidate "bookings" = either a single table, or a merged set within one merge group
  const candidates: TableId[][] = [];

  // 1) single tables (every table)
  Object.keys(TABLES).forEach((t) => candidates.push([t]));

  // 2) merge group subsets (any subset of a merge group counts as "merged tables")
  for (const group of MERGE_GROUPS) {
    for (const subset of allCombos(group)) {
      if (subset.length >= 2) candidates.push(subset);
    }
  }

  // Score candidates: smallest seats that fits, then smallest number of tables
  let best: SeatingSuggestion | null = null;

  for (const tables of candidates) {
    const seats = tables.reduce((sum, t) => sum + (TABLES[t] ?? 0), 0);
    if (seats < partySize) continue;

    const suggestion: SeatingSuggestion = { tables, seats };

    if (!best) {
      best = suggestion;
      continue;
    }

    // Prefer tighter fit
    if (suggestion.seats < best.seats) {
      best = suggestion;
      continue;
    }
    // If seats same, prefer fewer tables
    if (suggestion.seats === best.seats && suggestion.tables.length < best.tables.length) {
      best = suggestion;
      continue;
    }
  }

  return best;
}

/** ---------- validation ---------- */

const BookingSchema = z.object({
  date: z.string().min(1, "Choose a date"),
  time: z.string().min(1, "Choose a time"),
  partySize: z.coerce.number().int().min(1, "Party size must be at least 1").max(20, "Max 20"),
  mobile: z.string().min(6, "Enter a mobile number"),
  email: z.string().email("Enter a valid email"),
  name: z.string().min(2, "Enter your name"),
  notes: z.string().optional(),
});

type Booking = z.infer<typeof BookingSchema>;

export default function Home() {
  const timeSlots = useMemo(() => buildTimeSlots(START_TIME, END_TIME, SLOT_MINUTES), []);

  const [submitted, setSubmitted] = useState<Booking | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<Booking>({
    date: "",
    time: "",
    partySize: 2, // IMPORTANT: never start at 0
    mobile: "",
    email: "",
    name: "",
    notes: "",
  });

  const seating = useMemo(() => findSeating(Number(form.partySize)), [form.partySize]);

  function onChange<K extends keyof Booking>(key: K, value: Booking[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      const copy = { ...e };
      delete copy[key as string];
      return copy;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    // hard rule: closed days
    if (isClosedDay(form.date)) {
      setErrors((e2) => ({ ...e2, date: "Closed Sundays & Mondays" }));
      return;
    }

    const parsed = BookingSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }

    setSubmitted(parsed.data);
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-white text-zinc-900">
        <div className="mx-auto max-w-md px-6 py-10">
          <p className="text-xs tracking-widest text-zinc-500">THE PROVINCIAL</p>
          <h1 className="mt-2 text-3xl font-semibold">Booking request sent</h1>

          <div className="mt-6 rounded-2xl border border-zinc-200 p-5 shadow-sm">
            <div className="text-sm text-zinc-700 space-y-2">
              <p><span className="font-medium">Date:</span> {submitted.date}</p>
              <p><span className="font-medium">Time:</span> {submitted.time}</p>
              <p><span className="font-medium">Party size:</span> {submitted.partySize}</p>
              <p><span className="font-medium">Name:</span> {submitted.name}</p>
              <p><span className="font-medium">Mobile:</span> {submitted.mobile}</p>
              <p><span className="font-medium">Email:</span> {submitted.email}</p>
              {submitted.notes ? <p><span className="font-medium">Notes:</span> {submitted.notes}</p> : null}
            </div>

            <div className="mt-4 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-700">
              <p className="font-medium text-zinc-900">Seating suggestion (internal)</p>
              {seating ? (
                <p className="mt-1">
                  {seating.tables.join(" + ")} ({seating.seats} seats)
                </p>
              ) : (
                <p className="mt-1">No seating suggestion available.</p>
              )}
            </div>
          </div>

          <button
            className="mt-6 w-full rounded-2xl bg-zinc-900 px-5 py-4 text-white text-base font-medium"
            onClick={() => {
              setSubmitted(null);
              setForm((f) => ({ ...f, time: "", notes: "" }));
            }}
          >
            Make another request
          </button>

          <p className="mt-3 text-xs text-zinc-500">This is still a request form. Staff confirmation comes next.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto max-w-md px-6 py-10">
        <p className="text-xs tracking-widest text-zinc-500">THE PROVINCIAL</p>
        <h1 className="mt-2 text-4xl font-semibold">Book a Table</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Bookings every 30 minutes from <span className="font-medium">4:30pm</span>. Last booking <span className="font-medium">8:30pm</span>.
          <br />
          <span className="font-medium">Closed Sundays & Mondays.</span>
        </p>

        <form onSubmit={onSubmit} className="mt-7 rounded-2xl border border-zinc-200 p-5 shadow-sm space-y-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => {
                const v = e.target.value;
                onChange("date", v);

                // if they pick a closed day, show error immediately and clear time
                if (isClosedDay(v)) {
                  onChange("time", "");
                  setErrors((x) => ({ ...x, date: "Closed Sundays & Mondays" }));
                }
              }}
              className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-base"
            />
            {errors.date ? <p className="mt-1 text-sm text-red-600">{errors.date}</p> : null}
          </div>

          {/* Time */}
          <div>
            <label className="block text-sm font-medium">Time</label>
            <select
              value={form.time}
              onChange={(e) => onChange("time", e.target.value)}
              className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-base bg-white"
              disabled={!form.date || isClosedDay(form.date)}
            >
              <option value="">{!form.date ? "Choose a date first" : "Choose a time"}</option>
              {timeSlots.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {errors.time ? <p className="mt-1 text-sm text-red-600">{errors.time}</p> : null}
          </div>

          {/* Party size */}
          <div>
            <label className="block text-sm font-medium">Party size</label>
            <input
              type="number"
              min={1}
              step={1}
              value={form.partySize}
              onChange={(e) => {
                const n = Number(e.target.value);
                onChange("partySize", Number.isFinite(n) ? n : 1);
              }}
              className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-base"
            />
            {errors.partySize ? <p className="mt-1 text-sm text-red-600">{errors.partySize}</p> : null}

            <div className="mt-2 text-sm text-zinc-600">
              {seating ? (
                <span>
                  Seating suggestion: <span className="font-medium">{seating.tables.join(" + ")}</span> ({seating.seats} seats)
                </span>
              ) : (
                <span>No seating suggestion for this party size.</span>
              )}
            </div>
          </div>

          {/* Mobile */}
          <div>
            <label className="block text-sm font-medium">Mobile</label>
            <input
              type="tel"
              placeholder="04xx xxx xxx"
              value={form.mobile}
              onChange={(e) => onChange("mobile", e.target.value)}
              className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-base"
            />
            {errors.mobile ? <p className="mt-1 text-sm text-red-600">{errors.mobile}</p> : null}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => onChange("email", e.target.value)}
              className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-base"
            />
            {errors.email ? <p className="mt-1 text-sm text-red-600">{errors.email}</p> : null}
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input
              type="text"
              placeholder="Your name"
              value={form.name}
              onChange={(e) => onChange("name", e.target.value)}
              className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-base"
            />
            {errors.name ? <p className="mt-1 text-sm text-red-600">{errors.name}</p> : null}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium">Notes (optional)</label>
            <textarea
              placeholder="High chair, pram, allergies..."
              value={form.notes ?? ""}
              onChange={(e) => onChange("notes", e.target.value)}
              className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-base min-h-[96px]"
            />
          </div>

          <button
            type="submit"
            className="mt-2 w-full rounded-2xl bg-zinc-900 px-5 py-4 text-white text-base font-medium"
          >
            Send booking request
          </button>

          <p className="text-xs text-zinc-500">
            v0.3 • Rules enforced: Tue–Sat only, 30-min slots, last booking 8:30pm.
          </p>
        </form>
      </div>
    </main>
  );
}