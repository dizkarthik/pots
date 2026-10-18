import { describe, expect, it } from "vitest";
import {
  MANUAL_ALLOCATION_FROM,
  isAllocationEligible,
  nextAllocationMonth,
  pendingAllocationMonths,
  plannedAllocation,
} from "./allocation";

describe("pendingAllocationMonths", () => {
  it("is empty before manual allocation starts", () => {
    expect(MANUAL_ALLOCATION_FROM).toBe("2026-11");
    expect(pendingAllocationMonths([], "2026-10")).toEqual([]);
  });
  it("lists every unallocated manual month, oldest first", () => {
    expect(pendingAllocationMonths([], "2027-01")).toEqual(["2026-11", "2026-12", "2027-01"]);
    expect(pendingAllocationMonths(["2026-11", "2027-01"], "2027-01")).toEqual(["2026-12"]);
  });
  it("is empty once everything is allocated", () => {
    expect(pendingAllocationMonths(["2026-11"], "2026-11")).toEqual([]);
  });
});

describe("nextAllocationMonth", () => {
  it("is November 2026 while still in automatic months", () => {
    expect(nextAllocationMonth("2026-10")).toBe("2026-11");
    expect(nextAllocationMonth("2026-08")).toBe("2026-11");
  });
  it("is the following month afterwards (December rolls over)", () => {
    expect(nextAllocationMonth("2026-12")).toBe("2027-01");
  });
});

describe("isAllocationEligible", () => {
  it("includes active pots started by that month", () => {
    expect(isAllocationEligible({ isArchived: false, startMonth: "2026-10" }, "2026-11")).toBe(true);
    expect(isAllocationEligible({ isArchived: false, startMonth: "2026-11" }, "2026-11")).toBe(true);
  });
  it("excludes archived pots and pots that start later", () => {
    expect(isAllocationEligible({ isArchived: true, startMonth: "2026-01" }, "2026-11")).toBe(false);
    expect(isAllocationEligible({ isArchived: false, startMonth: "2026-12" }, "2026-11")).toBe(false);
  });
});

describe("plannedAllocation", () => {
  it("pre-fills the budget in effect for the month", () => {
    const budgets = [
      { effectiveFrom: "2026-10" as const, amountPaise: 50_000 },
      { effectiveFrom: "2026-12" as const, amountPaise: 60_000 },
    ];
    expect(plannedAllocation(budgets, "2026-11")).toBe(50_000);
    expect(plannedAllocation(budgets, "2026-12")).toBe(60_000);
    expect(plannedAllocation([], "2026-11")).toBe(0);
  });
});
