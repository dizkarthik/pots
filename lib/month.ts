// Calendar months as "YYYY-MM" strings. Pure helpers, no Date arithmetic on
// local time, so results never depend on the server's timezone.

export type Month = `${number}-${number}`;

/** The app's notion of "today" is India time, wherever the server runs. */
export const APP_TIME_ZONE = "Asia/Kolkata";

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DATE_RE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function isMonth(value: string): value is Month {
  return MONTH_RE.test(value);
}

export function isIsoDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  return d <= daysInMonth(y, m);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function parts(month: Month): [number, number] {
  const [y, m] = month.split("-").map(Number);
  return [y, m];
}

function fromParts(year: number, month: number): Month {
  return `${year}-${String(month).padStart(2, "0")}` as Month;
}

/** "2026-10-12" (or a "YYYY-MM-01" DB date) → "2026-10". */
export function monthOf(isoDate: string): Month {
  const month = isoDate.slice(0, 7);
  if (!isMonth(month)) throw new Error(`Invalid date: ${isoDate}`);
  return month;
}

/** "2026-10" → "2026-10-01", the form stored in DB `date` columns. */
export function firstDayOf(month: Month): string {
  return `${month}-01`;
}

/** "2026-02" → "2026-02-28". */
export function lastDayOf(month: Month): string {
  const [y, m] = parts(month);
  return `${month}-${String(daysInMonth(y, m)).padStart(2, "0")}`;
}

export function addMonths(month: Month, delta: number): Month {
  const [y, m] = parts(month);
  const index = y * 12 + (m - 1) + delta;
  return fromParts(Math.floor(index / 12), (index % 12) + 1);
}

/** Negative if a < b, 0 if equal, positive if a > b. */
export function compareMonths(a: Month, b: Month): number {
  return a < b ? -1 : a > b ? 1 : 0; // zero-padded strings sort chronologically
}

/** Inclusive list of months from `from` to `to`; empty if from > to. */
export function monthsBetween(from: Month, to: Month): Month[] {
  const result: Month[] = [];
  for (let m = from; compareMonths(m, to) <= 0; m = addMonths(m, 1)) result.push(m);
  return result;
}

/** Today's date in India time as "YYYY-MM-DD". */
export function todayIso(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function currentMonth(now: Date = new Date()): Month {
  return monthOf(todayIso(now));
}

/** "2026-11" → "Nov 2026" (or "Nov" with `short`). */
export function formatMonth(month: Month, { short = false }: { short?: boolean } = {}): string {
  const [y, m] = parts(month);
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: short ? undefined : "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

/** "2026-10-12" → "12 Oct" (or "Mon, 12 Oct" with `weekday`, "12 Oct 2026" with `year`). */
export function formatDate(isoDate: string, { weekday = false, year = false }: { weekday?: boolean; year?: boolean } = {}): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    weekday: weekday ? "short" : undefined,
    year: year ? "numeric" : undefined,
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
