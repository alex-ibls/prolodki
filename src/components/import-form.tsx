"use client";

import { useActionState } from "react";
import { importWorkbookAction, type ImportState } from "@/actions/admin";
import { buttonClass, inputClass, secondaryClass } from "@/components/styles";

export function ImportForm() {
  const [state, action, pending] = useActionState(importWorkbookAction, null as ImportState);
  return (
    <form action={action} className="grid gap-4">
      <p className="text-sm text-muted">
        Загрузите файл Excel в том виде, в котором его скачивает админка. Колонки: артикул, название, категория, цена, склад, витрина. Резерв, доступный остаток и дата добавления не меняются.
      </p>
      <a href="/admin/export?entity=nomenclature" className={`${secondaryClass} w-fit`}>
        Скачать текущий файл
      </a>
      <label className="text-sm">
        Файл Excel
        <input
          name="file"
          type="file"
          required
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className={inputClass}
        />
      </label>
      <button className={pending ? secondaryClass : buttonClass} disabled={pending}>
        {pending ? "Загрузка…" : "Загрузить"}
      </button>
      {state && "error" in state ? <p className="text-sm text-red-700">{state.error}</p> : null}
      {state && "applied" in state ? (
        <div className="text-sm">
          <p>Применено строк: {state.applied}</p>
          {state.errors.length > 0 ? (
            <ul className="mt-2 list-disc pl-5 text-red-800">
              {state.errors.map((error) => (
                <li key={`${error.line}-${error.message}`}>
                  Строка {error.line}: {error.message}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-moss">Ошибок нет.</p>
          )}
        </div>
      ) : null}
    </form>
  );
}
