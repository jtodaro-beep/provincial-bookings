"use client";

import { useMemo, useState } from "react";
import { z } from "zod";
import { VENUE, ZONES, buildTimeSlots, isClosedDay } from "./bookingConfig";

const BookingSchema = z.object({
  date: z.string().min(1, "Choose a date"),
  time: z.string().min(1, "Choose a time"),
  guestsText: z
    .string()
    .min(1, "Enter number of guests")
    .refine((v) => /^\d+$/.test(v), "Guests must be a number")
    .transform((v) => Number(v))
    .refine((n) => n >= 1 && n <= VENUE.maxGuests, `Guests must be 1–${VENUE.maxGuests}`),
  zone: z.string().min(1, "Choose an area"),
  mobile: z.string().min(6, "Enter a mobile number"),
  email: z.string().email("Enter a valid email"),
  name: z.string().min(2, "Enter your name"),
  notes: z.string().optional(),
});

type Submitted = {
  date: string;
  time: string;
  guests: number;
  zone: string;
  mobile: string;
  email: string;
  name: string;
  notes?: string;
  assigned?: {
    table: string;
    seats: number;
  };
};

function parseISODateToLocal(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3) return null;
  const [y, m, d] = parts;
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export default function Home() {
  const timeSlots = useMemo(() => buildTimeSlots(), []);

  const [submitted, setSubmitted] = useState<Submitted | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    date: "",
    time: "",
    guestsText: "",
    zone: "",
    mobile: "",
    email: "",
    name: "",
    notes: "",
  });

  const dateObj = useMemo(() => parseISODateToLocal(form.date), [form.date]);
  const closed = useMemo(() => (dateObj ? isClosedDay(dateObj) : false), [dateObj]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      const copy = { ...e };
      delete copy[key as string];
      return copy;
    });
    setServerError("");

    if (key === "date") {
      setForm((f) => ({ ...f, time: "" }));
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setServerError("");
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

    if (!dateObj) {
      setErrors((e) => ({ ...e, date: "Choose a valid date" }));
      return;
    }

    if (isClosedDay(dateObj)) {
      setErrors((e) => ({ ...e, date: "Closed Sundays & Mondays" }));
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch("/api/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: form.date,
          time: form.time,
          guests: Number(form.guestsText),
          zone: form.zone,
          mobile: form.mobile,
          email: form.email,
          name: form.name,
          notes: form.notes,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setServerError(data.error || "Booking failed");
        return;
      }

      setSubmitted({
        date: form.date,
        time: form.time,
        guests: Number(form.guestsText),
        zone: form.zone,
        mobile: form.mobile,
        email: form.email,
        name: form.name,
        notes: form.notes || undefined,
        assigned: data.assigned,
      });

      setForm({
        date: "",
        time: "",
        guestsText: "",
        zone: "",
        mobile: "",
        email: "",
        name: "",
        notes: "",
      });
    } catch (err: any) {
      setServerError(err?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
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
              {closed && form.date ? (
                <p className="mt-2 text-sm text-red-600">Closed Sundays &amp; Mondays</p>
              ) : null}
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
                inputMode="numeric"
                className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-base outline-none focus:border-zinc-900"
                value={form.guestsText}
                onChange={(e) => update("guestsText", e.target.value.replace(/[^\d]/g, ""))}
                placeholder="2"
              />
              {errors.guestsText ? <p className="mt-2 text-sm text-red-600">{errors.guestsText}</p> : null}
            </div>

            <div>
              <label className="block text-sm font-medium">Preferred area</label>
              <select
                className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-base outline-none focus:border-zinc-900"
                value={form.zone}
                onChange={(e) => update("zone", e.target.value)}
              >
                <option value="">Choose an area</option>
                {ZONES.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.label}
                  </option>
                ))}
              </select>
              {errors.zone ? <p className="mt-2 text-sm text-red-600">{errors.zone}</p> : null}
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

            {serverError ? <p className="text-sm text-red-600">{serverError}</p> : null}

            <button
              type="submit"
              className="w-full rounded-2xl bg-zinc-900 px-5 py-4 text-base font-medium text-white shadow-sm disabled:opacity-60"
              disabled={closed || submitting}
            >
              {submitting ? "Booking..." : "Confirm booking"}
            </button>

            {submitted && (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-800">
                <p className="font-medium">Booking confirmed</p>
                <p className="mt-1">
                  {submitted.date} at {submitted.time} — {submitted.guests} guests ({submitted.zone})
                </p>
                {submitted.assigned ? (
                  <p className="mt-1 text-zinc-600">
                    Table: {submitted.assigned.table} ({submitted.assigned.seats} seats)
                  </p>
                ) : null}
              </div>
            )}
          </form>
        </section>

        <p className="mt-4 text-xs text-zinc-500">
          v0.4 • Automatic table allocation using Google Sheets.
        </p>
      </div>
    </main>
  );
}
