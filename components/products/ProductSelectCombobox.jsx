"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export default function ProductSelectCombobox({
  items = [],
  value = "",
  onChange,
  disabled = false,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);

  const selected = useMemo(
    () => items.find((item) => String(item.value) === String(value)),
    [items, value]
  );

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;

    return items.filter((item) =>
      `${item.label || ""} ${item.description || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [items, query]);

  useEffect(() => {
    function handleOutside(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    if (disabled) {
      setOpen(false);
      setQuery("");
    }
  }, [disabled]);

  function selectItem(item) {
    onChange?.(item.value, item);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="flex min-h-10 w-full items-center justify-between gap-2 rounded-md border border-border bg-bg-elevated-2 px-3 py-2 text-left text-sm text-text outline-none transition hover:border-primary/40 focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <div className="min-w-0 flex-1">
          <p className={selected ? "truncate font-medium text-text" : "truncate text-text-muted"}>
            {selected?.label || placeholder}
          </p>
          {selected?.description ? (
            <p className="mt-0.5 truncate text-[11px] text-text-faint">
              {selected.description}
            </p>
          ) : null}
        </div>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-text-faint transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && !disabled ? (
        <div className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-xl border border-border bg-bg-elevated shadow-2xl">
          <div className="border-b border-border-soft p-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 w-full rounded-md border border-border bg-bg-elevated-2 pl-9 pr-3 text-sm text-text outline-none placeholder:text-text-faint focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto p-1">
            {filteredItems.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-text-muted">
                {emptyText}
              </div>
            ) : (
              filteredItems.map((item) => {
                const active = String(item.value) === String(value);

                return (
                  <button
                    key={String(item.value)}
                    type="button"
                    onClick={() => selectItem(item)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left s ${
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-text hover:bg-bg-elevated-2"
                    }`}
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                      {active ? <Check className="h-4 w-4" /> : null}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{item.label}</p>
                      {item.description ? (
                        <p className="mt-0.5 truncate text-[11px] text-text-faint">
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
