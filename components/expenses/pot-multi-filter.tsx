"use client";

import { useState } from "react";
import type { Key } from "react-aria-components";
import { Select, SelectItem } from "@/components/base/select/select";
import { PotTile } from "@/components/pots/pot-tile";
import { useSearchParam } from "@/components/shared/list-toolbar";
import { parsePotIds } from "@/lib/filters/expenses";
import type { PotOption } from "@/lib/queries/expenses";

/** Multi-select pot filter, stored as a comma-separated `pot` URL param. */
export function PotMultiFilter({ pots }: { pots: PotOption[] }) {
  const { value, set } = useSearchParam("pot");
  // Local copy so rapid picks accumulate while the URL update is in flight;
  // re-synced whenever the URL changes from elsewhere (e.g. "Clear filters").
  const [selected, setSelected] = useState(() => parsePotIds(value ?? undefined));
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setSelected(parsePotIds(value ?? undefined));
  }
  const known = selected.filter((id) => pots.some((p) => p.id === id));
  const names = known.map((id) => pots.find((p) => p.id === id)!.name);
  const summary = names.length === 0 ? "All pots" : names.length <= 2 ? names.join(", ") : `${names.length} pots`;

  return (
    <Select
      aria-label="Pots"
      selectionMode="multiple"
      value={known}
      onChange={(keys: Key[]) => {
        const ids = keys.map(String);
        setSelected(ids);
        set(ids.length ? ids.join(",") : null);
      }}
      renderValue={<span className={names.length ? "text-text-primary" : undefined}>{summary}</span>}
      className="min-w-40 max-w-64"
    >
      {pots.map((p) => (
        <SelectItem key={p.id} id={p.id} textValue={p.name}>
          <PotTile icon={p.icon} color={p.color} className="size-6 rounded-lg [&_svg]:size-3.5" />
          <span className="flex-1 truncate">{p.name}</span>
          {p.isArchived && <span className="text-caption-1-regular text-text-tertiary">Archived</span>}
        </SelectItem>
      ))}
    </Select>
  );
}
