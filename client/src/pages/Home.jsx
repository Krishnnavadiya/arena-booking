import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import { ALL_COURTS } from '../logic/overlapMap.js';
import Navbar from '../components/Navbar.jsx';
import BookingControls from '../components/BookingControls.jsx';
import CourtGrid from '../components/CourtGrid.jsx';
import CourtLayout from '../components/CourtLayout.jsx';
import SummaryColumns from '../components/SummaryColumns.jsx';
import BookingHistory from '../components/BookingHistory.jsx';
import StatusLegend from '../components/StatusLegend.jsx';

const EMPTY_STATE = { booked: [], blocked: [], available: [...ALL_COURTS], bookedBy: {} };
const POLL_MS = 4000;

let historyCounter = 0;
const now = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

// Build a court -> status map from the server's arena state.
function statusesFromState(state) {
  const map = {};
  for (const id of ALL_COURTS) map[id] = 'available';
  for (const id of state.blocked) map[id] = 'blocked';
  for (const id of state.booked) map[id] = 'booked';
  return map;
}

export default function Home() {
  const { user } = useAuth();
  const [state, setState] = useState(EMPTY_STATE);
  const [history, setHistory] = useState([]);
  const [notice, setNotice] = useState(null); // { type: 'error'|'info', text }
  const [busyCourt, setBusyCourt] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const busyRef = useRef(false);

  const statuses = useMemo(() => statusesFromState(state), [state]);

  const log = useCallback((message) => {
    setHistory((prev) => [{ id: ++historyCounter, time: now(), message }, ...prev].slice(0, 50));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = await api('/availability');
      setState(next);
    } catch {
      /* keep last known state on transient failures */
    } finally {
      setLoaded(true);
    }
  }, []);

  // Initial load + polling so every logged-in user sees a live shared view.
  useEffect(() => {
    refresh();
    const t = setInterval(() => {
      if (!busyRef.current) refresh();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  const toggle = useCallback(
    async (court) => {
      if (!ALL_COURTS.includes(court)) return;
      const status = statuses[court];
      const owner = state.bookedBy[court];

      if (status === 'blocked') return;
      if (status === 'booked' && owner?.userId !== user.id) {
        setNotice({ type: 'error', text: `Court ${court} is booked by ${owner?.name}.` });
        return;
      }

      setNotice(null);
      setBusyCourt(court);
      busyRef.current = true;
      try {
        let res;
        if (status === 'booked') {
          res = await api(`/bookings/${court}`, { method: 'DELETE' });
          log(`Cancelled your booking for Court ${court}`);
        } else {
          res = await api('/bookings', { method: 'POST', body: { court } });
          log(`Booked Court ${court}`);
        }
        setState(res.state);
      } catch (err) {
        setNotice({ type: 'error', text: err.message });
        refresh();
      } finally {
        setBusyCourt(null);
        busyRef.current = false;
      }
    },
    [statuses, state, user, log, refresh],
  );

  const myBookings = useMemo(
    () => state.booked.filter((c) => state.bookedBy[c]?.userId === user.id),
    [state, user],
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                Arena Booking
              </h1>
              <p className="mt-1 text-slate-500">
                Shared turf · 3 small (5v5) + 2 large (7v7) · bookings are live for everyone
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              Live · syncs every {POLL_MS / 1000}s
            </span>
          </div>
          <div className="mt-4">
            <StatusLegend />
          </div>
        </header>

        {notice && (
          <div
            className={`mb-4 rounded-lg px-4 py-2.5 text-sm font-medium ring-1 ${
              notice.type === 'error'
                ? 'bg-red-50 text-red-700 ring-red-200'
                : 'bg-blue-50 text-blue-700 ring-blue-200'
            }`}
          >
            {notice.text}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <BookingControls
              statuses={statuses}
              bookedBy={state.bookedBy}
              currentUserId={user.id}
              busyCourt={busyCourt}
              onToggle={toggle}
            />
            <SummaryColumns result={state} bookedBy={state.bookedBy} currentUserId={user.id} />
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Courts {!loaded && <span className="text-slate-400">· loading…</span>}
              </h2>
              <CourtGrid
                statuses={statuses}
                bookedBy={state.bookedBy}
                currentUserId={user.id}
                busyCourt={busyCourt}
                onToggle={toggle}
              />
            </section>
          </div>

          <div className="space-y-6">
            <CourtLayout statuses={statuses} onToggle={toggle} />
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Your bookings
              </h2>
              {myBookings.length === 0 ? (
                <p className="text-sm italic text-slate-400">You have no active bookings.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {myBookings.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center rounded-md bg-emerald-100 px-2.5 py-1 font-mono text-sm font-bold text-emerald-800 ring-1 ring-inset ring-emerald-600/20"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <BookingHistory history={history} onClear={() => setHistory([])} />
          </div>
        </div>
      </div>
    </div>
  );
}
