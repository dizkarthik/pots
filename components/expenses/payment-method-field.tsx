"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import {
  Button as AriaButton,
  ComboBox,
  Input as AriaInput,
  ListBox,
  ListBoxItem,
  Popover,
} from "react-aria-components";
import { Label } from "@/components/base/input/label";
import {
  MENU_ITEM,
  MENU_ITEM_ACTIVE,
  MENU_ITEMS_CONTAINER,
  MENU_POPOVER_SURFACE,
} from "@/components/base/dropdown/menu-styles";
import { FieldError } from "@/components/shared/field-error";
import { createPaymentMethod } from "@/lib/actions/expenses";
import { normalizePaymentMethodName } from "@/lib/payment-methods";
import type { PaymentMethodOption } from "@/lib/queries/expenses";
import { cx } from "@/utils/cx";

const CREATE_KEY = "__create__";

type Item = { id: string; name: string; create: boolean };

/**
 * "Payment via" picker: choose a preset or previously used method, or type a
 * new name and pick "Create “…”" to add it on the spot. Built on React Aria's
 * ComboBox (BoardUI has none) with BoardUI's input and menu recipes.
 */
export function PaymentMethodField({
  methods: initialMethods,
  value,
  onChange,
  error,
}: {
  methods: PaymentMethodOption[];
  value: string;
  onChange: (id: string) => void;
  error?: string;
}) {
  // Newly created methods are appended locally so they're selectable at once.
  const [created, setCreated] = useState<PaymentMethodOption[]>([]);
  const methods = useMemo(
    () => [...initialMethods, ...created.filter((c) => !initialMethods.some((m) => m.id === c.id))],
    [initialMethods, created],
  );
  const selected = methods.find((m) => m.id === value) ?? null;

  const [inputValue, setInputValue] = useState(selected?.name ?? "");
  const [lastSelectedId, setLastSelectedId] = useState(value);
  if (value !== lastSelectedId) {
    // Form reset / external change: show the newly selected name.
    setLastSelectedId(value);
    setInputValue(selected?.name ?? "");
  }

  const [isPending, startTransition] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);

  const query = normalizePaymentMethodName(inputValue);
  const showingSelection = selected !== null && inputValue === selected.name;
  const filtered = showingSelection
    ? methods
    : methods.filter((m) => m.name.toLowerCase().includes(query.toLowerCase()));
  const exactMatch = methods.some((m) => m.name.toLowerCase() === query.toLowerCase());
  const canCreate = query.length > 0 && !exactMatch && !showingSelection;

  const items: Item[] = [
    ...filtered.map((m) => ({ id: m.id, name: m.name, create: false })),
    ...(canCreate ? [{ id: CREATE_KEY, name: query, create: true }] : []),
  ];

  const create = (name: string) =>
    startTransition(async () => {
      setCreateError(null);
      const result = await createPaymentMethod(name);
      if (!result.ok) {
        setCreateError(result.error);
        return;
      }
      setCreated((prev) => [...prev, { id: result.id, name: result.name }]);
      setLastSelectedId(result.id);
      setInputValue(result.name);
      onChange(result.id);
    });

  return (
    <div className="flex flex-col gap-1.5">
      <ComboBox
        aria-label="Payment via"
        items={items}
        inputValue={inputValue}
        onInputChange={setInputValue}
        selectedKey={value || null}
        onSelectionChange={(key) => {
          if (key === CREATE_KEY) return create(query);
          if (key === null) return;
          const method = methods.find((m) => m.id === key);
          setLastSelectedId(String(key));
          setInputValue(method?.name ?? "");
          onChange(String(key));
        }}
        // Restore the selected name if the user types and then leaves without choosing.
        onBlur={() => setInputValue(selected?.name ?? "")}
        defaultFilter={() => true}
        menuTrigger="focus"
        allowsEmptyCollection
        isInvalid={Boolean(error || createError)}
        className="flex flex-col gap-1.5"
      >
        <Label>Payment via</Label>
        <div
          className={cx(
            "relative flex w-full items-center gap-2 rounded-2lg bg-background-tertiary-default p-2",
            "ring-2 ring-inset ring-transparent transition-[box-shadow] focus-within:ring-border-button-active",
            (error || createError) && "bg-background-tertiary-error",
          )}
        >
          <AriaInput
            placeholder="Cash, UPI, a card… or type a new one"
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-body-regular text-text-primary outline-none placeholder:text-text-tertiary"
          />
          <AriaButton aria-label="Show payment methods" className="flex size-5 items-center justify-center text-foreground-icon-secondary outline-none">
            <ChevronDown className="size-4" aria-hidden />
          </AriaButton>
        </div>
        <Popover
          offset={4}
          className={cx(MENU_POPOVER_SURFACE, "w-(--trigger-width) max-h-64 p-2")}
        >
          <ListBox
            className={MENU_ITEMS_CONTAINER}
            renderEmptyState={() => <p className="p-2 text-body-regular text-text-tertiary">Type a name to add one</p>}
          >
            {(item: Item) => (
              <ListBoxItem
                id={item.id}
                textValue={item.name}
                className={({ isFocused, isSelected }) =>
                  cx(MENU_ITEM, "text-body-medium", (isFocused || isSelected) && MENU_ITEM_ACTIVE)
                }
              >
                {({ isSelected }) =>
                  item.create ? (
                    <>
                      <Plus className="size-4 text-accent-600" aria-hidden />
                      <span>
                        Create <span className="text-text-primary">“{item.name}”</span>
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 truncate">{item.name}</span>
                      {isSelected && <Check className="size-4 text-accent-600" aria-hidden />}
                    </>
                  )
                }
              </ListBoxItem>
            )}
          </ListBox>
        </Popover>
      </ComboBox>
      <FieldError>{createError ?? error}</FieldError>
      {isPending && <p className="text-caption-1-regular text-text-tertiary">Adding…</p>}
    </div>
  );
}
