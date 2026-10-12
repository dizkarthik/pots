import { describe, expect, it } from "vitest";
import { parseExpenseFilters } from "./expenses";

const now = new Date("2026-10-12T12:00:00+05:30");
const POT = "3f2a9c1e-8b7d-4e6f-a1b2-c3d4e5f6a7b8";

describe("parseExpenseFilters", () => {
  it("defaults to the current month, newest first", () => {
    const f = parseExpenseFilters({}, now);
    expect(f).toMatchObject({ month: "2026-10", range: null, from: "2026-10-01", to: "2026-10-31" });
    expect(f.sort).toEqual({ field: "date", direction: "desc" });
  });

  it("browses a past month", () => {
    expect(parseExpenseFilters({ month: "2025-12" }, now)).toMatchObject({ from: "2025-12-01", to: "2025-12-31" });
  });

  it("never browses past the current month", () => {
    expect(parseExpenseFilters({ month: "2026-11" }, now).month).toBe("2026-10");
  });

  it("lets a valid date range replace the month view", () => {
    const f = parseExpenseFilters({ month: "2026-10", from: "2026-07-15", to: "2026-09-02" }, now);
    expect(f).toMatchObject({ range: { from: "2026-07-15", to: "2026-09-02" }, from: "2026-07-15", to: "2026-09-02" });
  });

  it("ignores inverted or malformed ranges", () => {
    expect(parseExpenseFilters({ from: "2026-09-10", to: "2026-09-01" }, now).range).toBeNull();
    expect(parseExpenseFilters({ from: "2026-02-30", to: "2026-03-01" }, now).range).toBeNull();
  });

  it("parses amount bounds into paise", () => {
    expect(parseExpenseFilters({ min: "100", max: "1,500.50" }, now)).toMatchObject({ minPaise: 10000, maxPaise: 150050 });
    expect(parseExpenseFilters({ min: "abc" }, now).minPaise).toBeUndefined();
  });

  it("drops ids that aren't UUIDs and unknown sorts", () => {
    const f = parseExpenseFilters({ pot: "'; drop table", account: POT, sort: "evil-asc" }, now);
    expect(f.potId).toBeUndefined();
    expect(f.accountId).toBe(POT);
    expect(f.sort).toEqual({ field: "date", direction: "desc" });
  });
});
