import { describe, expect, it } from "vitest";
import { computePotBalance, type PotLedger } from "./balance";
import { applyBudgetEdit, nextBudgetEffectiveFrom, type BudgetEntry } from "./budget";
import type { Month } from "./month";

const R = (rupees: number) => rupees * 100; // test amounts in rupees, stored as paise

/** A moment in India time, e.g. ist("2026-10-15") → 15 Oct 2026, 12:00 IST. */
const ist = (date: string, time = "12:00") => new Date(`${date}T${time}:00+05:30`);

function petrol(overrides: Partial<PotLedger> = {}): PotLedger {
  return {
    startMonth: "2026-01",
    budgets: [{ effectiveFrom: "2026-01", amountPaise: R(500) }],
    expenses: [],
    ...overrides,
  };
}

describe("computePotBalance", () => {
  it("carries an unspent surplus forward into the next month", () => {
    const ledger = petrol({ expenses: [{ date: "2026-01-10", amountPaise: R(400) }] });

    expect(computePotBalance(ledger, "2026-01").balance).toBe(R(100));

    const feb = computePotBalance(ledger, "2026-02");
    expect(feb.carriedOver).toBe(R(100));
    expect(feb.budgetThisMonth).toBe(R(500));
    expect(feb.balance).toBe(R(600)); // 100 + 500, the spec's example
  });

  it("keeps carrying across several months", () => {
    const ledger = petrol({
      expenses: [
        { date: "2026-01-10", amountPaise: R(400) },
        { date: "2026-02-03", amountPaise: R(550) },
        { date: "2026-03-28", amountPaise: R(100) },
      ],
    });
    // Jan 100, Feb 100+500−550 = 50, Mar 50+500−100 = 450
    expect(computePotBalance(ledger, "2026-02").balance).toBe(R(50));
    expect(computePotBalance(ledger, "2026-03").balance).toBe(R(450));
  });

  it("carries an overspend into the next month as a negative balance", () => {
    const ledger = petrol({ expenses: [{ date: "2026-01-20", amountPaise: R(700) }] });

    expect(computePotBalance(ledger, "2026-01").balance).toBe(R(-200));

    const feb = computePotBalance(ledger, "2026-02");
    expect(feb.carriedOver).toBe(R(-200));
    expect(feb.balance).toBe(R(300)); // −200 + 500
  });

  it("can stay negative across months until budgets catch up", () => {
    const ledger = petrol({
      expenses: [
        { date: "2026-01-20", amountPaise: R(1200) },
        { date: "2026-02-20", amountPaise: R(500) },
      ],
    });
    expect(computePotBalance(ledger, "2026-02").balance).toBe(R(-700));
    expect(computePotBalance(ledger, "2026-03").balance).toBe(R(-200));
  });

  describe("budget edits", () => {
    const expenses = [
      { date: "2026-08-05", amountPaise: R(300) },
      { date: "2026-09-12", amountPaise: R(450) },
      { date: "2026-10-03", amountPaise: R(200) },
    ];
    const base = petrol({ startMonth: "2026-08", budgets: [{ effectiveFrom: "2026-08", amountPaise: R(500) }], expenses });

    it("a mid-month edit leaves the current balance unchanged and raises next month's", () => {
      const before = { oct: computePotBalance(base, "2026-10"), nov: computePotBalance(base, "2026-11") };

      const edited = { ...base, budgets: applyBudgetEdit(base.budgets, R(800), ist("2026-10-15")) };
      const after = { oct: computePotBalance(edited, "2026-10"), nov: computePotBalance(edited, "2026-11") };

      expect(after.oct).toEqual(before.oct);
      expect(after.nov.budgetThisMonth).toBe(R(800));
      expect(after.nov.balance - before.nov.balance).toBe(R(300)); // 800 − 500
    });

    it("two edits in the same month keep only the later one", () => {
      const once = applyBudgetEdit(base.budgets, R(800), ist("2026-10-02"));
      const twice = applyBudgetEdit(once, R(650), ist("2026-10-28"));

      expect(twice.filter((b) => b.effectiveFrom === "2026-11")).toEqual([
        { effectiveFrom: "2026-11", amountPaise: R(650) },
      ]);
      expect(twice).toHaveLength(2); // original Aug row + one pending Nov row
      expect(computePotBalance({ ...base, budgets: twice }, "2026-11").budgetThisMonth).toBe(R(650));
    });

    it("an edit in December takes effect in January of the next year", () => {
      expect(nextBudgetEffectiveFrom(ist("2026-12-20"))).toBe("2027-01");

      const edited = { ...base, budgets: applyBudgetEdit(base.budgets, R(900), ist("2026-12-20")) };
      expect(computePotBalance(edited, "2026-12").budgetThisMonth).toBe(R(500));
      expect(computePotBalance(edited, "2027-01").budgetThisMonth).toBe(R(900));
    });

    it("uses India time to decide the month (late on 31 Oct UTC is already November in IST)", () => {
      // 2026-10-31 20:00 UTC = 2026-11-01 01:30 IST → the edit applies from December.
      expect(nextBudgetEffectiveFrom(new Date("2026-10-31T20:00:00Z"))).toBe("2026-12");
      expect(nextBudgetEffectiveFrom(ist("2026-10-31", "23:59"))).toBe("2026-11");
    });

    it("never changes past-month balances", () => {
      const months: Month[] = ["2026-08", "2026-09", "2026-10"];
      const before = months.map((m) => computePotBalance(base, m));

      let budgets: BudgetEntry[] = [...base.budgets];
      budgets = applyBudgetEdit(budgets, R(100), ist("2026-10-01"));
      budgets = applyBudgetEdit(budgets, R(5000), ist("2026-10-31", "23:00"));
      const after = months.map((m) => computePotBalance({ ...base, budgets }, m));

      expect(after).toEqual(before);
    });

    it("applies each historical budget to its own months", () => {
      const ledger = petrol({
        startMonth: "2026-01",
        budgets: [
          { effectiveFrom: "2026-01", amountPaise: R(500) },
          { effectiveFrom: "2026-03", amountPaise: R(700) },
        ],
      });
      // Jan 500 + Feb 500 + Mar 700 + Apr 700
      expect(computePotBalance(ledger, "2026-04").budgetTotal).toBe(R(2400));
    });
  });

  describe("pot lifetime", () => {
    it("a pot created mid-year accrues only from its start month", () => {
      const ledger = petrol({
        startMonth: "2026-06",
        budgets: [{ effectiveFrom: "2026-06", amountPaise: R(500) }],
        expenses: [{ date: "2026-07-04", amountPaise: R(250) }],
      });

      expect(computePotBalance(ledger, "2026-05")).toEqual({
        budgetTotal: 0,
        spentTotal: 0,
        balance: 0,
        budgetThisMonth: 0,
        spentThisMonth: 0,
        carriedOver: 0,
      });
      expect(computePotBalance(ledger, "2026-06").balance).toBe(R(500));
      expect(computePotBalance(ledger, "2026-07").balance).toBe(R(750)); // 500 + 500 − 250
      expect(computePotBalance(ledger, "2026-12").budgetTotal).toBe(R(3500)); // Jun–Dec, 7 months
    });

    it("a pot created mid-month gets its full budget for that month", () => {
      // Created on 25 Oct: October still accrues the whole ₹500.
      const ledger = petrol({
        startMonth: "2026-10",
        budgets: [{ effectiveFrom: "2026-10", amountPaise: R(500) }],
        expenses: [{ date: "2026-10-26", amountPaise: R(120) }],
      });
      expect(computePotBalance(ledger, "2026-10").balance).toBe(R(380));
    });

    it("an archived pot stops accruing after its archive month", () => {
      const ledger = petrol({
        startMonth: "2026-01",
        expenses: [{ date: "2026-02-10", amountPaise: R(300) }],
        archivePeriods: [{ fromMonth: "2026-03", toMonth: null }],
      });
      // Jan + Feb + Mar accrue (the archive month still counts), nothing after.
      const mar = computePotBalance(ledger, "2026-03");
      expect(mar.balance).toBe(R(1200)); // 1500 − 300

      const aug = computePotBalance(ledger, "2026-08");
      expect(aug.budgetThisMonth).toBe(0);
      expect(aug.budgetTotal).toBe(R(1500));
      expect(aug.balance).toBe(R(1200)); // frozen
    });

    it("an archived pot still reflects expenses booked against it", () => {
      const ledger = petrol({
        archivePeriods: [{ fromMonth: "2026-02", toMonth: null }],
        expenses: [{ date: "2026-04-01", amountPaise: R(200) }],
      });
      expect(computePotBalance(ledger, "2026-04").balance).toBe(R(800)); // 1000 − 200
    });

    it("unarchiving resumes accrual without back-filling the gap", () => {
      const ledger = petrol({
        startMonth: "2026-01",
        archivePeriods: [{ fromMonth: "2026-02", toMonth: "2026-06" }],
      });
      // Accrues Jan, Feb (archive month), Jun (unarchive month), Jul — not Mar–May.
      expect(computePotBalance(ledger, "2026-05").budgetTotal).toBe(R(1000));
      expect(computePotBalance(ledger, "2026-06").budgetThisMonth).toBe(R(500));
      expect(computePotBalance(ledger, "2026-07").budgetTotal).toBe(R(2000));
    });

    it("archiving and unarchiving in the same month changes nothing", () => {
      const ledger = petrol({ archivePeriods: [{ fromMonth: "2026-03", toMonth: "2026-03" }] });
      expect(computePotBalance(ledger, "2026-06").budgetTotal).toBe(R(3000));
    });
  });

  describe("expense changes recompute everything", () => {
    const original = petrol({
      expenses: [
        { date: "2026-01-10", amountPaise: R(400) },
        { date: "2026-02-10", amountPaise: R(200) },
      ],
    });

    it("editing a past expense corrects that month and every later one", () => {
      const edited = petrol({
        expenses: [
          { date: "2026-01-10", amountPaise: R(100) }, // was 400
          { date: "2026-02-10", amountPaise: R(200) },
        ],
      });
      expect(computePotBalance(original, "2026-03").balance).toBe(R(900));
      expect(computePotBalance(edited, "2026-01").balance).toBe(R(400));
      expect(computePotBalance(edited, "2026-03").balance).toBe(R(1200));
    });

    it("deleting a past expense restores its amount to all later balances", () => {
      const deleted = petrol({ expenses: [{ date: "2026-02-10", amountPaise: R(200) }] });
      expect(computePotBalance(deleted, "2026-02").carriedOver).toBe(R(500));
      expect(computePotBalance(deleted, "2026-03").balance).toBe(R(1300));
    });

    it("ignores expenses dated after the month being viewed", () => {
      const ledger = petrol({ expenses: [{ date: "2026-02-01", amountPaise: R(999) }] });
      expect(computePotBalance(ledger, "2026-01").balance).toBe(R(500));
    });

    it("counts an expense on the last day of the month in that month", () => {
      const ledger = petrol({ expenses: [{ date: "2026-02-28", amountPaise: R(50) }] });
      expect(computePotBalance(ledger, "2026-02").spentThisMonth).toBe(R(50));
      expect(computePotBalance(ledger, "2026-02").balance).toBe(R(950));
    });
  });
});
