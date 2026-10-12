# Pots — personal expense & budget tracker

Single-user app. Desktop-first; layouts use flex/grid so mobile can be polished later (out of scope now, along with income tracking and transfers). Don't add features beyond the spec without asking.

@AGENTS.md

## Stack
- Next.js 15 App Router + TypeScript (strict) + Tailwind CSS v4. Package manager: **npm**.
- Neon Postgres + Drizzle ORM (`DATABASE_URL`). Migrations in `drizzle/`, seed in `scripts/seed.ts`.
- Auth: single password (`APP_PASSWORD`) → HS256 JWT cookie signed with `AUTH_SECRET` (`jose`). `middleware.ts` guards every route except `/login`. **Every server action and data loader must call `requireSession()`** from `lib/auth` — middleware does not protect server actions.
- Validation: Zod (shared client + server; server always re-validates). Forms: react-hook-form.
- Tests: Vitest.

## UI system
- **BoardUI is primary** (React Aria + BoardUI tokens). Follow AGENTS.md: semantic tokens only, composite type utilities, `cx()` from `@/utils/cx`. Add components with `npx boardui@latest add <name>`.
- **Icons: Lucide only** (`lucide-react`, https://lucide.dev) — this overrides AGENTS.md's Remix rule. Pass icons as component references (`leadingIcon={Plus}`). BoardUI ships components with `@remixicon/react` imports: after every `boardui add`, convert them to Lucide equivalents and `npm uninstall @remixicon/react` if it was re-added. Alias on name clashes (e.g. `Calendar as CalendarIcon` next to React Aria's `Calendar`).
- **EvilCharts** (charts, Recharts engine) and **beUI** (motion) come from shadcn registries: `npx shadcn@latest add @evilcharts/recharts-<chart>` / `@beui/<name>`.
- `styles/shadcn-bridge.css` maps shadcn variables (`--background`, `--muted`, `--chart-N`, …) onto BoardUI tokens. Never put raw colours there. `components.json` points shadcn at that file.
- `lib/utils.ts` re-exports `cx` as `cn`. **beUI registry items ship their own `lib/utils.ts`** — after adding one, restore ours (`git checkout lib/utils.ts`).
- BoardUI `HintText` only works inside a React Aria text field (it renders a RAC `Text` slot). Next to `Select` / `DatePicker`, use `components/shared/field-error.tsx`.
- List pages keep search/filter/sort in the URL via `components/shared/list-toolbar.tsx`; parse params defensively in `lib/filters/*`.
- Animations: subtle, ≤ 250ms, and must respect `prefers-reduced-motion`.

## Business rules (do not break)

### Money
- Store every amount as **integer paise** (`bigint` columns, `number` in TS). Never floats. Parse user input with `toPaise()` (string-based), display with `formatINR()` → `₹1,23,456.00` (`en-IN`).

### Pot balance (computed, never stored)
```
balance(pot, M) = Σ budget in effect for each month m in [pot.start_month, M], skipping archived months
                − Σ expenses for that pot dated ≤ end of M
```
- The budget "in effect" for month m is the `pot_budgets` row with the latest `effective_from ≤ m`.
- Carry-forward is implicit (surplus and overspend both roll over). No cron jobs, no stored balances.
- A pot created mid-month gets its **full** budget for its start month (no proration anywhere).
- Archiving freezes accrual: months inside a `pot_archive_periods` row (after the archive month) add no budget. Unarchiving closes the period; gap months are **not** back-filled.
- Implemented as a pure function in `lib/balance.ts`, covered by `lib/balance.test.ts`. Change the tests first if the rule changes.

### Budget changes apply from next month
- Editing a pot's budget always upserts `pot_budgets(pot_id, effective_from = first day of NEXT month)`; unique on `(pot_id, effective_from)` so repeat edits in a month overwrite the pending one. December rolls to January of next year.
- `effective_from` is computed on the server (`lib/budget.ts`, Asia/Kolkata "now"). Never accept it from the client.
- Current and past months' budgets are never modified by an edit.
- Exception: creating a pot writes its initial budget with `effective_from = start_month` (current month).
- UI shows current budget, pending "Upcoming" budget (e.g. "₹600 from Nov"), history; edit form helper text "Applies from {next month}".

## Folder structure
```
app/(auth)/login/          login page + form
app/(app)/                 authenticated shell (sidebar) — page.tsx is the dashboard
app/(app)/{expenses,pots,lockers}/
components/base, components/application, components/foundations   BoardUI (source-owned)
components/app-shell/      sidebar, page header
components/{expenses,pots,lockers,dashboard,charts,motion}/        feature + registry components
lib/auth/                  session (edge-safe) + server helpers
lib/actions/               server actions ("use server")
lib/queries/               server-side reads
lib/validation/            Zod schemas
lib/db/                    Drizzle schema + client
lib/{balance,budget,month,money}.ts   pure domain logic + *.test.ts
styles/                    BoardUI theme/typography/globals + shadcn bridge
drizzle/  scripts/seed.ts  middleware.ts
```

## Database workflow
- Schema lives in `lib/db/schema.ts`. After changing it: `npm run db:generate` (writes SQL to `drizzle/`, commit it) then `npm run db:migrate`. Never edit applied migrations.
- `lib/db/client.ts` exposes `getDb()` (neon-http driver). It has no `server-only` guard because the seed runs under plain Node — app code reaches the DB only via `lib/queries` / `lib/actions`.
- Map DB rows to the pure balance input with `toLedger()` (`lib/ledger.ts`); never reimplement balance math in SQL or components.
- neon-http has no interactive transactions; use `db.batch([...])` when several writes must succeed together.
- `npm run db:seed` refuses to run on a non-empty DB; `npm run db:seed -- --reset` wipes all app data and reseeds.
- **Local dev and production share one Neon database by decision** (`neon-champagne-canvas`, main branch). Seed/reset affects the live site too. The seeded sample data must be wiped before real use (part of the Phase 7 deployment checklist); never run `--reset` once real data exists.

## Commands
`npm run dev` · `npm test` · `npm run typecheck` · `npm run lint` · `npm run build` · `npm run db:generate` · `npm run db:migrate` · `npm run db:seed` · `npm run db:studio`
- Don't run `npm run build` while `npm run dev` is running; both write to `.next/`.
