import type { ReactNode } from "react";

/**
 * Error caption for fields that aren't React Aria text fields (Select,
 * DatePicker). BoardUI's HintText renders a RAC `Text` slot, which throws
 * outside a field that defines an "errorMessage" slot. Same visual recipe.
 */
export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="pt-px text-caption-1-medium text-text-error-primary">
      {children}
    </p>
  );
}
