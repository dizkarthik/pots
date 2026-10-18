import { describe, expect, it } from "vitest";
import { settlementDifference, settlementStatus, settlementTotals } from "./settlement";

describe("settlementDifference", () => {
  it("is outstanding minus current", () => {
    expect(settlementDifference(4_350_000, 4_000_000)).toBe(350_000);
    expect(settlementDifference(1_000_000, 1_200_000)).toBe(-200_000);
  });
  it("is null until a current balance is entered", () => {
    expect(settlementDifference(1_000_000, null)).toBeNull();
  });
  it("handles an overspent (negative) outstanding balance", () => {
    expect(settlementDifference(-50_000, 0)).toBe(-50_000);
  });
});

describe("settlementStatus", () => {
  it("classifies the sign", () => {
    expect(settlementStatus(100)).toBe("short");
    expect(settlementStatus(-100)).toBe("extra");
    expect(settlementStatus(0)).toBe("settled");
  });
});

describe("settlementTotals", () => {
  const lockers = [
    { id: "a", bank: "HDFC", outstanding: 4_350_000 },
    { id: "b", bank: "SBI", outstanding: 1_000_000 },
    { id: "c", bank: "Cash", outstanding: 200_000 },
  ];
  it("sums outstanding over all lockers but current/difference over entered ones", () => {
    const t = settlementTotals(lockers, new Map([["a", 4_000_000], ["b", 1_200_000]]));
    expect(t).toEqual({ outstanding: 5_550_000, current: 5_200_000, difference: 150_000, entered: 2 });
  });
  it("is all zero differences with nothing entered", () => {
    expect(settlementTotals(lockers, new Map())).toEqual({ outstanding: 5_550_000, current: 0, difference: 0, entered: 0 });
  });
});
