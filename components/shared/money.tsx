import { formatINR } from "@/lib/money";
import { cx } from "@/utils/cx";

/**
 * An INR amount. Negatives can be shown in the error colour (`signed`).
 * `quietPaise` is for headline figures: whole-rupee amounts drop ".00", and
 * non-zero paise render smaller and muted so the rupees stay the focus.
 */
export function Money({
  paise,
  className,
  signed = false,
  quietPaise = false,
}: {
  paise: number;
  className?: string;
  /** Colour negative amounts as an error. */
  signed?: boolean;
  /** Hide ".00" and de-emphasise any other paise. */
  quietPaise?: boolean;
}) {
  const negative = signed && paise < 0;
  const base = cx("tabular-nums", negative && "text-text-error-primary", className);

  if (!quietPaise) return <span className={base}>{formatINR(paise)}</span>;

  const rest = Math.abs(paise) % 100;
  if (rest === 0) return <span className={base}>{formatINR(paise, { whole: true })}</span>;

  // Split "₹1,234.56" (or "-₹1,234.56") into rupees and ".56".
  const full = formatINR(paise);
  const dot = full.lastIndexOf(".");
  return (
    <span className={base} aria-label={full}>
      <span aria-hidden>{full.slice(0, dot)}</span>
      <span aria-hidden className={cx("ms-px text-[0.6em] opacity-60", !negative && "text-text-secondary")}>
        {full.slice(dot)}
      </span>
    </span>
  );
}
