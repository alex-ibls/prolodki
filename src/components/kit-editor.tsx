"use client";

import { useMemo, useState } from "react";
import { inputClass, secondaryClass } from "@/components/styles";
import { formatRub } from "@/lib/format";

type Kind = "fit" | "extra";

type LibraryItem = {
  id: string;
  kind: string;
  name: string;
  priceKopeks: number;
  imagePath: string;
};

type DraftItem = {
  key: string;
  id: string | null;
  name: string;
  priceRub: string;
  imagePath: string;
  fileKey: string;
};

type DraftGroup = {
  key: string;
  name: string;
  kind: Kind;
  items: DraftItem[];
  query: string;
  open: boolean;
};

export function KitEditor({
  library,
  initial,
}: {
  library: LibraryItem[];
  initial: { name: string; kind: Kind; items: { id: string; name: string; priceKopeks: number; imagePath: string }[] }[];
}) {
  const [groups, setGroups] = useState<DraftGroup[]>(() =>
    initial.map((group) => ({
      key: crypto.randomUUID(),
      name: group.name,
      kind: group.kind,
      query: "",
      open: false,
      items: group.items.map((item) => ({
        key: item.id,
        id: item.id,
        name: item.name,
        priceRub: String(item.priceKopeks / 100),
        imagePath: item.imagePath,
        fileKey: "",
      })),
    })),
  );

  const payload = useMemo(
    () =>
      JSON.stringify(
        groups.map((group) => ({
          name: group.name,
          kind: group.kind,
          items: group.items.map((item) =>
            item.id ? { id: item.id } : { name: item.name, priceRub: item.priceRub, fileKey: item.fileKey },
          ),
        })),
      ),
    [groups],
  );

  function patch(key: string, next: Partial<DraftGroup>) {
    setGroups((current) => current.map((group) => (group.key === key ? { ...group, ...next } : group)));
  }

  function addLibraryItem(group: DraftGroup, item: LibraryItem) {
    if (group.items.some((row) => row.id === item.id)) return;
    patch(group.key, {
      query: "",
      items: [
        ...group.items,
        {
          key: item.id,
          id: item.id,
          name: item.name,
          priceRub: String(item.priceKopeks / 100),
          imagePath: item.imagePath,
          fileKey: "",
        },
      ],
    });
  }

  function addGroup() {
    const key = crypto.randomUUID();
    setGroups((current) => [...current, { key, name: "", kind: "fit", items: [], query: "", open: true }]);
    requestAnimationFrame(() => {
      document.getElementById(`kit-group-${key}`)?.scrollIntoView({ block: "nearest" });
    });
  }

  function addNewItem(group: DraftGroup) {
    const fileKey = crypto.randomUUID();
    patch(group.key, {
      items: [
        ...group.items,
        { key: fileKey, id: null, name: "", priceRub: "", imagePath: "", fileKey },
      ],
    });
  }

  return (
    <section className="grid gap-3 border-t border-line pt-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg">Конфигуратор</h2>
        <button type="button" className={secondaryClass} onClick={addGroup}>
          Добавить группу
        </button>
      </div>
      <p className="text-sm text-muted">
        Исполнение — один вариант в группе. Дополнительное оборудование можно выбрать несколько пунктов. Новый элемент попадает в общий список и доступен в других карточках.
      </p>
      <input type="hidden" name="kitJson" value={payload} />
      {groups.map((group) => {
        const matches = library.filter((item) => {
          if (item.kind !== group.kind) return false;
          if (group.items.some((row) => row.id === item.id)) return false;
          const query = group.query.trim().toLocaleLowerCase("ru");
          return !query || item.name.toLocaleLowerCase("ru").includes(query);
        });
        const title = group.name.trim() || "Новая группа";
        const kindLabel = group.kind === "extra" ? "Доп. оборудование" : "Исполнение";
        return (
          <div key={group.key} id={`kit-group-${group.key}`} className="bg-white">
            <button
              type="button"
              className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left hover:bg-foam"
              aria-expanded={group.open}
              aria-controls={`kit-group-body-${group.key}`}
              onClick={() => patch(group.key, { open: !group.open })}
            >
              <Caret open={group.open} />
              <span className="min-w-0 flex-1 font-semibold">{title}</span>
              <span className="text-sm text-muted">{kindLabel}</span>
              <span className="text-sm text-muted">{itemCount(group.items.length)}</span>
            </button>
            <div id={`kit-group-body-${group.key}`} className={group.open ? "grid gap-3 px-4 pb-4" : "hidden"}>
            <div className="grid gap-3 md:grid-cols-[1fr_16rem_auto]">
              <label className="text-sm">
                Группа
                <input
                  value={group.name}
                  maxLength={80}
                  placeholder="Носовая палуба"
                  className={inputClass}
                  onChange={(event) => patch(group.key, { name: event.target.value })}
                />
              </label>
              <label className="text-sm">
                Тип
                <select
                  value={group.kind}
                  className={inputClass}
                  onChange={(event) => {
                    const kind = event.target.value === "extra" ? "extra" : "fit";
                    patch(group.key, {
                      kind,
                      items: group.items.filter((item) => item.id === null || library.find((row) => row.id === item.id)?.kind === kind),
                    });
                  }}
                >
                  <option value="fit">Исполнение</option>
                  <option value="extra">Дополнительное оборудование</option>
                </select>
              </label>
              <button
                type="button"
                className={`${secondaryClass} self-end`}
                onClick={() => setGroups((current) => current.filter((row) => row.key !== group.key))}
              >
                Удалить группу
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {group.items.map((item) => (
                <div key={item.key} className="grid gap-2 border border-line p-3">
                  {item.imagePath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/media/${item.imagePath}`} alt="" className="h-24 w-full object-cover" />
                  ) : null}
                  {item.id ? (
                    <p className="text-sm font-semibold">
                      {item.name}
                      <span className="mt-1 block font-normal text-muted">
                        {Number(item.priceRub) > 0 ? `+ ${formatRub(Number(item.priceRub) * 100)}` : "без доплаты"}
                      </span>
                    </p>
                  ) : (
                    <>
                      <label className="text-sm">
                        Название
                        <input
                          value={item.name}
                          maxLength={80}
                          className={inputClass}
                          onChange={(event) =>
                            patch(group.key, {
                              items: group.items.map((row) => (row.key === item.key ? { ...row, name: event.target.value } : row)),
                            })
                          }
                        />
                      </label>
                      <label className="text-sm">
                        Стоимость, ₽
                        <input
                          value={item.priceRub}
                          inputMode="numeric"
                          placeholder="0"
                          className={inputClass}
                          onChange={(event) =>
                            patch(group.key, {
                              items: group.items.map((row) =>
                                row.key === item.key ? { ...row, priceRub: event.target.value.replace(/[^\d]/g, "") } : row,
                              ),
                            })
                          }
                        />
                      </label>
                      <label className="text-sm">
                        Изображение
                        <input type="file" name={`kitFile:${item.fileKey}`} accept="image/jpeg,image/png,image/webp" className={`${inputClass} py-1`} />
                      </label>
                    </>
                  )}
                  <button
                    type="button"
                    className="text-left text-sm text-muted"
                    onClick={() => patch(group.key, { items: group.items.filter((row) => row.key !== item.key) })}
                  >
                    Убрать
                  </button>
                </div>
              ))}
            </div>
            <label className="text-sm">
              Уже добавленные
              <input
                value={group.query}
                placeholder="Начните вводить название"
                className={inputClass}
                onChange={(event) => patch(group.key, { query: event.target.value })}
              />
            </label>
            {group.query.trim() && matches.length > 0 ? (
              <ul className="max-h-40 overflow-auto border border-line bg-white">
                {matches.slice(0, 8).map((item) => (
                  <li key={item.id}>
                    <button type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-foam" onClick={() => addLibraryItem(group, item)}>
                      {item.name}
                      <span className="text-muted"> · {item.priceKopeks > 0 ? `+ ${formatRub(item.priceKopeks)}` : "без доплаты"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <button type="button" className={`${secondaryClass} w-fit`} onClick={() => addNewItem(group)}>
              Новый элемент
            </button>
            </div>
          </div>
        );
      })}
      <button type="button" className={`${secondaryClass} w-fit`} onClick={addGroup}>
        Добавить группу
      </button>
    </section>
  );
}

function itemCount(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word =
    mod10 === 1 && mod100 !== 11 ? "элемент" : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "элемента" : "элементов";
  return `${count} ${word}`;
}

function Caret({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className={`h-4 w-4 shrink-0 text-navy ${open ? "rotate-90" : ""}`} aria-hidden>
      <path d="M7 4.5 13 10 7 15.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
