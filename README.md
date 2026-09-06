# AttendTrack

Mobile-first employee attendance PWA — Next.js 14 (App Router), TypeScript, Tailwind CSS, Prisma, Redis caching, ExcelJS reports.

## Quick start

```bash
npm install
cp .env.example .env
npx prisma migrate dev --name init   # creates the SQLite database
npm run prisma:seed                  # verifies the database without adding employees
npm run dev
```

Open http://localhost:3000 — resize your browser or open dev tools' device
toolbar to see the mobile layout (bottom nav); on wide screens the same
data renders behind a desktop top nav.

Redis is optional for local development. If `REDIS_URL` in `.env` isn't
reachable, every cache/idempotency helper in `lib/redis.ts` fails soft and
the app reads straight from Prisma — nothing breaks, you just don't get
the caching or duplicate-tap protection until Redis is running.

## Switching to PostgreSQL

1. In `prisma/schema.prisma`, change `provider = "sqlite"` to `provider = "postgresql"`.
2. Point `DATABASE_URL` in `.env` at your Postgres instance.
3. Re-run `npx prisma migrate dev`.
4. Optional: convert the `Attendance.status` field from `String` to a
   real Postgres `enum Status { PRESENT ABSENT }` — SQLite doesn't
   support native enums, which is why it's a constrained string here.

## Using Supabase

Supabase is Postgres, so it's the same path as above with one extra
step, because Supabase puts PgBouncer (connection pooling) in front
of the database and Prisma's migration engine can't run migrations
through a pooled connection.

1. Create a project at supabase.com, then go to
   **Project Settings → Database → Connection string**.
2. Copy the **Transaction pooler** string (port `6543`) into
   `DATABASE_URL`, and the **direct connection** string (port `5432`)
   into a new `DIRECT_URL` — both are in `.env.example` already,
   commented out.
3. In `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider  = "postgresql"
     url       = env("DATABASE_URL")
     directUrl = env("DIRECT_URL")
   }
   ```
4. For this existing project, run `npx prisma db push`, then
  `npm run prisma:seed`. The original migration was created for the
  local SQLite setup.

Everything else — Redis caching, the API routes, the Excel export —
is unaffected; they all go through Prisma, not the database directly.

## App structure

- **Home (`/`)** — today's attendance, missing-days banner, per-employee
  present/absent toggle, month-wise team progress bar.
- **Add Employee** — bottom-nav `+` opens a modal (not a route) from
  anywhere in the app; `POST /api/employees` with an `Idempotency-Key`.
- **Edit Past (`/edit-past`)** — month calendar (taken / missing / Sunday),
  pick any past day, bulk "Mark All Present/Absent", per-employee toggle,
  `POST /api/attendance/bulk-update`.
- **Dashboard (`/dashboard`)** — Export Excel (this month or a 12-sheet
  all-months workbook), today's overview stats, per-employee monthly
  table with a pie-chart shortcut, recent exports (stored locally).
- **More (`/more`)** — company-wide pie chart, settings summary, Excel
  employee import, logout placeholder.

## Excel report format

Each monthly sheet: `S.NO | NAME | EMP CODE | <one column per date> |
Total Work Count | Employee Present Count | Absent Count | Rate %`.
`P` = present (green fill), `A` = absent (red fill), `S` = Sunday
(gray), `-` = no record. The "all months" workbook adds one sheet per
calendar month (Jan–Dec) of the selected year.

## Idempotency

Every mutating endpoint (`/api/employees`, `/api/attendance/toggle`,
`/api/attendance/update-single`, `/api/attendance/bulk-update`) requires
an `Idempotency-Key` header. The key is claimed in Redis with a 24h TTL;
a repeated key returns the previous result instead of applying the
change twice — this is what protects against double-taps and network
retries on mobile.

## PWA

`public/manifest.json` + `public/sw.js` (registered from
`components/RegisterSW.tsx`) give the app-shell an installable, offline
-tolerant baseline: static routes are cached; API calls stay
network-first so attendance data is never stale.
