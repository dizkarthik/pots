import { describe, expect, it } from "vitest";
import { buildPaidViaOptions, paidViaValue, parsePaidVia } from "./payment-methods";

const HDFC = { id: "11111111-1111-4111-8111-111111111111", bank: "HDFC" };
const CASH = { id: "22222222-2222-4222-8222-222222222222", bank: "Cash" };
const MILLENNIA = { id: "33333333-3333-4333-8333-333333333333", bank: "Millennia" };
const HDFC_CARD = { id: "44444444-4444-4444-8444-444444444444", name: "HDFC Card", accountId: HDFC.id };
const HDFC_UPI = { id: "55555555-5555-4555-8555-555555555555", name: "HDFC UPI", accountId: HDFC.id };

describe("buildPaidViaOptions", () => {
  const options = buildPaidViaOptions([HDFC, CASH, MILLENNIA], [HDFC_UPI, HDFC_CARD]);

  it("offers a locker with sub methods only through them, never by itself", () => {
    expect(options.map((o) => o.label)).not.toContain("HDFC");
    expect(options.filter((o) => o.accountId === HDFC.id).map((o) => o.label)).toEqual(["HDFC Card", "HDFC UPI"]);
  });

  it("offers a locker without sub methods as itself (paid directly)", () => {
    expect(options.find((o) => o.label === "Cash")).toEqual({
      value: `a:${CASH.id}`,
      label: "Cash",
      accountId: CASH.id,
      paymentMethodId: null,
    });
  });

  it("maps every option to exactly one locker and sorts by label", () => {
    expect(options.map((o) => o.label)).toEqual(["Cash", "HDFC Card", "HDFC UPI", "Millennia"]);
    expect(options.every((o) => o.accountId)).toBe(true);
  });

  it("switches a locker to its sub methods as soon as it has one", () => {
    const before = buildPaidViaOptions([HDFC], []);
    expect(before.map((o) => o.label)).toEqual(["HDFC"]);
    const after = buildPaidViaOptions([HDFC], [HDFC_CARD]);
    expect(after.map((o) => o.label)).toEqual(["HDFC Card"]);
  });
});

describe("parsePaidVia / paidViaValue", () => {
  it("round-trips both kinds", () => {
    expect(parsePaidVia(paidViaValue({ accountId: HDFC.id, paymentMethodId: HDFC_CARD.id }))).toEqual({
      kind: "method",
      id: HDFC_CARD.id,
    });
    expect(parsePaidVia(paidViaValue({ accountId: CASH.id, paymentMethodId: null }))).toEqual({ kind: "account", id: CASH.id });
  });

  it("rejects anything else", () => {
    for (const bad of ["", "m:", "x:" + HDFC.id, HDFC.id, "a:not-a-uuid", "m:" + HDFC.id + "; drop"]) {
      expect(parsePaidVia(bad)).toBeNull();
    }
  });
});
