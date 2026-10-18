/** Shown instantly on navigation while the page's data loads (the database is a slow round trip away). */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-6">
      <span className="sr-only">Loading…</span>
      <div className="flex flex-col gap-2">
        <div className="h-8 w-48 rounded-xl bg-background-tertiary-default motion-safe:animate-pulse" />
        <div className="h-4 w-80 max-w-full rounded-md bg-background-secondary-default motion-safe:animate-pulse" />
      </div>
      <div className="h-10 w-full rounded-xl bg-background-secondary-default motion-safe:animate-pulse" />
      <div className="h-96 w-full rounded-3xl border border-border-button-default bg-background-secondary-default motion-safe:animate-pulse" />
    </div>
  );
}
