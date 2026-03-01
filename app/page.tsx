"use client";

import { useMemo, useState } from "react";
import { z } from "zod";

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

const OFF_PEAK = [
  { start: "16:30", end: "18:00" },
  { start: "20:00", end: "21:00" },
];

function isOffPeak(time: string) {
  return OFF_PEAK.some(({ start, end }) => time >= start && time < end);
}

function labelFor(time: string) {
  return isOffPeak(time) ? "Off-Peak (Better Value)" : "Peak (High Demand)";
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

  const band = useMemo(() => (form.time ? labelFor(form.time) : ""), [form.time]);

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

    // Phase 6 will send to database / email / admin dashboard.
    setSubmitted(parsed.data);
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-white text-zinc-900">
        <div className="mx-auto max-w-md px-6 py-10">
          <p className="text-xs tracking-widest text-zinc-500">THE PROVINCIAL</p>
          <h1 className="mt-2 text-2xl font-semibold">Booking Request Sent</h1>
          <p className="mt-2 text-sm text-zinc-600">
            We’ll confirm shortly. If it’s urgent, call the venue.
          </p>

          <div className="mt-8 rounded-2xl border border-zinc-200 p-5 shadow-sm">
            <div className="space-y-2 text-sm">
              <Row label="Date" value={submitted.date} />
              <Row label="Time" value={submitted.time} />
              <Row label="Party" value={`${submitted.partySize}`} />
              <Row label="Name" value={submitted.name} />
              <Row label="Mobile" value={submitted.mobile} />
              <Row label="Email" value={submitted.email} />
              <Row label="Time band" value={labelFor(submitted.time)} />
              {submitted.notes ? <Row label="Notes" value={submitted.notes} /> : null}
            </div>
          </div>

          <button
            onClick={() => setSubmitted(null)}
            className="mt-6 w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Make another booking
          </button>

          <p className="mt-6 text-xs text-zinc-500">v0.2 • Live</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto max-w-md px-6 py-10">
        <header className="mb-8">
          <p className="text-xs tracking-widest text-zinc-500">THE PROVINCIAL</p>
          <h1 className="mt-2 text-2xl font-semibold">Book a Table</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Choose a time. Off-Peak shows better value. Peak is high demand.
          </p>
        </header>

        <section className="rounded-2xl border border-zinc-200 p-5 shadow-sm">
          <h2 className="text-sm font-medium text-zinc-900">Request a booking</h2>

          <form onSubmit={onSubmit} className="mt-4 space-y-4">
            <Field label="Date" error={errors.date}>
              <input
                type="date"
                value={form.date}
                onChange={(e) => onChange("date", e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              />
            </Field>

            <Field
              label="Time"
              hint={band ? band : "Off-Peak: 4:30–6:00pm • 8:00–9:00pm"}
              error={errors.time}
            >
              <input
                type="time"
                value={form.time}
                onChange={(e) => onChange("time", e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Party size" error={errors.partySize}>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={form.partySize}
                  onChange={(e) => onChange("partySize", e.target.value as any)}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                />
              </Field>

              <Field label="Mobile" error={errors.mobile}>
                <input
                  inputMode="tel"
                  placeholder="04xx xxx xxx"
                  value={form.mobile}
                  onChange={(e) => onChange("mobile", e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                />
              </Field>
            </div>

            <Field label="Email" error={errors.email}>
              <input
                type="email"
                inputMode="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => onChange("email", e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              />
            </Field>

            <Field label="Name" error={errors.name}>
              <input
                placeholder="Your name"
                value={form.name}
                onChange={(e) => onChange("name", e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              />
            </Field>

            <Field label="Notes (optional)">
              <textarea
                rows={3}
                placeholder="High chair, pram, allergies..."
                value={form.notes ?? ""}
                onChange={(e) => onChange("notes", e.target.value)}
                className="w-full resize-none rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              />
            </Field>

            <button
              type="submit"
              className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Send booking request
            </button>

            <p className="text-xs text-zinc-500">
              v0.2 • This is a request form. Confirmation comes next.
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-sm font-medium text-zinc-900">{label}</label>
        {hint ? <span className="text-xs text-zinc-500">{hint}</span> : null}
      </div>
      <div className="mt-1">{children}</div>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium text-zinc-900">{value}</span>
    </div>
  );
}