"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { createKitPositionAction, type CreatedKitItem } from "@/actions/kit";
import { buttonClass, inputClass, secondaryClass } from "@/components/styles";

type Kind = "fit" | "extra";

export function KitCreateButton({
  label = "Новая позиция",
  defaultKind = "extra",
  defaultSku = "",
  defaultName = "",
  lockKind = false,
  className = buttonClass,
  onCreated,
}: {
  label?: string;
  defaultKind?: Kind;
  defaultSku?: string;
  defaultName?: string;
  lockKind?: boolean;
  className?: string;
  onCreated?: (item: CreatedKitItem) => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    if (pending) return;
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        {label}
      </button>
      {open
        ? createPortal(
            <div className="fixed inset-0 z-[90] flex items-center justify-center bg-deep/40 p-4" onClick={close}>
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="grid w-full max-w-lg gap-3 rounded-xl border border-line bg-white p-4"
                onClick={(event) => event.stopPropagation()}
              >
                <h2 id={titleId} className="text-lg font-semibold text-deep">
                  Новая позиция
                </h2>
                <form
                  className="grid gap-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const data = new FormData(event.currentTarget);
                    setError("");
                    startTransition(async () => {
                      const result = await createKitPositionAction(data);
                      if (!result.ok) {
                        setError(result.error);
                        return;
                      }
                      setOpen(false);
                      if (onCreated) onCreated(result.item);
                      else router.push(`/admin/kit/${result.item.id}`);
                    });
                  }}
                >
                  {lockKind ? (
                    <>
                      <input type="hidden" name="kind" value={defaultKind} />
                      <p className="text-sm text-muted">{defaultKind === "extra" ? "Доп. оборудование" : "Исполнение"}</p>
                    </>
                  ) : (
                    <label className="text-sm">
                      Тип
                      <select name="kind" className={inputClass} defaultValue={defaultKind}>
                        <option value="fit">Исполнение</option>
                        <option value="extra">Доп. оборудование</option>
                      </select>
                    </label>
                  )}
                  <label className="text-sm">
                    Артикул
                    <input name="sku" required maxLength={40} defaultValue={defaultSku} className={inputClass} placeholder="DECK-01" />
                  </label>
                  <label className="text-sm">
                    Название
                    <input name="name" required maxLength={80} defaultValue={defaultName} className={inputClass} />
                  </label>
                  <label className="text-sm">
                    Цена, ₽
                    <input name="priceRub" inputMode="numeric" defaultValue="0" className={inputClass} />
                  </label>
                  <label className="text-sm">
                    Изображение
                    <input name="image" type="file" accept="image/jpeg,image/png,image/webp" className={`${inputClass} py-1`} />
                  </label>
                  {error ? <p className="text-sm text-red-700">{error}</p> : null}
                  <div className="flex justify-end gap-2">
                    <button type="button" className={secondaryClass} onClick={close}>
                      Отмена
                    </button>
                    <button className={buttonClass} disabled={pending}>
                      {pending ? "Сохраняем…" : "Добавить"}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
