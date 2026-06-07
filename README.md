# Sportomic Arena — Availability Engine

A full-stack application that models a single sports turf which can be configured
as **3 small courts (5v5)** or **2 large courts (7v7)** sharing the same physical
ground. Because the courts physically overlap, booking one court can **block**
others. The app calculates availability dynamically and shows every court as
**Available**, **Booked**, or **Blocked**.

It is **multi-user**: users sign up / log in (JWT), and bookings are stored in
**MongoDB** as a single shared, global state. Because the turf is one physical
space, a court booked by one user is instantly **booked/blocked for everyone**.
Each booking records its owner, so you can only cancel your own bookings.

> The availability logic is a **pure, framework-agnostic engine** (`@arena/engine`)
> that is reused, byte-for-byte, by both the Express API and the React UI — so the
> server and client can never disagree.

---

## Table of contents

- [Quick start](#quick-start)
- [Scripts](#scripts)
- [Architecture](#architecture)
- [The overlap model](#the-overlap-model)
- [The availability engine](#the-availability-engine)
- [API reference](#api-reference)
- [Testing](#testing)
- [Scenarios (verified)](#scenarios-verified)
- [Assumptions & design decisions](#assumptions--design-decisions)
- [Screenshots](#screenshots)

---

## Quick start

**Requirements:**

- Node.js ≥ 18 (uses npm workspaces)
- **MongoDB** running locally on `mongodb://127.0.0.1:27017` (a local install or
  Docker: `docker run -d -p 27017:27017 --name mongo mongo:7`)

```bash
# 1. Install everything (engine + server + client) from the repo root
npm install

# 2. (optional) configure the API — defaults already work for local dev
cp server/.env.example server/.env   # PORT, MONGODB_URI, JWT_SECRET, JWT_EXPIRES_IN

# 3. Run the API (Express, port 4000) and the UI (Vite, port 5173) together
npm run dev
```

Then open **http://localhost:5173**, **sign up**, and start booking.

To test the multi-user behaviour, open a second browser (or an incognito window),
sign up as a different user, and book a court — the first window updates within a
few seconds (the UI polls the shared state). The Vite dev server proxies `/api/*`
to the Express server on port 4000.

Run the API or UI individually if you prefer:

```bash
npm run dev:server   # Express on http://localhost:4000
npm run dev:client   # Vite on http://localhost:5173
```

---

## Scripts

| Command                | What it does                                            |
| ---------------------- | ------------------------------------------------------- |
| `npm run dev`          | Run API + UI concurrently                               |
| `npm run dev:server`   | Run the Express API only                                |
| `npm run dev:client`   | Run the React UI only                                   |
| `npm test`             | Run the engine unit tests (Vitest, **62 tests**)        |
| `npm run test:watch`   | Run the engine tests in watch mode                      |
| `npm run build`        | Build the React client for production (`client/dist`)   |

---

## Architecture

A small monorepo using **npm workspaces**. The booking logic is isolated in its
own package so it is independent and reusable.

```
sportomic-arena/
├── package.json                 # workspace root + scripts
├── packages/
│   └── engine/                  # @arena/engine — pure, reusable, tested
│       ├── src/
│       │   ├── overlapMap.js        # courts, overlap model, adjacency builder
│       │   ├── availabilityEngine.js# calculateAvailability(), normalizeBookings()
│       │   ├── court.js             # JSDoc domain types
│       │   └── index.js             # public exports
│       └── tests/
│           └── availabilityEngine.test.js   # 62 unit tests (Vitest)
├── server/                      # Express API: engine + MongoDB + JWT auth
│   ├── .env.example
│   └── src/
│       ├── index.js             # app wiring (CORS, routes, DB, error handler)
│       ├── config.js            # env config (PORT, MONGODB_URI, JWT_SECRET)
│       ├── db.js                # Mongoose connection
│       ├── models/
│       │   ├── User.js          # bcrypt password hashing
│       │   └── Booking.js       # unique index on court (no double-booking)
│       ├── middleware/
│       │   └── auth.js          # signToken() + requireAuth (JWT)
│       ├── services/
│       │   └── arenaState.js    # DB bookings -> engine -> state + owners
│       └── routes/
│           ├── auth.js          # /signup /login /me
│           ├── availability.js  # /courts /availability (public)
│           └── bookings.js      # /bookings  (auth, owner-aware)
└── client/                      # React + Vite + Tailwind CSS v4
    └── src/
        ├── api/
        │   └── client.js            # fetch wrapper (JWT bearer, errors)
        ├── context/
        │   └── AuthContext.jsx      # auth state, login/signup/logout
        ├── components/
        │   ├── CourtCard.jsx
        │   ├── CourtGrid.jsx
        │   ├── BookingControls.jsx
        │   ├── CourtLayout.jsx      # visual turf layout (bonus)
        │   ├── SummaryColumns.jsx   # Available / Booked / Blocked sections
        │   ├── BookingHistory.jsx   # booking history (bonus)
        │   ├── StatusLegend.jsx     # colour legend (bonus)
        │   ├── Navbar.jsx           # user + logout
        │   └── AuthLayout.jsx       # login/signup shell
        ├── logic/                   # thin re-exports of @arena/engine
        │   ├── overlapMap.js
        │   └── availabilityEngine.js
        ├── pages/
        │   ├── Home.jsx
        │   ├── Login.jsx
        │   └── Signup.jsx
        ├── types/
        │   └── court.js             # status → colour styling
        ├── App.jsx                  # routing + protected routes
        └── main.jsx
```

**Why a separate engine package?** The requirement is that "the availability
engine should be independent and reusable." Making it a standalone workspace
package guarantees that:

- It has **zero** dependencies on React, Express, the DOM, or the network.
- The **same code** powers instant client-side updates and the server API.
- It can be unit-tested in isolation and published/reused anywhere.

The client's `src/logic/*` files are intentionally thin re-exports of
`@arena/engine` to satisfy the requested folder layout while keeping a single
source of truth (DRY).

---

## The overlap model

The turf is one physical space. Two large courts are laid over the three small
courts:

```
        ┌──────────────── X (7v7) ────────────────┐
        │                          ┌────────────── Y (7v7) ──────────────┐
        ▼                          ▼               ▼                      ▼
   ┌─────────┐              ┌─────────┐      ┌─────────┐
   │ A (5v5) │              │ B (5v5) │      │ C (5v5) │
   └─────────┘              └─────────┘      └─────────┘
```

| Court         | Overlaps with     |
| ------------- | ----------------- |
| Court X (7v7) | Court A + Court B |
| Court Y (7v7) | Court B + Court C |

```js
const overlaps = {
  X: ['A', 'B'],
  Y: ['B', 'C'],
};
```

### Overlap is bidirectional

Overlap is a physical relationship, so it works both ways: if **X** uses **A**'s
ground, then booking **A** must also block **X** (and vice-versa). The engine
therefore derives a **symmetric (undirected) adjacency graph** from the
`overlaps` map:

```
A ↔ X            X ↔ A, B
B ↔ X, B ↔ Y     Y ↔ B, C
C ↔ Y
```

Modelling overlap as an undirected graph means a **single loop** handles parents,
children, and any future court layout uniformly — there is no special-case code
for "is this a parent or a child". Change `overlaps` and everything (engine, API,
UI, tests) follows automatically.

---

## The availability engine

The core is a single pure function:

```ts
calculateAvailability(bookings: string[]): {
  booked: string[];
  blocked: string[];
  available: string[];
}
```

**Algorithm**

1. **Normalise** the input (dedupe, upper-case, trim, drop unknown/null, order).
2. For each booked court, mark every **overlapping** court as **blocked**.
3. A booked court is **never** reported as blocked (booking wins over overlap).
4. `available = allCourts − booked − blocked`.

**Guarantees**

- **Deterministic:** output is always ordered `A, B, C, X, Y`; same input → same output.
- **Pure:** no side effects; never mutates its input.
- **Total partition:** every court appears in exactly one of the three buckets.
- **Robust:** tolerates duplicates, unknown IDs, `null`/`undefined`, empty lists,
  lower-case and padded IDs. Non-array input throws a `TypeError`.

Two helpers are also exported:

- `normalizeBookings(bookings)` — the sanitiser used internally.
- `getCourtStatuses(bookings)` — returns `{ A: 'booked', B: 'available', ... }`
  for O(1) lookups by grid-style UIs.

---

## API reference

Base URL: `http://localhost:4000`. 🔒 = requires `Authorization: Bearer <token>`.

| Method | Endpoint                | Body / Params                       | Response                                          |
| ------ | ----------------------- | ----------------------------------- | ------------------------------------------------- |
| POST   | `/api/auth/signup`      | `{ name, email, password }`         | `201 { token, user }`                             |
| POST   | `/api/auth/login`       | `{ email, password }`               | `200 { token, user }`                             |
| GET    | `/api/auth/me` 🔒        | —                                   | `{ user }`                                         |
| GET    | `/api/health`           | —                                   | `{ status, service, courts }`                     |
| GET    | `/api/courts`           | —                                   | `{ courts: Court[], overlaps }`                   |
| GET    | `/api/availability`     | —                                   | `{ booked, blocked, available, bookedBy }`        |
| GET    | `/api/bookings` 🔒       | —                                   | `[{ court, user, createdAt }]`                    |
| POST   | `/api/bookings` 🔒       | `{ court }`                         | `201 { state }` · `409` if booked/blocked         |
| DELETE | `/api/bookings/:court` 🔒| —                                   | `200 { state }` · `403` if not owner · `404`      |

`bookedBy` maps each booked court to `{ userId, name, at }` so the UI can show who
holds it. The `state` object is `{ booked, blocked, available, bookedBy }`.

Example:

```bash
# sign up and capture the token
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com","password":"secret1"}' | jq -r .token)

# book court X
curl -X POST http://localhost:4000/api/bookings \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"court":"X"}'
# → {"state":{"booked":["X"],"blocked":["A","B"],"available":["C","Y"], ...}}
```

---

## Authentication & multi-user behaviour

- **Sign up / log in** issue a **JWT** (HS256) which the client stores in
  `localStorage` and sends as `Authorization: Bearer <token>`.
- Passwords are **hashed with bcrypt**; the hash is `select: false` and never
  leaves the server.
- The booking endpoints are **protected**; the home page is a **protected route**
  that redirects to `/login` when unauthenticated.
- **Bookings are global & persistent.** They live in MongoDB and the unique index
  on `court` makes double-booking impossible even under concurrent requests
  (a losing race returns `409`).
- **Owner-aware:** every booking stores its `user`. Anyone can see who holds a
  court, but only the **owner** may cancel it (`403` otherwise).
- The UI **polls** the shared availability every few seconds, so a booking made by
  one user appears for all other users automatically — no refresh needed.

## Testing

```bash
npm test
```

The engine ships with **62 Vitest unit tests** covering:

- No bookings (all available)
- **Every single booking** (A, B, C, X, Y)
- The four assignment scenarios (A; X; A+B; X+Y)
- Mixed parent/child combinations (A+Y, C+X, B+Y, A+B+Y, …)
- **All 32 subsets** of courts, each checked against six invariants
  (partition, no duplicates, booked never blocked, blocked/available consistency)
- Invalid input: duplicates, unknown IDs, `null`/`undefined`, empty, whitespace,
  case-insensitivity, and non-array (throws)
- Determinism and input-immutability (purity)
- The derived adjacency graph

---

## Scenarios (verified)

| Booked | Blocked   | Available     |
| ------ | --------- | ------------- |
| `A`    | `X`       | `B, C, Y`     |
| `X`    | `A, B`    | `C, Y`        |
| `A, B` | `X, Y`    | `C`           |
| `X, Y` | `A, B, C` | _none_        |
| `B, Y` | `C, X`    | `A`           |
| `A, Y` | `B, C, X` | _none_        |

---

## Assumptions & design decisions

1. **Overlap is bidirectional.** Booking a child blocks its parent and vice-versa
   (modelled as an undirected graph derived from the `overlaps` map).
2. **Booking beats blocking.** If a court is explicitly booked it is reported as
   `booked`, never `blocked`, even if a neighbour is also booked.
3. **Bookings are a shared set.** The turf is one physical space, so bookings are
   global across all users (not per-user calendars). Duplicates collapse; there is
   no time/slot dimension yet — a court is simply booked or not (a real system
   would add a date/time slot key, and the engine is written so a slot dimension
   can wrap it). Each booking records its owner for cancel-permission checks.
4. **Invalid input is non-fatal.** Unknown IDs, `null`s, blanks and case/spacing
   issues are sanitised away rather than throwing, so a noisy client can't crash
   the engine. Only a structurally wrong type (non-array) throws.
5. **Single source of truth.** All availability logic lives in `@arena/engine`;
   the client and server both consume it, guaranteeing identical results.
6. **Instant UI.** The UI computes locally with the shared engine for a snappy,
   refresh-free experience; the API exists for integration/automation and as the
   same engine over HTTP.

### Bonus features implemented

- ✅ Visual court layout (to-scale turf with overlap shown)
- ✅ Real-time booking simulation (instant recalculation on every toggle)
- ✅ Booking history (timestamped action log)
- ✅ Court status colour coding — **Green = Available, Red = Booked, Orange = Blocked**

---

## Deployment

The app is split for deployment: **frontend on Vercel**, **backend on Render**,
**database on MongoDB Atlas**. Config files (`vercel.json`, `render.yaml`) are
included.

### 1. Database — MongoDB Atlas (free)

1. Create a free cluster at <https://www.mongodb.com/atlas>.
2. Add a database user and allow network access from anywhere (`0.0.0.0/0`).
3. Copy the connection string, e.g.
   `mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/arena?retryWrites=true&w=majority`.

### 2. Backend — Render

1. Push this repo to GitHub (see below).
2. On Render: **New + → Blueprint**, select the repo (it reads `render.yaml`).
3. Set the `MONGODB_URI` environment variable to the Atlas string. `JWT_SECRET`
   is generated automatically; `PORT` is provided by Render.
4. Deploy. Your API will be at `https://<your-service>.onrender.com`
   (verify `https://<your-service>.onrender.com/api/health`).

> Render's free tier sleeps on inactivity, so the first request after idle may
> take ~30s to wake.

### 3. Frontend — Vercel

1. On Vercel: **Add New → Project**, import the same repo. `vercel.json` sets the
   build command (`npm run build`) and output (`client/dist`).
2. Add an environment variable **`VITE_API_URL`** = your Render URL
   (e.g. `https://arena-api.onrender.com`) for the Production environment.
3. Deploy. The SPA rewrite in `vercel.json` makes deep links (`/login`) work.

The frontend talks to the backend via `VITE_API_URL`; CORS is open on the API, and
auth uses a bearer token (no cookies), so cross-origin works out of the box.

## Screenshots

Run `npm run dev` and open http://localhost:5173. The interface has:

- **Booking Controls** — checkboxes/buttons for `A B C X Y`.
- **Available / Booked / Blocked** — the three required summary sections.
- **Courts** — a colour-coded card per court (click to book / cancel).
- **Physical Turf Layout** — visual overlap of large courts over small courts.
- **Booking History** — a timestamped log of every action.

