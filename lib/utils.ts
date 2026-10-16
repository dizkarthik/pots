import { clsx, type ClassValue } from "clsx";
import { cx } from "@/utils/cx";

// shadcn-registry components (EvilCharts, beUI) import `cn` from here and use
// clsx-style conditionals ({ "class": condition }). Resolve those with clsx,
// then merge through BoardUI's `cx` so composite text styles merge correctly.
export function cn(...inputs: ClassValue[]) {
  return cx(clsx(inputs));
}
