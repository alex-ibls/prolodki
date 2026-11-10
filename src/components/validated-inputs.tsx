"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  decimalIssue,
  formatRublesInput,
  formatTenthsInput,
  formatYearInput,
  rubleIssue,
  textInputLimit,
  textIssue,
  yearIssue,
} from "@/lib/format";

function fieldClass(invalid: boolean) {
  return `field mt-1 w-full border bg-white px-3 py-2 text-sm outline-none ${
    invalid ? "border-red-400 focus:border-red-500" : "border-line focus:border-navy"
  }`;
}

type Mask = (raw: string, caret: number) => { value: string; caret: number };
type Kind = "decimal" | "digits";

function allowedChar(char: string, kind: Kind) {
  if (char >= "0" && char <= "9") return true;
  return kind === "decimal" && (char === "," || char === ".");
}

function blockForeignKey(event: KeyboardEvent<HTMLInputElement>, kind: Kind) {
  if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;
  if (!allowedChar(event.key, kind)) event.preventDefault();
}

function blockForeign(event: FormEvent<HTMLInputElement>, kind: Kind, format: Mask, commit: (value: string) => void) {
  const native = event.nativeEvent;
  if (!(native instanceof InputEvent) || !native.inputType.startsWith("insert")) return;
  const data = native.data ?? "";
  const input = event.currentTarget;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  const proposed = input.value.slice(0, start) + data + input.value.slice(end);
  const next = format(proposed, start + data.length);
  const foreign = [...data].some((char) => !allowedChar(char, kind));
  if (!foreign && next.value === proposed) return;
  event.preventDefault();
  if (next.value === input.value) return;
  input.value = next.value;
  input.setSelectionRange(next.caret, next.caret);
  commit(next.value);
}

function paint(input: HTMLInputElement, format: Mask) {
  const next = format(input.value, input.selectionStart ?? input.value.length);
  if (input.value !== next.value) {
    input.value = next.value;
    input.setSelectionRange(next.caret, next.caret);
  }
  return next.value;
}

function useIssue(check: (value: string) => string, initial: string) {
  const ref = useRef<HTMLInputElement>(null);
  const [issue, setIssue] = useState("");
  const [visible, setVisible] = useState(false);
  function apply(value: string, show: boolean) {
    const next = check(value);
    setIssue(next);
    if (show) setVisible(true);
    ref.current?.setCustomValidity(next);
  }
  useEffect(() => {
    apply(initial, false);
    // The first check only mirrors the value already rendered in the input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return {
    ref,
    message: visible ? issue : "",
    onChange: (value: string) => apply(value, false),
    onBlur: (value: string) => apply(value, true),
    onInvalid: () => setVisible(true),
  };
}

export function TextInput({
  name,
  defaultValue = "",
  required = false,
  disabled = false,
  min = 0,
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
  min?: number;
}) {
  const field = useIssue((value) => textIssue(value, { required, min }), defaultValue);
  const [used, setUsed] = useState(defaultValue.length);
  return (
    <>
      <input
        ref={field.ref}
        name={name}
        required={required}
        disabled={disabled}
        maxLength={textInputLimit}
        defaultValue={defaultValue}
        className={fieldClass(Boolean(field.message))}
        onChange={(event) => {
          setUsed(event.target.value.length);
          field.onChange(event.target.value);
        }}
        onBlur={(event) => field.onBlur(event.target.value)}
        onInvalid={field.onInvalid}
      />
      <span className="mt-1 flex justify-between gap-2 text-xs">
        <span className="text-red-700">{field.message}</span>
        <span className={used >= textInputLimit ? "font-semibold text-copper" : "text-muted"}>
          {used} / {textInputLimit}
        </span>
      </span>
    </>
  );
}

export function DecimalInput({
  name,
  defaultValue = "",
  required = false,
  disabled = false,
  places = 1,
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
  places?: 1 | 2;
}) {
  const initial = formatTenthsInput(defaultValue, defaultValue.length, places).value.replace(/\.$/, "");
  const field = useIssue((value) => decimalIssue(value.endsWith(".") ? value.slice(0, -1) : value, { required, places }), initial);
  useEffect(() => {
    const input = field.ref.current;
    const form = input?.form;
    if (!input || !form) return;
    const tidy = () => {
      if (input.value.endsWith(".")) input.value = input.value.slice(0, -1);
    };
    form.addEventListener("submit", tidy);
    return () => form.removeEventListener("submit", tidy);
  }, [field.ref]);
  return (
    <>
      <input
        ref={field.ref}
        name={name}
        inputMode="decimal"
        required={required}
        disabled={disabled}
        defaultValue={initial}
        className={fieldClass(Boolean(field.message))}
        onKeyDown={(event) => blockForeignKey(event, "decimal")}
        onBeforeInput={(event) =>
          blockForeign(event, "decimal", (raw, caret) => formatTenthsInput(raw, caret, places), field.onChange)
        }
        onChange={(event) => field.onChange(paint(event.currentTarget, (raw, caret) => formatTenthsInput(raw, caret, places)))}
        onBlur={(event) => {
          const input = event.currentTarget;
          if (input.value.endsWith(".")) input.value = input.value.slice(0, -1);
          field.onBlur(input.value);
        }}
        onInvalid={field.onInvalid}
      />
      {field.message ? <span className="mt-1 block text-xs text-red-700">{field.message}</span> : null}
    </>
  );
}

export function RubleInput({
  name,
  defaultValue = "",
  required = false,
  disabled = false,
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const initial = formatRublesInput(defaultValue).value;
  const field = useIssue((value) => rubleIssue(value, required), initial);
  return (
    <>
      <input
        ref={field.ref}
        name={name}
        inputMode="numeric"
        required={required}
        disabled={disabled}
        defaultValue={initial}
        className={fieldClass(Boolean(field.message))}
        onKeyDown={(event) => blockForeignKey(event, "digits")}
        onBeforeInput={(event) => blockForeign(event, "digits", formatRublesInput, field.onChange)}
        onChange={(event) => field.onChange(paint(event.currentTarget, formatRublesInput))}
        onBlur={(event) => field.onBlur(event.currentTarget.value)}
        onInvalid={field.onInvalid}
      />
      {field.message ? <span className="mt-1 block text-xs text-red-700">{field.message}</span> : null}
    </>
  );
}

export function YearInput({
  name,
  defaultValue = "",
  disabled = false,
}: {
  name: string;
  defaultValue?: string;
  disabled?: boolean;
}) {
  const initial = formatYearInput(defaultValue).value;
  const field = useIssue(yearIssue, initial);
  return (
    <>
      <input
        ref={field.ref}
        name={name}
        inputMode="numeric"
        disabled={disabled}
        defaultValue={initial}
        className={fieldClass(Boolean(field.message))}
        onKeyDown={(event) => blockForeignKey(event, "digits")}
        onBeforeInput={(event) => blockForeign(event, "digits", formatYearInput, field.onChange)}
        onChange={(event) => field.onChange(paint(event.currentTarget, formatYearInput))}
        onBlur={(event) => field.onBlur(event.currentTarget.value)}
        onInvalid={field.onInvalid}
      />
      {field.message ? <span className="mt-1 block text-xs text-red-700">{field.message}</span> : null}
    </>
  );
}
