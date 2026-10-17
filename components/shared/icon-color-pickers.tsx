"use client";

import { Radio, RadioGroup } from "react-aria-components";
import { Label } from "@/components/base/input/label";
import { POT_COLOR_CLASSES, POT_COLORS, POT_ICON_NAMES, POT_ICONS, type PotColor, type PotIconName } from "@/lib/pot-options";
import { cx } from "@/utils/cx";

/** Icon picker shared by the pot and vault forms. */
export function IconPicker({ value, onChange }: { value: PotIconName; onChange: (v: PotIconName) => void }) {
  return (
    <RadioGroup
      value={value}
      onChange={(v) => onChange(v as PotIconName)}
      orientation="horizontal"
      className="flex flex-col gap-1.5"
    >
      <Label>Icon</Label>
      <div className="flex flex-wrap gap-1.5">
        {POT_ICON_NAMES.map((name) => {
          const Icon = POT_ICONS[name];
          return (
            <Radio
              key={name}
              value={name}
              aria-label={name.replace(/-/g, " ")}
              className={({ isSelected, isFocusVisible }) =>
                cx(
                  "flex size-9 cursor-pointer items-center justify-center rounded-xl border text-foreground-icon-secondary transition-colors",
                  isSelected
                    ? "border-accent-500 bg-accent-500/10 text-accent-600"
                    : "border-border-button-default hover:bg-background-primary-hover",
                  isFocusVisible && "ring-2 ring-border-focus-ring",
                )
              }
            >
              <Icon className="size-[18px]" aria-hidden />
            </Radio>
          );
        })}
      </div>
    </RadioGroup>
  );
}

/** Colour swatch picker shared by the pot and vault forms. */
export function ColorPicker({ value, onChange }: { value: PotColor; onChange: (v: PotColor) => void }) {
  return (
    <RadioGroup
      value={value}
      onChange={(v) => onChange(v as PotColor)}
      orientation="horizontal"
      className="flex flex-col gap-1.5"
    >
      <Label>Colour</Label>
      <div className="flex flex-wrap gap-2">
        {POT_COLORS.map((color, i) => (
          <Radio
            key={color}
            value={color}
            aria-label={`Colour ${i + 1}`}
            className={({ isSelected, isFocusVisible }) =>
              cx(
                "size-7 cursor-pointer rounded-full ring-offset-2 ring-offset-background-primary-default transition-shadow",
                POT_COLOR_CLASSES[color].swatch,
                isSelected && "ring-2 ring-text-primary",
                isFocusVisible && "ring-2 ring-border-focus-ring",
              )
            }
          />
        ))}
      </div>
    </RadioGroup>
  );
}
