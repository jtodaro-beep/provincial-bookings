"use client";

import { useMemo, useState } from "react";
import { z } from "zod";
import { TABLES, MERGE_GROUPS, TIME_SLOTS, isClosedDay } from "./bookingConfig";

const BookingSchema = z.object({
  date: z.string().min(1, "Choose a date"),
  time: z.string().min(1, "Choose a time"),
  partySize: z.coerce.number().int().min(1).max(20),
  name: z.string().min(2, "Enter your name"),
  mobile: z.string().min(6, "Enter a mobile number"),
  email: z.string().email("Enter a valid email"),
  notes: z.string().optional(),
});

type Booking = z.infer<typeof BookingSchema>;

function findSeating(partySize: number) {
  // 1️⃣ Try single tables (smallest fitting first)
  const sortedSingles = [...TABLES].sort((a, b) => a.seats - b.seats);
  const single = sortedSingles.find((t) => t.seats >= partySize);
  if (single) {
    return { type: "single", tables: [single.id], seats: single.seats };
  }

  // 2️⃣ Try merge groups
  for (const group of MERGE_GROUPS) {
    const groupTables = TABLES.filter((t) =>
      group.tableIds.includes(t.id)
    );
    const totalSeats = groupTables.reduce((sum, t) => sum + t.seats, 0);

    if (totalSeats >= partySize) {
      return {
        type: "merge",
        tables: group.tableIds,
        seats: totalSeats,
      };
    }
  }

  return null;
}

export default function Home() {
  const [submitted, setSubmitted] = useState<Booking | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<Booking>({
    date: "",
    time: "",
    partySize: 2,
    name: "",
    mobile: "",
    email: "",
    notes: "",
  });

  const seating = form.partySize
    ? findSeating(Number(form.partySize))
    : null;

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

    if (isClosedDay(form.date)) {
      setErrors({ date: "We’re closed Sundays and Mondays." });
      return;
    }

    if (!seating) {
      setErrors({ partySize: "No tables available for this party size." });
      return;
    }

    const parsed = BookingSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]?.toString() ?? "form";
        if (!next[field]) next[field] = issue.message;
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
          <h1 className="text-2xl font-semibold">Booking Request Sent</h1>
          <p className="mt-2 text-sm text-zinc-600">
            We’ll confirm shortly.
          </p>

          <div className="mt-6 rounded-xl border p-4 text-sm">
            <p><strong>Date:</strong> {submitted.date}</p>
            <p><strong>Time:</strong> {submitted.time}</p>
            <p><strong>Party:</strong> {submitted.partySize}</p>
            <p><strong>Name:</strong> {submitted.name}</p>
            <p><strong>Mobile:</strong> {submitted.mobile}</p>
            <p><strong>Email:</strong> {submitted.email}</p>
          </div>

          <button
            onClick={() => setSubmitted(null)}
            className="mt-6 w-full rounded-xl bg-black text-white py-3"
          >
            Make another booking
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto max-w-md px-6 py-10">
        <h1 className="text-2xl font-semibold mb-6">Book a Table</h1>

        <form onSubmit={onSubmit} className="space-y-4">

          {/* Date */}
          <div>
            <label className="text-sm font-medium">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => onChange("date", e.target.value)}
              className="w-full border rounded-xl px-3 py-2"
            />
            {errors.date && (
              <p className="text-xs text-red-600">{errors.date}</p>
            )}
          </div>

          {/* Time */}
          <div>
            <label className="text-sm font-medium">Time</label>
            <select
              value={form.time}
              onChange={(e) => onChange("time", e.target.value)}
              className="w-full border rounded-xl px-3 py-2"
            >
              <option value="">Select a time</option>
              {TIME_SLOTS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {errors.time && (
              <p className="text-xs text-red-600">{errors.time}</p>
            )}
          </div>

          {/* Party Size */}
          <div>
            <label className="text-sm font-medium">Party size</label>
            <input
              type="number"
              min={1}
              max={20}
              value={form.partySize}
              onChange={(e) =>
                onChange("partySize", Number(e.target.value))
              }
              className="w-full border rounded-xl px-3 py-2"
            />

            {form.partySize && (
              <p className="text-xs mt-1 text-zinc-600">
                {seating
                  ? `Available: ${seating.tables.join("+")} (${seating.seats} seats)`
                  : "No available tables for this party size"}
              </p>
            )}

            {errors.partySize && (
              <p className="text-xs text-red-600">{errors.partySize}</p>
            )}
          </div>

          {/* Mobile */}
          <div>
            <label className="text-sm font-medium">Mobile</label>
            <input
              value={form.mobile}
              onChange={(e) => onChange("mobile", e.target.value)}
              className="w-full border rounded-xl px-3 py-2"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => onChange("email", e.target.value)}
              className="w-full border rounded-xl px-3 py-2"
            />
          </div>

          {/* Name */}
          <div>
            <label className="text-sm font-medium">Name</label>
            <input
              value={form.name}
              onChange={(e) => onChange("name", e.target.value)}
              className="w-full border rounded-xl px-3 py-2"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-black text-white rounded-xl py-3 mt-4"
          >
            Send booking request
          </button>
        </form>
      </div>
    </main>
  );
}