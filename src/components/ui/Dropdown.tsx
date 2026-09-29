"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { FilterOption } from "@/lib/filterOptions";

type Variant = "field" | "hero" | "compact";

interface DropdownProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  /** Shown when nothing is selected, and as the first "clear" row in the list. */
  placeholder: string;
  /** Count shown next to the placeholder row (e.g. total cars). */
  placeholderCount?: number;
  icon?: ReactNode;
  variant?: Variant;
  /** Hide the placeholder row, for lists that always have a value (sorting). */
  required?: boolean;
  className?: string;
}

interface MenuPosition {
  top?: number;
  bottom?: number;
  right: number;
  width: number;
  maxHeight: number;
}

const MOBILE_QUERY = "(max-width: 639px)";
const ROW_HEIGHT = 44;

function computePosition(trigger: HTMLElement, rows: number): MenuPosition {
  const r = trigger.getBoundingClientRect();
  const margin = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(Math.max(r.width, 240), vw - margin * 2);

  // RTL: the menu hangs from the trigger's right edge, clamped inside the viewport.
  let right = vw - r.right;
  if (vw - right - width < margin) right = vw - margin - width;
  right = Math.max(margin, right);

  const desired = Math.min(rows * ROW_HEIGHT + 12, 340);
  const spaceBelow = vh - r.bottom - margin - 6;
  const spaceAbove = r.top - margin - 6;
  const openUp = spaceBelow < Math.min(desired, 220) && spaceAbove > spaceBelow;
  const maxHeight = Math.max(140, Math.min(desired, openUp ? spaceAbove : spaceBelow));

  return openUp
    ? { bottom: vh - r.top + 6, right, width, maxHeight }
    : { top: r.bottom + 6, right, width, maxHeight };
}

