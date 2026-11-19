"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { inputClass } from "@/components/styles";
import { textInputLimit } from "@/lib/format";

type Row = { id: string; label: string; value: string };

export function NameSuggest({
  label,
  name,
  value,
  options,
  onValue,
  minLength = 1,
  disabled = false,
  placeholder,
}: {
  label: string;
  name: string;
  value: string;
  options: string[];
  onValue: (value: string) => void;
  minLength?: number;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLLabelElement>(null);
  const rows = useMemo(() => suggestRows(value, options, minLength), [minLength, options, value]);
  const highlighted = rows.length ? Math.min(active, rows.length - 1) : 0;

  useEffect(() => {
    function onPointer(event: PointerEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, []);

  function pick(row: Row) {
    onValue(row.value);
    setOpen(false);
  }

  return (
    <label ref={box} className="relative block text-sm">
      {label}
      <input
        name={name}
        value={value}
        disabled={disabled}
        maxLength={name === "brand" ? 80 : textInputLimit}
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        placeholder={placeholder}
        className={inputClass}
        onFocus={() => {
          if (!disabled) setOpen(true);
        }}
        onChange={(event) => {
          onValue(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActive((index) => Math.min(index + 1, Math.max(rows.length - 1, 0)));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) => Math.max(index - 1, 0));
          } else if (event.key === "Enter" && open && rows[highlighted]) {
            event.preventDefault();
            pick(rows[highlighted]);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && rows.length > 0 && !disabled ? (
        <ul role="listbox" className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-auto rounded-2xl border border-line bg-white py-1 shadow">
          {rows.map((row, index) => (
            <li key={row.id}>
              <button
                type="button"
                role="option"
                aria-selected={index === highlighted}
                className={`block w-full px-3 py-2 text-left text-sm ${index === highlighted ? "bg-foam" : ""}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(row)}
              >
                {row.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </label>
  );
}

function suggestRows(value: string, options: string[], minLength: number): Row[] {
  const query = value.trim().toLocaleLowerCase("ru");
  const matches = (query ? options.filter((item) => item.toLocaleLowerCase("ru").includes(query)) : options).slice(0, 8);
  const rows: Row[] = matches.map((item) => ({ id: `option:${item}`, label: item, value: item }));
  const exact = query !== "" && options.some((item) => item.toLocaleLowerCase("ru") === query);
  if (query.length >= minLength && !exact) {
    rows.push({ id: "add", label: `Добавить «${value.trim()}»`, value: value.trim() });
  }
  return rows;
}
