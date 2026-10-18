"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarCheck, CalendarClock, Eye, WalletCards } from "lucide-react";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { PotTile } from "@/components/pots/pot-tile";
import { Dialog } from "@/components/shared/dialog";
import { Money } from "@/components/shared/money";
import { ScrollFade } from "@/components/shared/scroll-fade";
import { allocateMonth, saveAllocationPlan } from "@/lib/actions/allocations";
import { isAllocationEligible, plannedAllocation } from "@/lib/allocation";
import { formatINR, paiseToInput, toPaise } from "@/lib/money";
import { formatMonth, type Month } from "@/lib/month";
import type { PotSummary } from "@/lib/queries/pots";
import { cx } from "@/utils/cx";

/**
 * Monthly allocation, above the pots table. With a month pending, View lets
 * you edit each pot's amount and Allocate adds them to the balances and locks
 * the month. Otherwise it shows the next month, whose plan can be edited and
 * saved ahead of time (Allocate opens on the 1st).
 */
export function AllocationPanel({
  pots,
  pending,
  nextMonth,
  currentAllocated,
  month,
}: {
  pots: PotSummary[];
  /** Unallocated months, oldest first; the first is the one offered. */
  pending: Month[];
  /** Shown when nothing is pending. */
  nextMonth: Month;
  /** Whether the current month was allocated manually (vs. automatic). */
  currentAllocated: boolean;
  month: Month;
}) {
  const target = pending[0] ?? nextMonth;
  const isOpen = pending.length > 0;
  const eligible = useMemo(
    () => pots.filter((p) => isAllocationEligible(p, target)).sort((a, b) => a.bank.localeCompare(b.bank) || a.name.localeCompare(b.name)),
    [pots, target],
  );
  const planned = useMemo(() => new Map(eligible.map((p) => [p.id, plannedAllocation(p.history, target)])), [eligible, target]);

  // Edited amounts live here so View and Allocate always agree.
  const [text, setText] = useState<Record<string, string>>(() =>
    Object.fromEntries(eligible.map((p) => [p.id, paiseToInput(planned.get(p.id) ?? 0)])),
  );
  const amounts = new Map(eligible.map((p) => [p.id, toPaise(text[p.id] ?? "")]));
  const hasInvalid = [...amounts.values()].some((v) => v === null);
  const total = [...amounts.values()].reduce<number>((s, v) => s + (v ?? 0), 0);
  const changed = eligible.filter((p) => amounts.get(p.id) !== null && amounts.get(p.id) !== planned.get(p.id)).length;

  const [viewing, setViewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const payload = () => ({ month: target, amounts: text });
  const run = (action: typeof allocateMonth, onDone: () => void) =>
    startTransition(async () => {
      setError(null);
      const result = await action(payload());
      if (result.ok) onDone();
      else setError(result.error);
    });

  const allocate = () =>
    run(allocateMonth, () => {
      setConfirming(false);
      setViewing(false);
    });
  const savePlan = () =>
    run(saveAllocationPlan, () => {
      setViewing(false);
      setNotice(`Saved the ${formatMonth(target)} plan.`);
    });

  const monthName = formatMonth(target);
  const opensOn = `1 ${formatMonth(target, { short: true }).split(" ")[0]}`;

  return (
    <>
      <section
        aria-label="Monthly allocation"
        className={cx(
          "flex flex-wrap items-center gap-4 rounded-3xl border p-5",
          isOpen ? "border-accent-300 bg-accent-50 dark:border-accent-800 dark:bg-accent-950" : "border-border-button-default bg-background-primary-default",
        )}
      >
        <span
          className={cx(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            isOpen ? "bg-accent-500 text-text-white" : "bg-background-secondary-default text-foreground-icon-secondary",
          )}
        >
          {isOpen ? <WalletCards className="size-5" aria-hidden /> : currentAllocated ? <CalendarCheck className="size-5" aria-hidden /> : <CalendarClock className="size-5" aria-hidden />}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="text-headline-semibold text-text-primary">
            {isOpen ? `${monthName} allocation is ready` : `Next allocation: ${monthName}`}
          </h2>
          <p className="text-body-regular text-text-secondary">
            {isOpen ? (
              <>
                {formatINR(total)} across {eligible.length} pots. Nothing is added to the pots until you allocate.
                {pending.length > 1 && ` Also pending: ${pending.slice(1).map((m) => formatMonth(m)).join(", ")}.`}
              </>
            ) : (
              <>
                {currentAllocated
                  ? `${formatMonth(month)} is allocated.`
                  : `${formatMonth(month)} budgets were added automatically.`}{" "}
                Allocate opens on {opensOn}; you can review the plan now.
              </>
            )}
          </p>
          {notice && !isOpen && <p className="text-caption-1-regular text-status-lime-text">{notice}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" leadingIcon={Eye} onClick={() => { setError(null); setViewing(true); }}>
            View
          </Button>
          <Button
            leadingIcon={WalletCards}
            onClick={() => { setError(null); setConfirming(true); }}
            disabled={!isOpen || hasInvalid}
          >
            Allocate
          </Button>
        </div>
      </section>

      <Dialog
        isOpen={viewing}
        onOpenChange={setViewing}
        title={`${monthName} allocation`}
        description={
          isOpen
            ? `Edit any amount, then allocate. A changed amount also becomes that pot's budget from ${monthName} on.`
            : `The plan for ${monthName}. Saved changes become each pot's budget from ${monthName}; Allocate opens on ${opensOn}.`
        }
        className="max-w-3xl"
      >
        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-2xl border border-border-button-default">
            <div className="grid grid-cols-[minmax(0,1fr)_6rem_10rem] items-center gap-3 border-b border-border-table bg-background-secondary-default px-4 py-2 text-caption-1-semibold text-text-secondary">
              <span>Pot</span>
              <span className="text-end">Budget</span>
              <span>Allocation</span>
            </div>
            <ScrollFade
              label={`${monthName} allocation by pot`}
              className="max-h-[50vh]"
              surfaceClassName="from-background-primary-default dark:from-background-secondary-default"
            >
              {eligible.length === 0 ? (
                <p className="px-4 py-8 text-center text-body-regular text-text-secondary">No active pots for {monthName}.</p>
              ) : (
                <ul className="divide-y divide-separator-border">
                  {eligible.map((p) => {
                    const value = amounts.get(p.id);
                    const edited = value !== null && value !== planned.get(p.id);
                    return (
                      <li key={p.id} className="grid grid-cols-[minmax(0,1fr)_6rem_10rem] items-center gap-3 px-4 py-2">
                        <div className="flex min-w-0 items-center gap-3">
                          <PotTile icon={p.icon} color={p.color} />
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate text-body-medium text-text-primary">{p.name}</span>
                            <span className="truncate text-caption-1-regular text-text-tertiary">{p.bank}</span>
                          </div>
                        </div>
                        <Money paise={planned.get(p.id) ?? 0} className="text-end text-text-secondary" />
                        <div className="flex flex-col gap-0.5">
                          <Input
                            aria-label={`${monthName} allocation for ${p.name}`}
                            inputMode="numeric"
                            autoComplete="off"
                            value={text[p.id] ?? ""}
                            onChange={(v) => setText((t) => ({ ...t, [p.id]: v }))}
                            isInvalid={value === null}
                            leadingAddon={<span className="text-body-medium text-text-tertiary">₹</span>}
                          />
                          {edited && <span className="text-caption-1-regular text-status-blue-text">Changed</span>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollFade>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-body-regular text-text-secondary">
              Total <span className="text-body-medium tabular-nums text-text-primary">{formatINR(total)}</span>
              {changed > 0 && ` · ${changed} changed`}
              {hasInvalid && <span className="text-text-error-primary"> · enter whole rupees in every box</span>}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setViewing(false)}>
                Close
              </Button>
              {isOpen ? (
                <Button leadingIcon={WalletCards} onClick={() => setConfirming(true)} disabled={hasInvalid || isPending}>
                  Allocate
                </Button>
              ) : (
                <Button onClick={savePlan} disabled={hasInvalid || changed === 0 || isPending}>
                  Save plan
                </Button>
              )}
            </div>
          </div>
          {error && viewing && !confirming && (
            <p role="alert" className="text-body-regular text-text-error-primary">
              {error}
            </p>
          )}
        </div>
      </Dialog>

      <Dialog
        isOpen={confirming}
        onOpenChange={setConfirming}
        title={`Allocate ${monthName}?`}
        description={`Adds ${formatINR(total)} to ${eligible.length} pots${changed > 0 ? ` (${changed} with changed amounts, which also become their budgets)` : ""}. ${monthName} is then locked and can't be allocated again.`}
      >
        <div className="flex flex-col gap-3">
          {error && (
            <p role="alert" className="text-body-regular text-text-error-primary">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button onClick={allocate} disabled={isPending}>
              {isPending ? "Allocating…" : `Allocate ${formatINR(total)}`}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