export function Dropdown({
  label,
  value,
  onChange,
  options,
  placeholder,
  placeholderCount,
  icon,
  variant = "field",
  required = false,
  className,
}: DropdownProps) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const [active, setActive] = useState(0);

  const rows: FilterOption[] = useMemo(
    () =>
      required
        ? options
        : [{ value: "", label: placeholder, count: placeholderCount ?? -1 }, ...options],
    [required, options, placeholder, placeholderCount]
  );
  const selected = options.find((o) => o.value === value);
  // An option with no matching cars (given the other filters) can't be picked,
  // unless it's the current value so the visitor can still see and clear it.
  const isDisabled = (o: FilterOption) => o.value !== "" && o.count === 0 && o.value !== value;

  function step(from: number, dir: 1 | -1) {
    for (let i = from + dir; i >= 0 && i < rows.length; i += dir) {
      if (!isDisabled(rows[i])) return i;
    }
    return from;
  }

  const openMenu = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const isMobile = window.matchMedia(MOBILE_QUERY).matches;
    setSheet(isMobile);
    setPosition(isMobile ? null : computePosition(trigger, rows.length));
    setActive(Math.max(0, rows.findIndex((o) => o.value === value)));
    setOpen(true);
  }, [rows, value]);

  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const choose = useCallback(
    (option: FilterOption) => {
      onChange(option.value);
      close();
    },
    [onChange, close]
  );

  // Keep the floating menu attached to its trigger while the page scrolls or resizes.
  useEffect(() => {
    if (!open || sheet) return;
    const update = () => {
      if (triggerRef.current) setPosition(computePosition(triggerRef.current, rows.length));
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, sheet, rows.length]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || listRef.current?.closest("[data-dropdown-menu]")?.contains(target)) return;
      close(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  useEffect(() => {
    if (!open || !sheet) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open, sheet]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function onTriggerKeyDown(e: React.KeyboardEvent) {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      openMenu();
    }
  }

  function onListKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => step(i, 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => step(i, -1));
        break;
      case "Home":
        e.preventDefault();
        setActive(step(-1, 1));
        break;
      case "End":
        e.preventDefault();
        setActive(step(rows.length, -1));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (!isDisabled(rows[active])) choose(rows[active]);
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        close(false);
        break;
    }
  }

  const listboxId = `${id}-listbox`;
  const labelId = `${id}-label`;
  const display = selected ? selected.label : placeholder;
  const hasValue = Boolean(selected);

  const list = (
    <ul
      ref={listRef}
      id={listboxId}
      role="listbox"
      tabIndex={-1}
      aria-labelledby={labelId}
      aria-activedescendant={`${id}-opt-${active}`}
      onKeyDown={onListKeyDown}
      className="overflow-y-auto overscroll-contain py-1.5 outline-none"
      style={sheet ? undefined : { maxHeight: position?.maxHeight }}
    >
      {rows.map((option, i) => {
        const isSelected = option.value === value;
        const disabled = isDisabled(option);
        return (
          <li
            key={option.value || "__all"}
            id={`${id}-opt-${i}`}
            data-index={i}
            role="option"
            aria-selected={isSelected}
            aria-disabled={disabled || undefined}
            onPointerEnter={() => !disabled && setActive(i)}
            onClick={() => !disabled && choose(option)}
            className={cn(
              "mx-1.5 flex items-center gap-2.5 rounded-lg px-3 text-sm transition-colors",
              sheet ? "min-h-12 py-3" : "min-h-10 py-2",
              disabled ? "cursor-not-allowed text-neutral-300" : "cursor-pointer",
              !disabled && i === active && "bg-surface",
              isSelected ? "font-bold text-brand-900" : !disabled && "text-neutral-700"
            )}
          >
            <span className="flex h-4 w-4 shrink-0 items-center justify-center">
              {isSelected && <Check className="h-4 w-4 text-brand-700" />}
            </span>
            <span className="min-w-0 flex-1 truncate">
              {option.label}
              {option.hint && (
                <span className="ms-1.5 text-xs font-normal text-neutral-400" dir="ltr">
                  {option.hint}
                </span>
              )}
            </span>
            {option.count >= 0 && (
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  disabled ? "bg-surface text-neutral-300" : "bg-surface-muted text-neutral-500"
                )}
              >
                {option.count}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );

  const menu =
    open &&
    createPortal(
      sheet ? (
        <div data-dropdown-menu className="fixed inset-0 z-[70] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={() => close(false)} />
          <div className="relative flex max-h-[75vh] flex-col rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl animate-fade-in">
            <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-neutral-200" />
            <div className="flex items-center justify-between px-5 pb-2 pt-3">
              <p className="text-base font-extrabold text-brand-950">{label}</p>
              <button
                type="button"
                onClick={() => close()}
                aria-label="إغلاق"
                className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 hover:bg-surface"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex min-h-0 flex-col pb-3">{list}</div>
          </div>
        </div>
      ) : (
        <div
          data-dropdown-menu
          dir="rtl"
          className="fixed z-[70] overflow-hidden rounded-2xl border border-black/5 bg-white shadow-xl shadow-brand-950/15 animate-pop-in"
          style={{
            top: position?.top,
            bottom: position?.bottom,
            right: position?.right,
            width: position?.width,
          }}
        >
          {list}
        </div>
      ),
      document.body
    );

  const chevron = (
    <ChevronDown
      className={cn("h-4 w-4 shrink-0 text-neutral-400 transition-transform", open && "rotate-180")}
    />
  );

  const trigger = (() => {
    const common = {
      ref: triggerRef,
      type: "button" as const,
      "aria-haspopup": "listbox" as const,
      "aria-expanded": open,
      "aria-controls": open ? listboxId : undefined,
      "aria-labelledby": `${labelId} ${id}-value`,
      onClick: () => (open ? close(false) : openMenu()),
      onKeyDown: onTriggerKeyDown,
    };

    if (variant === "hero") {
      return (
        <button
          {...common}
          className="flex w-full min-w-0 items-center gap-2 rounded-xl px-3 py-2 text-start transition hover:bg-surface focus-visible:bg-surface focus-visible:outline-none"
        >
          <span className="min-w-0 flex-1">
            <span id={labelId} className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-400">
              {icon}
              {label}
            </span>
            <span
              id={`${id}-value`}
              className={cn("mt-0.5 block truncate text-sm font-bold", hasValue ? "text-brand-800" : "text-brand-950")}
            >
              {display}
            </span>
          </span>
          {chevron}
        </button>
      );
    }

    if (variant === "compact") {
      return (
        <button
          {...common}
          className="flex max-w-full items-center gap-2 rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm font-semibold text-brand-950 transition hover:border-brand-200 focus-visible:border-brand-400 focus-visible:outline-none"
        >
          <span id={labelId} className="sr-only">
            {label}
          </span>
          {icon}
          <span id={`${id}-value`} className="truncate">
            {display}
          </span>
          {chevron}
        </button>
      );
    }

    return (
      <button
        {...common}
        className={cn(
          "flex w-full items-center gap-2 rounded-xl border px-3.5 py-2.5 text-start text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200",
          hasValue
            ? "border-brand-300 bg-brand-50/60 font-bold text-brand-900"
            : "border-black/10 bg-white text-neutral-700 hover:border-brand-200"
        )}
      >
        <span id={`${id}-value`} className="min-w-0 flex-1 truncate">
          {display}
        </span>
        {chevron}
      </button>
    );
  })();

  return (
    <div className={cn("min-w-0", className)}>
      {variant === "field" && (
        <span id={labelId} className="mb-1.5 block text-xs font-bold text-neutral-500">
          {label}
        </span>
      )}
      {trigger}
      {menu}
    </div>
  );
}
