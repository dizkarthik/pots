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
- Store every amount as **integer paise** (`bigint` columns, `number` in TS). Never floats.
- The app works in **whole rupees** (decided 2026-10-17): users enter whole amounts only — `toPaise()` rejects decimals — and every amount displays without decimals via `formatINR()` → `₹1,23,456` (`en-IN`). Stored values are therefore multiples of 100. Don't reintroduce paise in inputs or display.

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

### Lockers
- A locker is a bank account, credit card, wallet or cash, identified by its name (stored in `accounts.bank`; there is no separate name and **no type/category** — Savings/Current/etc. were removed on request).
- Credit-card lockers (`accounts.is_credit`, currently Millennia and Amazon Pay) show a "CREDIT" tag after the name and are always listed last, whatever the sort. They **cannot hold pots** (enforced in the pot and locker actions; their cards show no pot count). Their card's headline is **Spent in {month}** = Σ expenses in the current month whose Paid via is that card (`getCreditCardSpend`, `lib/queries/lockers.ts`), from any pot. Those expenses still reduce their own pot's balance as usual.
- A bank locker's headline number is **Outstanding balance** = Σ outstanding balances of all its pots (archived included; overspent pots reduce it) **+ Σ invested totals of vaults linked to it**.
- `accounts.actual_balance_paise` is currently unused by the UI (the bank-balance comparison was removed on request).

### Expenses
- Every expense has a required **Paid via**, which identifies the locker the money came from (`expenses.account_id`) and, when that locker has sub payment methods, the exact mode (`expenses.payment_method_id`).
  - Sub payment methods belong to a locker (`payment_methods.account_id`, required): each bank locker has "[Locker] Card" and "[Locker] UPI" (all except Millennia, Amazon Pay, Cash, Folders). They are managed on the backend, not created from the expense form, and not shown on locker cards.
  - Paid via options (`buildPaidViaOptions` in `lib/payment-methods.ts`): a locker WITH sub methods appears only as those sub methods; a locker WITHOUT appears as itself (paid directly). The server re-checks this in `resolvePaidVia` (`lib/actions/expenses.ts`).
- Expense list filters: search, multi-select pots (`?pot=id1,id2`), date range, sort. No locker or amount filters.

### Vaults (investments)
- A vault has a monthly investment amount that is **added automatically every month** — computed, never stored, no cron:
  `invested(vault, M) = Σ for m in [start_month, M]: adjustment(m) if present, else the monthly amount in effect for m`.
- **Step up / down** (`stepVaultAmount`) changes the monthly amount **from a chosen month onward** (until a later step). Unlike pot budgets, the start month may be **next month or any past month back to the vault's start**, so past totals can change. Creation writes the start-month row; a step at the start month replaces it.
- **Edit a month** (`vault_adjustments`, unique per vault+month) sets a one-off invested amount for the current or a past month; ₹0 = skipped; "Reset to plan" deletes it. Adjustments win over the monthly amount for their month.
- Vaults table columns: Vault · Monthly · Months (months running since start, shown as "N months") · Last month · Invested · View. View holds the summary, Step up / down, month-by-month inline edits and "Edit details" (name/icon/colour only).
- Vaults track the **invested total only** (no current value / returns).
- A vault can **optionally be linked to a bank locker** (`vaults.account_id`; credit-card lockers not allowed) meaning its money is saved there: the vault's invested total is **added to that locker's Outstanding balance** (`summariseLockers`: total = Σ pot balances + Σ invested of linked vaults; the card shows "incl. ₹X in N vaults"). A locker with linked vaults can't be marked as a credit card.
- Pure logic in `lib/vaults.ts` (+ tests); reads in `lib/queries/vaults.ts`; actions in `lib/actions/vaults.ts`.

## Folder structure
```
app/(auth)/login/          login page + form
app/(app)/                 authenticated shell (sidebar) — page.tsx is the dashboard
app/(app)/{expenses,pots,lockers,vaults}/
components/base, components/application, components/foundations   BoardUI (source-owned)
components/app-shell/      sidebar, page header
components/{expenses,pots,lockers,vaults,dashboard,charts,motion}/        feature + registry components
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
- **Local dev and production share one Neon database by decision** (`neon-champagne-canvas`, main branch). Anything done locally affects the live site.
- **The database now holds the user's REAL lockers (sample data was wiped on 2026-10-16). Never run `npm run db:seed -- --reset` or bulk-delete data.** Test against the real DB only with clearly marked rows you remove afterwards, or ask first.

## Commands
`npm run dev` · `npm test` · `npm run typecheck` · `npm run lint` · `npm run build` · `npm run db:generate` · `npm run db:migrate` · `npm run db:seed` · `npm run db:studio`
- Don't run `npm run build` while `npm run dev` is running; both write to `.next/`.
