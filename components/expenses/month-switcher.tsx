"use client";

import { CalendarRange, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/base/buttons/button";
import { useSetSearchParams } from "@/components/shared/list-toolbar";
import { addMonths, compareMonths, formatDate, formatMonth, type Month } from "@/lib/month";

export function MonthSwitcher({
  month,
  currentMonth,
  range,
}: {
  month: Month;
  currentMonth: Month;
  range: { from: string; to: string } | null;
}) {
  const { setMany, isPending } = useSetSearchParams();
  // The current month is the default, so it isn't written to the URL.
  const go = (m: Month) => setMany({ month: m === currentMonth ? null : m });

  if (range) {
    return (
      <div className="flex items-center gap-2" aria-live="polite">
        <CalendarRange className="size-5 text-foreground-icon-secondary" aria-hidden />
        <span className="text-headline-semibold text-text-primary">
          {formatDate(range.from, { year: true })} – {formatDate(range.to, { year: true })}
        </span>
        <Button variant="ghost" size="small" leadingIcon={X} onClick={() => setMany({ from: null, to: null })}>
          Back to monthly view
        </Button>
      </div>
    );
  }

  const isCurrent = compareMonths(month, currentMonth) >= 0;
  return (
    <div className="flex items-center gap-1" aria-busy={isPending}>
      <Button
        variant="secondary"
        size="small"
        iconOnly
        leadingIcon={ChevronLeft}
        aria-label={`Previous month, ${formatMonth(addMonths(month, -1))}`}
        onClick={() => go(addMonths(month, -1))}
      />
      <h2 className="min-w-28 text-center text-headline-semibold text-text-primary" aria-live="polite">
        {formatMonth(month)}
      </h2>
      <Button
        variant="secondary"
        size="small"
        iconOnly
        leadingIcon={ChevronRight}
        aria-label={`Next month, ${formatMonth(addMonths(month, 1))}`}
        disabled={isCurrent}
        onClick={() => go(addMonths(month, 1))}
      />
      {!isCurrent && (
        <Button variant="ghost" size="small" onClick={() => go(currentMonth)}>
          This month
        </Button>
      )}
    </div>
  );
}
