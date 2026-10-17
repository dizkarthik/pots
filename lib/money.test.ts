import { describe, expect, it } from "vitest";
import { formatINR, formatINRCompact, paiseToInput, toPaise } from "./money";

describe("toPaise (whole rupees only)", () => {
  it.each([
    ["500", 50000],
    ["0", 0],
    ["1,23,456", 12345600],
    ["₹ 1,000", 100000],
    ["  42  ", 4200],
  ])("parses %j as %d paise", (input, expected) => {
    expect(toPaise(input)).toBe(expected);
  });

  it.each(["", "abc", "-5", "500.5", "499.50", "0.29", "1e3", ".5", "1.2.3", "1,000.00"])("rejects %j", (input) => {
    expect(toPaise(input)).toBeNull();
  });
});

describe("formatINR", () => {
  it("shows whole rupees with Indian digit grouping and no decimals", () => {
    expect(formatINR(12345600)).toBe("₹1,23,456");
    expect(formatINR(1234567800)).toBe("₹1,23,45,678");
    expect(formatINR(0)).toBe("₹0");
  });

  it("formats negative amounts", () => {
    expect(formatINR(-20000)).toBe("-₹200");
  });
});

describe("formatINRCompact", () => {
  it("abbreviates large amounts for chart axes", () => {
    expect(formatINRCompact(17180000)).toBe("₹1.7L");
    expect(formatINRCompact(1200000)).toBe("₹12K");
  });
});

describe("paiseToInput", () => {
  it("round-trips whole-rupee amounts through toPaise", () => {
    for (const p of [0, 100, 50000, 12345600]) {
      expect(toPaise(paiseToInput(p))).toBe(p);
    }
  });
});
