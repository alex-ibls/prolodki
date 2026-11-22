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
  const [touched, setTouched] = useState(false);
  const box = useRef<HTMLLabelElement>(null);
  const issue =
    name === "brand"
      ? value.trim().length > 0 && value.trim().length < 2
        ? "Не короче 2 символов"
        : value.trim().length > 80
          ? "Не больше 80 символов"
          : ""
      : value.trim().length > textInputLimit
        ? `Не больше ${textInputLimit} символов`
        : "";
  const rows = useMemo(() => suggestRows(value, options, minLength), [minLength, options, value]);
  const highlighted = rows.length ? Math.min(active, rows.length - 1) : 0;

  useEffect(() => {
    box.current?.querySelector("input")?.setCustomValidity(issue);
  }, [issue]);

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
        className={`${inputClass} ${touched && issue ? "border-red-400 focus:border-red-500" : ""}`}
        onFocus={() => {
          if (!disabled) setOpen(true);
        }}
        onBlur={() => setTouched(true)}
        onInvalid={() => setTouched(true)}
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
      {touched && issue ? <span className="mt-1 block text-xs text-red-700">{issue}</span> : null}
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
