import { describe, expect, it } from "vitest";
import {
  addMonths,
  currentMonth,
  formatMonth,
  isIsoDate,
  lastDayOf,
  monthsBetween,
  todayIso,
} from "./month";

describe("month helpers", () => {
  it("adds and subtracts months across year boundaries", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-10", 14)).toBe("2027-12");
  });

  it("knows month lengths, including leap years", () => {
    expect(lastDayOf("2026-02")).toBe("2026-02-28");
    expect(lastDayOf("2028-02")).toBe("2028-02-29");
    expect(lastDayOf("2026-10")).toBe("2026-10-31");
  });

  it("lists months inclusively", () => {
    expect(monthsBetween("2026-11", "2027-02")).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
    expect(monthsBetween("2026-05", "2026-04")).toEqual([]);
  });

  it("validates ISO dates", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
  });

  it("uses India time for today", () => {
    const lateUtc = new Date("2026-10-31T19:00:00Z"); // 00:30 IST on 1 Nov
    expect(todayIso(lateUtc)).toBe("2026-11-01");
    expect(currentMonth(lateUtc)).toBe("2026-11");
  });

  it("formats months for display", () => {
    expect(formatMonth("2026-11")).toBe("Nov 2026");
    expect(formatMonth("2026-11", { short: true })).toBe("Nov");
  });
});
