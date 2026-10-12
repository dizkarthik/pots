"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ComponentProps, type ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/base/input/input";
import { Select, SelectItem } from "@/components/base/select/select";
import { cx } from "@/utils/cx";

// List state (search, filters, sort) lives in the URL so it survives reloads
// and can be bookmarked. Pages read searchParams on the server and filter.

/** Updates several URL params in one navigation; null or "" removes a param. */
export function useSetSearchParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const setMany = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [name, value] of Object.entries(updates)) {
      if (value === null || value === "") next.delete(name);
      else next.set(name, value);
    }
    const query = next.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  };

  return { params, setMany, isPending };
}

export function useSearchParam(name: string) {
  const { params, setMany, isPending } = useSetSearchParams();
  return { value: params.get(name), set: (value: string | null) => setMany({ [name]: value }), isPending };
}

export function ListToolbar({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {children}
      {actions && <div className="ms-auto flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** A text input bound to one URL param, debounced while typing. */
export function ParamInput({
  param,
  label,
  placeholder,
  className,
  ...inputProps
}: { param: string; label: string; placeholder?: string; className?: string } & Pick<
  ComponentProps<typeof Input>,
  "leadingIcon" | "leadingAddon" | "type" | "inputMode"
>) {
  const { value, set } = useSearchParam(param);
  const [text, setText] = useState(value ?? "");
  const setRef = useRef(set);
  setRef.current = set;

  // Keep in sync when the URL changes elsewhere (e.g. "Clear filters").
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setText(value ?? "");
  }

  useEffect(() => {
    if (text.trim() === (value ?? "")) return;
    const timer = window.setTimeout(() => setRef.current(text.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [text, value]);

  return (
    <Input
      aria-label={label}
      placeholder={placeholder ?? label}
      value={text}
      onChange={setText}
      className={className}
      {...inputProps}
    />
  );
}

export function SearchFilter({ placeholder, param = "q" }: { placeholder: string; param?: string }) {
  return <ParamInput param={param} label={placeholder} leadingIcon={Search} type="search" className="w-full sm:w-64" />;
}

export interface FilterOption {
  value: string;
  label: string;
}

/** A select bound to one URL param. The first option is the "no filter" default. */
export function FilterSelect({
  param,
  label,
  options,
  className,
}: {
  param: string;
  label: string;
  options: FilterOption[];
  className?: string;
}) {
  const { value, set } = useSearchParam(param);
  const selected = options.some((o) => o.value === value) ? value! : options[0].value;

  return (
    <Select
      aria-label={label}
      selectedKey={selected}
      onSelectionChange={(key) => set(key === options[0].value ? null : String(key))}
      className={cx("min-w-40", className)}
    >
      {options.map((o) => (
        <SelectItem key={o.value} id={o.value}>
          {o.label}
        </SelectItem>
      ))}
    </Select>
  );
}
