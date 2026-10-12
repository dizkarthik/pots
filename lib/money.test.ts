import { describe, expect, it } from "vitest";
import { formatINR, paiseToInput, toPaise } from "./money";

describe("toPaise", () => {
  it.each([
    ["500", 50000],
    ["500.5", 50050],
    ["500.05", 50005],
    ["0.1", 10],
    ["1,23,456.78", 12345678],
    ["₹ 1,000", 100000],
    ["  42  ", 4200],
    ["0", 0],
  ])("parses %j as %d paise", (input, expected) => {
    expect(toPaise(input)).toBe(expected);
  });

  it("avoids float rounding errors", () => {
    expect(toPaise("0.29")).toBe(29); // 0.29 * 100 === 28.999999999999996
    expect(toPaise("1.15")).toBe(115);
  });

  it.each(["", "abc", "-5", "1.234", "1.2.3", "1e3", ".5"])("rejects %j", (input) => {
    expect(toPaise(input)).toBeNull();
  });
});

describe("formatINR", () => {
  it("uses Indian digit grouping", () => {
    expect(formatINR(12345600)).toBe("₹1,23,456.00");
    expect(formatINR(1234567890)).toBe("₹1,23,45,678.90");
  });

  it("formats small and negative amounts", () => {
    expect(formatINR(5)).toBe("₹0.05");
    expect(formatINR(-20000)).toBe("-₹200.00");
  });

  it("can drop paise for compact display", () => {
    expect(formatINR(60000, { whole: true })).toBe("₹600");
  });
});

describe("paiseToInput", () => {
  it("round-trips through toPaise", () => {
    for (const p of [0, 5, 50, 12345, 50000, 12345678]) {
      expect(toPaise(paiseToInput(p))).toBe(p);
    }
  });
});
