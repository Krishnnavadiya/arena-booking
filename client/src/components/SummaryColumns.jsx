import { STATUS_STYLES } from '../types/court.js';

// The three required sections: Available, Booked (with owners), Blocked.
export default function SummaryColumns({ result, bookedBy = {}, currentUserId }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <SummaryColumn title="Available" courts={result.available} status="available" />
      <SummaryColumn
        title="Booked"
        courts={result.booked}
        status="booked"
        bookedBy={bookedBy}
        currentUserId={currentUserId}
      />
      <SummaryColumn title="Blocked" courts={result.blocked} status="blocked" />
    </div>
  );
}

function SummaryColumn({ title, courts, status, bookedBy, currentUserId }) {
  const style = STATUS_STYLES[status];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold text-slate-700">
          <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
          {title}
        </h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          {courts.length}
        </span>
      </div>

      {courts.length === 0 ? (
        <p className="text-sm italic text-slate-400">None</p>
      ) : bookedBy ? (
        <ul className="space-y-1.5">
          {courts.map((id) => {
            const owner = bookedBy[id];
            const mine = owner && owner.userId === currentUserId;
            return (
              <li key={id} className="flex items-center gap-2 text-sm">
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-sm font-bold ring-1 ring-inset ${style.badge}`}
                >
                  {id}
                </span>
                <span className="text-slate-500">
                  {mine ? <span className="font-semibold text-emerald-700">you</span> : owner?.name}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-wrap gap-2">
          {courts.map((id) => (
            <span
              key={id}
              className={`inline-flex items-center rounded-md px-2.5 py-1 font-mono text-sm font-bold ring-1 ring-inset ${style.badge}`}
            >
              {id}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
