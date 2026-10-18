"use client";

import { useState } from "react";
import { Input } from "@/components/base/input/input";
import { Money } from "@/components/shared/money";
import { formatINR, toPaise } from "@/lib/money";
import {
  settlementDifference,
  settlementStatus,
  settlementTotals,
  type SettlementLocker,
  type SettlementStatus,
} from "@/lib/settlement";
import { cx } from "@/utils/cx";

const STATUS: Record<SettlementStatus, { label: string; className: string; sign: string }> = {
  short: { label: "Transfer in", className: "text-status-lime-text", sign: "+" },
  extra: { label: "Extra", className: "text-text-error-primary", sign: "−" },
  settled: { label: "Settled", className: "text-text-secondary", sign: "" },
};

function Difference({ paise, className }: { paise: number | null; className?: string }) {
  if (paise === null) return <span className="text-text-tertiary">—</span>;
  const status = STATUS[settlementStatus(paise)];
  return (
    <div className={cx("flex flex-col items-end gap-0.5", className)}>
      <span className={cx("tabular-nums text-body-medium", status.className)}>
        {status.sign}
        {formatINR(Math.abs(paise))}
      </span>
      <span className="text-caption-1-regular text-text-tertiary">{status.label}</span>
    </div>
  );
}

// A native table styled by BoardUI's `.bui-table` CSS: React Aria's Table owns
// arrow/space keys for grid navigation, which fights with typing in the inputs.
export function SettlementTable({ lockers }: { lockers: SettlementLocker[] }) {
  // Raw text per locker; nothing is persisted (by request).
  const [text, setText] = useState<Record<string, string>>({});

  const current = new Map<string, number>();
  for (const l of lockers) {
    const value = text[l.id]?.trim();
    const paise = value ? toPaise(value) : null;
    if (paise !== null) current.set(l.id, paise);
  }
  const totals = settlementTotals(lockers, current);

  if (lockers.length === 0) {
    return (
      <p className="rounded-3xl border border-border-button-default bg-background-primary-default py-10 text-center text-body-regular text-text-secondary">
        No bank lockers yet.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default">
      <div className="w-full overflow-x-auto">
        <table className="bui-table">
          <caption className="sr-only">Settlement: outstanding balance against the bank&apos;s current balance</caption>
          <thead>
            <tr>
              <th scope="col">Locker</th>
              <th scope="col" className="text-end">Outstanding balance</th>
              <th scope="col" className="w-56">Current balance</th>
              <th scope="col" className="text-end">Difference</th>
            </tr>
          </thead>
          <tbody>
            {lockers.map((l) => {
              const value = text[l.id] ?? "";
              const invalid = value.trim() !== "" && !current.has(l.id);
              return (
                <tr key={l.id}>
                  <th scope="row" className="text-body-medium text-text-primary">
                    {l.bank}
                  </th>
                  <td className="text-end">
                    <Money paise={l.outstanding} signed />
                  </td>
                  <td>
                    <Input
                      aria-label={`Current balance of ${l.bank}`}
                      placeholder="Enter balance"
                      inputMode="numeric"
                      autoComplete="off"
                      value={value}
                      onChange={(v) => setText((t) => ({ ...t, [l.id]: v }))}
                      isInvalid={invalid}
                      leadingAddon={<span className="text-body-medium text-text-tertiary">₹</span>}
                    />
                  </td>
                  <td className="text-end">
                    <Difference paise={settlementDifference(l.outstanding, current.get(l.id) ?? null)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-border-table bg-background-secondary-default">
              <th scope="row" className="text-body-medium text-text-primary">
                Total
              </th>
              <td className="text-end">
                <Money paise={totals.outstanding} signed className="text-body-medium" />
              </td>
              <td>
                {totals.entered > 0 ? (
                  <div className="flex flex-col">
                    <Money paise={totals.current} className="text-body-medium" />
                    {totals.entered < lockers.length && (
                      <span className="text-caption-1-regular text-text-tertiary">
                        {totals.entered} of {lockers.length} lockers entered
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-text-tertiary">—</span>
                )}
              </td>
              <td className="text-end">
                <Difference paise={totals.entered > 0 ? totals.difference : null} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
