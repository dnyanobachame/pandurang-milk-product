export default function AdminLoading({
  rows = 4,
}: {
  rows?: number;
}) {
  return (
    <div
      className="space-y-4"
      role="status"
      aria-live="polite"
      aria-label="Loading admin content"
    >
      <div
        aria-hidden="true"
        className="h-8 w-48 animate-pulse rounded-lg bg-slate-200"
      />

      <div
        aria-hidden="true"
        className="h-4 w-80 max-w-full animate-pulse rounded bg-slate-200"
      />

      <div
        aria-hidden="true"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white"
          />
        ))}
      </div>

      <div
        aria-hidden="true"
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
      >
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className="h-16 animate-pulse border-b border-slate-100 bg-slate-50 last:border-b-0"
          />
        ))}
      </div>

      <span className="sr-only">Loading, please wait.</span>
    </div>
  );
}