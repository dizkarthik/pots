import { describe, expect, it } from "vitest";
import { applyBudgetEdit } from "./budget";
import { adjustableMonths, computeVault, type VaultLedger } from "./vaults";

const R = (rupees: number) => rupees * 100;
const ist = (date: string) => new Date(`${date}T12:00:00+05:30`);

const sip = (overrides: Partial<VaultLedger> = {}): VaultLedger => ({
  startMonth: "2026-07",
  amounts: [{ effectiveFrom: "2026-07", amountPaise: R(5000) }],
  adjustments: [],
  ...overrides,
});

describe("computeVault", () => {
  it("adds the monthly amount automatically every month from the start", () => {
    const v = computeVault(sip(), "2026-10");
    expect(v.investedTotal).toBe(R(20000)); // Jul, Aug, Sep, Oct
    expect(v.thisMonth).toEqual({ month: "2026-10", amountPaise: R(5000), autoPaise: R(5000), adjusted: false });
  });

  it("invests nothing before the start month", () => {
    expect(computeVault(sip(), "2026-06").investedTotal).toBe(0);
  });

  it("a skipped month (₹0 adjustment) adds nothing for that month only", () => {
    const v = computeVault(sip({ adjustments: [{ month: "2026-08", amountPaise: 0 }] }), "2026-10");
    expect(v.investedTotal).toBe(R(15000));
    expect(computeVault(sip({ adjustments: [{ month: "2026-08", amountPaise: 0 }] }), "2026-08").thisMonth).toMatchObject({
      amountPaise: 0,
      autoPaise: R(5000),
      adjusted: true,
    });
  });

  it("a top-up adjustment replaces that month's amount", () => {
    const v = computeVault(sip({ adjustments: [{ month: "2026-09", amountPaise: R(12000) }] }), "2026-10");
    expect(v.investedTotal).toBe(R(5000 + 5000 + 12000 + 5000));
  });

  it("ignores adjustments before the start month", () => {
    const v = computeVault(sip({ adjustments: [{ month: "2026-05", amountPaise: R(99999) }] }), "2026-10");
    expect(v.investedTotal).toBe(R(20000));
  });

  it("a monthly-amount edit applies from next month and never changes past months", () => {
    const base = sip();
    const edited = { ...base, amounts: applyBudgetEdit(base.amounts, R(8000), ist("2026-10-15")) };
    expect(computeVault(edited, "2026-10").investedTotal).toBe(computeVault(base, "2026-10").investedTotal);
    const nov = computeVault(edited, "2026-11");
    expect(nov.thisMonth.amountPaise).toBe(R(8000));
    expect(computeVault(edited, "2026-10").upcoming).toEqual({ effectiveFrom: "2026-11", amountPaise: R(8000) });
  });

  it("an adjustment still wins over a changed monthly amount", () => {
    const v = sip({
      amounts: [
        { effectiveFrom: "2026-07", amountPaise: R(5000) },
        { effectiveFrom: "2026-09", amountPaise: R(7000) },
      ],
      adjustments: [{ month: "2026-10", amountPaise: R(1000) }],
    });
    expect(computeVault(v, "2026-10").investedTotal).toBe(R(5000 + 5000 + 7000 + 1000));
  });
});

describe("adjustableMonths", () => {
  it("lists the start month through the current month, newest first", () => {
    expect(adjustableMonths("2026-08", "2026-10")).toEqual(["2026-10", "2026-09", "2026-08"]);
  });
});
