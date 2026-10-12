import { formatINR } from "@/lib/money";
import { cx } from "@/utils/cx";

/** An INR amount; negatives are shown in the error colour. */
export function Money({
  paise,
  className,
  signed = false,
}: {
  paise: number;
  className?: string;
  /** Colour negative amounts as an error. */
  signed?: boolean;
}) {
  return (
    <span className={cx("tabular-nums", signed && paise < 0 && "text-text-error-primary", className)}>
      {formatINR(paise)}
    </span>
  );
}
