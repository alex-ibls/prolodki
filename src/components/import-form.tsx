"use client";

import { useActionState } from "react";
import { importCsvAction, type ImportState } from "@/actions/admin";
import { buttonClass, inputClass, secondaryClass } from "@/components/styles";

const fullSample = `sku,title,category_slug,brand,model,year,price,compare_at_price,quantity,city,description
SV-391,Лодка Север 391,alum-tiller,Риверботс,391,2026,210000,,2,Химки,Короткое описание`;

const correctionSample = `sku,price,quantity
SV-390,205000,3`;

export function ImportForm() {
  const [state, action, pending] = useActionState(importCsvAction, null as ImportState);
  return (
    <form action={action} className="grid gap-4">
      <label className="text-sm">
        Режим
        <select name="mode" className={inputClass} defaultValue="full">
          <option value="full">Загрузка карточек</option>
          <option value="correction">Корректировка цены и остатка</option>
        </select>
      </label>
      <label className="text-sm">
        CSV-файл
        <input name="file" type="file" accept=".csv,text/csv" className={inputClass} />
      </label>
      <label className="text-sm">
        Или вставьте текст
        <textarea name="csv" rows={8} className={inputClass} placeholder={fullSample} />
      </label>
      <p className="text-sm text-muted">
        Корректировка: <code>{correctionSample.split("\n")[0]}</code>
      </p>
      <button className={pending ? secondaryClass : buttonClass} disabled={pending}>
        {pending ? "Загрузка…" : "Применить"}
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
