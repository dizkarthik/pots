import type { ReactNode } from "react";
import { cx } from "@/utils/cx";

/** A titled dashboard panel. The title names what's plotted (single-series charts carry no legend). */
export function ChartCard({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        "flex min-w-0 flex-col gap-4 rounded-3xl border border-border-button-default bg-background-primary-default p-5",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-headline-semibold text-text-primary">{title}</h2>
          {subtitle && <p className="text-body-regular text-text-secondary">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function EmptyChart({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-48 flex-1 items-center justify-center rounded-2xl border border-dashed border-border-button-default p-6 text-center text-body-regular text-text-secondary">
      {children}
    </div>
  );
}
