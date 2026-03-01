export default function Home() {
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
          <h2 className="text-sm font-medium text-zinc-900">Time bands</h2>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">Off-Peak (Better Value)</p>
                <p className="text-zinc-600">4:30–6:00pm • 8:00–9:00pm</p>
              </div>
              <span className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600">
                Offers apply
              </span>
            </div>

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">Peak (High Demand)</p>
                <p className="text-zinc-600">6:00–8:00pm</p>
              </div>
              <span className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600">
                Standard
              </span>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-zinc-50 p-4">
            <p className="text-sm font-medium">Coming next:</p>
            <p className="mt-1 text-sm text-zinc-600">
              Booking form + availability + admin list.
            </p>
          </div>
        </section>

        <footer className="mt-8 text-xs text-zinc-500">
          v0.1 • Local build
        </footer>
      </div>
    </main>
  );
}
