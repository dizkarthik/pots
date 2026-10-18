"use client";

import { useState, type ReactNode } from "react";
import { cx } from "@/utils/cx";

const MASK = { maskImage: "linear-gradient(to bottom, black, transparent)", WebkitMaskImage: "linear-gradient(to bottom, black, transparent)" };

/**
 * A vertical scroll region whose top edge softens once scrolled (AGENTS.md):
 * a 24px masked 1px backdrop blur, a 16px masked 4px blur and a surface
 * gradient, each ramping 0 → 1 over the first 24px of scroll. Opacity sits on
 * the layers, never the overlay parent. Keep headers outside this region.
 */
export function ScrollFade({
  children,
  className,
  surfaceClassName = "from-background-primary-default",
  label,
}: {
  children: ReactNode;
  /** Classes for the scroll container (e.g. a max height). */
  className?: string;
  /** Gradient start: the semantic token of the enclosing surface. */
  surfaceClassName?: string;
  /** Accessible name, so keyboard users can focus and scroll the region. */
  label: string;
}) {
  const [fade, setFade] = useState(0);
  return (
    <div className="relative min-h-0">
      <div
        role="region"
        aria-label={label}
        tabIndex={0}
        onScroll={(e) => setFade(Math.min(1, e.currentTarget.scrollTop / 24))}
        className={cx("overflow-y-auto outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring", className)}
      >
        {children}
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-6">
        <div className="absolute inset-x-0 top-0 h-6 backdrop-blur-[1px]" style={{ ...MASK, opacity: fade }} />
        <div className="absolute inset-x-0 top-0 h-4 backdrop-blur-[4px]" style={{ ...MASK, opacity: fade }} />
        <div className={cx("absolute inset-x-0 top-0 h-6 bg-linear-to-b to-transparent", surfaceClassName)} style={{ opacity: fade }} />
      </div>
    </div>
  );
}
