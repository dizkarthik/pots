import { describe, expect, it } from "vitest";
import type { Account } from "./db/schema";
import { filterAndSortLockers, summariseLockers } from "./lockers";
import type { PotSummary } from "./queries/pots";

const account = (id: string, bank: string, isCredit = false): Account => ({
  id,
  bank,
  isCredit,
  notes: null,
  actualBalancePaise: null,
  createdAt: new Date(0),
});
const pot = (accountId: string, balance: number, isArchived = false) => ({ accountId, balance, isArchived }) as PotSummary;

const HDFC = account("hdfc", "HDFC");
const SBI = account("sbi", "SBI");
const MILLENNIA = account("millennia", "Millennia", true);
const AMAZON = account("amazon", "Amazon Pay", true);

describe("summariseLockers", () => {
  it("sums pot balances for bank lockers, including overspent and archived pots", () => {
    const [hdfc] = summariseLockers([HDFC], [pot("hdfc", 50000), pot("hdfc", -20000), pot("hdfc", 1000, true)]);
    expect(hdfc.totalBalance).toBe(31000);
    expect(hdfc.creditSpend).toBeNull();
  });

  it("shows a credit card's spend for the month, defaulting to ₹0", () => {
    const [millennia, amazon] = summariseLockers([MILLENNIA, AMAZON], [], new Map([["millennia", 450000]]));
    expect(millennia.creditSpend).toBe(450000);
    expect(amazon.creditSpend).toBe(0);
  });
});

describe("filterAndSortLockers", () => {
  const all = summariseLockers([MILLENNIA, SBI, AMAZON, HDFC], [pot("sbi", 100), pot("hdfc", 900)]);
  const names = (sort?: string) => filterAndSortLockers(all, { sort }).map((l) => l.account.bank);

  it("always lists credit cards after bank lockers", () => {
    expect(names()).toEqual(["HDFC", "SBI", "Amazon Pay", "Millennia"]);
    expect(names("name-desc")).toEqual(["SBI", "HDFC", "Millennia", "Amazon Pay"]);
    expect(names("balance-asc")).toEqual(["SBI", "HDFC", "Amazon Pay", "Millennia"]);
  });
});
