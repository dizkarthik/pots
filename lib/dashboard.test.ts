import { describe, expect, it } from "vitest";
import { budgetVsActualByLocker, monthTotals, potsNeedingAttention, spendByPot } from "./dashboard";

const R = (rupees: number) => rupees * 100;
let n = 0;
const pot = (o: { name: string; bank?: string; budget?: number; spent?: number; balance?: number; archived?: boolean }) => ({
  id: `p${++n}`,
  name: o.name,
  icon: "wallet",
  color: "chart-1",
  bank: o.bank ?? "HDFC",
  accountId: (o.bank ?? "HDFC").toLowerCase(),
  isArchived: o.archived ?? false,
  budgetThisMonth: R(o.budget ?? 0),
  spentThisMonth: R(o.spent ?? 0),
  balance: R(o.balance ?? 0),
  carriedOver: 0,
});

describe("monthTotals", () => {
  it("sums budget, spend, remaining and carry-over-inclusive balance", () => {
    const t = monthTotals([
      pot({ name: "Rent", budget: 12000, spent: 12000, balance: 0 }),
      pot({ name: "Groceries", budget: 9000, spent: 3000, balance: 7500 }),
      pot({ name: "Dining", budget: 3000, spent: 4000, balance: -1500 }),
    ]);
    expect(t).toEqual({ budget: R(24000), spent: R(19000), remaining: R(5000), available: R(6000), overspentCount: 1 });
  });

  it("excludes archived pots from the budget but still counts what was spent", () => {
    const t = monthTotals([pot({ name: "Old", budget: 500, spent: 200, balance: 864, archived: true })]);
    expect(t.budget).toBe(0);
    expect(t.spent).toBe(R(200));
  });
});

describe("spendByPot", () => {
  it("ranks by spend and drops pots with none", () => {
    const rows = spendByPot([pot({ name: "A", spent: 100 }), pot({ name: "B", spent: 0 }), pot({ name: "C", spent: 300 })]);
    expect(rows).toEqual([
      { name: "C", spent: R(300) },
      { name: "A", spent: R(100) },
    ]);
  });

  it("folds the tail into Other so there are never more than `limit` bars", () => {
    const pots = Array.from({ length: 11 }, (_, i) => pot({ name: `P${i}`, spent: 100 - i }));
    const rows = spendByPot(pots, 8);
    expect(rows).toHaveLength(8);
    // P0–P6 (₹100…₹94) stay; P7–P10 fold: 93 + 92 + 91 + 90 = 366.
    expect(rows[7]).toEqual({ name: "Other (4 pots)", spent: R(366) });
    expect(rows.reduce((s, r) => s + r.spent, 0)).toBe(pots.reduce((s, p) => s + p.spentThisMonth, 0));
  });
});

describe("budgetVsActualByLocker", () => {
  it("groups by locker and skips lockers with neither budget nor spend", () => {
    const rows = budgetVsActualByLocker([
      pot({ name: "Rent", bank: "Jupiter", budget: 12000, spent: 12000 }),
      pot({ name: "OTT", bank: "Jupiter", budget: 500, spent: 0 }),
      pot({ name: "Milk", bank: "SBI", budget: 3000, spent: 3500 }),
      pot({ name: "Idle", bank: "KVB", budget: 0, spent: 0 }),
    ]);
    expect(rows.map((r) => [r.bank, r.budget / 100, r.spent / 100])).toEqual([
      ["Jupiter", 12500, 12000],
      ["SBI", 3000, 3500],
    ]);
  });
});

describe("potsNeedingAttention", () => {
  it("puts overspent pots first, worst first, then the least budget left", () => {
    const pots = [
      pot({ name: "Healthy", budget: 1000, balance: 900 }),
      pot({ name: "Bit over", budget: 1000, balance: -100 }),
      pot({ name: "Way over", budget: 1000, balance: -900 }),
      pot({ name: "Nearly out", budget: 1000, balance: 50 }),
      pot({ name: "Archived", budget: 1000, balance: -5000, archived: true }),
    ];
    expect(potsNeedingAttention(pots).map((p) => p.name)).toEqual(["Way over", "Bit over", "Nearly out", "Healthy"]);
  });
});
