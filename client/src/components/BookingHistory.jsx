// Reverse-chronological log of booking actions (book / cancel).
export default function BookingHistory({ history, onClear }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Booking History
        </h2>
        <button
          type="button"
          onClick={onClear}
          disabled={history.length === 0}
          className="rounded-md px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Clear
        </button>
      </div>

      {history.length === 0 ? (
        <p className="text-sm italic text-slate-400">No actions yet. Book a court to begin.</p>
      ) : (
        <ul className="max-h-64 space-y-1 overflow-y-auto pr-1">
          {history.map((entry) => (
            <li
              key={entry.id}
              className="flex items-baseline gap-2 rounded-md px-2 py-1 text-sm odd:bg-slate-50"
            >
              <span className="font-mono text-xs text-slate-400">{entry.time}</span>
              <span className="text-slate-700">{entry.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
