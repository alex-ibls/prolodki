"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { saveNomenclatureAction } from "@/actions/admin";
import { buttonClass } from "@/components/styles";
import type { NomenclatureSaveState } from "@/lib/nomenclature-save";

export function NomenclatureFormShell({
  itemId,
  serverError,
  children,
}: {
  itemId?: string;
  serverError?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const lock = useRef(false);
  const [state, action, pending] = useActionState(saveNomenclatureAction, {
    id: itemId ?? null,
    href: null,
    error: serverError ?? null,
    nonce: "",
  } satisfies NomenclatureSaveState);
  const id = state.id || itemId || "";
  const creating = !id;

  useEffect(() => {
    if (!pending) lock.current = false;
  }, [pending]);

  useEffect(() => {
    if (!state.nonce || !state.href) return;
    const current = `${window.location.pathname}${window.location.search}`;
    if (current === state.href) router.refresh();
    else router.replace(state.href);
  }, [router, state.href, state.nonce]);

  const status = pending
    ? creating
      ? "Добавляем карточку…"
      : "Сохраняем карточку…"
    : state.nonce && state.href && !state.error && !itemId
      ? "Карточка добавлена."
      : "";

  function revealInvalid(form: HTMLFormElement) {
    let first: HTMLElement | null = null;
    for (const field of form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select")) {
      if (field.disabled || field.type === "hidden" || field.checkValidity()) continue;
      field.dispatchEvent(new Event("invalid", { cancelable: true }));
      first ??= field;
    }
    first?.focus();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (lock.current) return;
    if (!form.checkValidity()) {
      revealInvalid(form);
      return;
    }
    lock.current = true;
    const data = new FormData(form);
    startTransition(() => {
      action(data);
    });
  }

  return (
    <form className="grid gap-3 rounded-3xl border border-line bg-card p-4" onSubmit={submit}>
      {id ? <input type="hidden" name="id" value={id} /> : null}
      {status ? (
        <p className="save-banner flex items-center gap-2 rounded-md bg-foam px-4 py-3 text-sm text-deep" role="status">
          {pending ? <Spinner /> : null}
          {status}
        </p>
      ) : null}
      {state.error && !state.href ? (
        <p className="save-banner rounded-md bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
      {!state.nonce && serverError ? (
        <p className="save-banner rounded-md bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {serverError}
        </p>
      ) : null}
      {children}
      <button
        type="submit"
        className={`${buttonClass} gap-2`}
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? <Spinner /> : null}
        {pending ? (creating ? "Добавляем…" : "Сохраняем…") : creating ? "Добавить" : "Сохранить"}
      </button>
    </form>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 motion-safe:animate-spin" aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
