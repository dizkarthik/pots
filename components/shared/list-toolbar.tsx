"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/base/input/input";
import { Select, SelectItem } from "@/components/base/select/select";
import { cx } from "@/utils/cx";

// List state (search, filters, sort) lives in the URL so it survives reloads
// and can be bookmarked. Pages read searchParams on the server and filter.

export function useSearchParam(name: string) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const set = (value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === "") next.delete(name);
    else next.set(name, value);
    const query = next.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  };

  return { value: params.get(name), set, isPending };
}

export function ListToolbar({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {children}
      {actions && <div className="ms-auto flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SearchFilter({ placeholder, param = "q" }: { placeholder: string; param?: string }) {
  const { value, set } = useSearchParam(param);
  const [text, setText] = useState(value ?? "");
  const setRef = useRef(set);
  setRef.current = set;

  // Debounce URL updates while typing.
  useEffect(() => {
    if (text === (value ?? "")) return;
    const timer = window.setTimeout(() => setRef.current(text.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [text, value]);

  return (
    <Input
      aria-label={placeholder}
      placeholder={placeholder}
      leadingIcon={Search}
      value={text}
      onChange={setText}
      type="search"
      className="w-full sm:w-64"
    />
  );
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
