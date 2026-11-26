"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { reorderNomenclaturePhotosAction } from "@/actions/admin";
import { PhotoFrame } from "@/components/photo-frame";
import { buttonClass, secondaryClass } from "@/components/styles";

const maxPhotos = 10;

type Preview = { key: string; src: string };

export function PhotoField({
  images = [],
  disabled = false,
  orderable = false,
  nomenclatureId,
}: {
  images?: { id: string; path: string }[];
  disabled?: boolean;
  orderable?: boolean;
  nomenclatureId?: string;
}) {
  if (orderable && !disabled) return <OrderedPhotos images={images} nomenclatureId={nomenclatureId} />;
  return <StaticPhotoField images={images} disabled={disabled} />;
}

function StaticPhotoField({
  images = [],
  disabled = false,
}: {
  images?: { id: string; path: string }[];
  disabled?: boolean;
}) {
  const [message, setMessage] = useState("");
  const [removed, setRemoved] = useState<string[]>([]);
  const [picked, setPicked] = useState<Preview[]>([]);
  const [pending, setPending] = useState<{ kind: "saved"; id: string } | { kind: "picked"; index: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const urls = useRef<string[]>([]);
  const kept = images.filter((image) => !removed.includes(image.id));
  const room = Math.max(0, maxPhotos - kept.length);
  const canAdd = !disabled && room > 0;

  useEffect(() => {
    return () => {
      for (const url of urls.current) URL.revokeObjectURL(url);
    };
  }, []);

  useEffect(() => {
    if (!pending) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setPending(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending]);

  function confirmRemove() {
    if (!pending) return;
    if (pending.kind === "saved") setRemoved((current) => [...current, pending.id]);
    else removePicked(pending.index);
    setPending(null);
  }

  function showFiles(files: File[]) {
    for (const url of urls.current) URL.revokeObjectURL(url);
    const next = files.map((file, index) => ({
      key: `${index}-${file.name}-${file.size}-${file.lastModified}`,
      src: URL.createObjectURL(file),
    }));
    urls.current = next.map((item) => item.src);
    setPicked(next);
  }

  function removePicked(index: number) {
    const input = inputRef.current;
    if (!input) return;
    const next = new DataTransfer();
    [...(input.files ?? [])].forEach((file, fileIndex) => {
      if (fileIndex !== index) next.items.add(file);
    });
    input.files = next.files;
    showFiles([...next.files]);
  }

  return (
    <div className="text-sm">
      Фото
      {removed.map((id) => (
        <input key={id} type="hidden" name="removePhoto" value={id} />
      ))}
      <div className="mt-1 flex flex-wrap gap-2">
        {kept.map((image) => (
          <div key={image.id} className="relative h-20 w-20">
            <PhotoFrame path={image.path} className="h-20 w-20 rounded-xl object-cover" />
            {disabled ? null : (
              <button
                type="button"
                aria-label="Удалить фото"
                onClick={() => setPending({ kind: "saved", id: image.id })}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center bg-deep text-sm leading-none text-white"
              >
                ×
              </button>
            )}
          </div>
        ))}
        {picked.map((image, index) => (
          <div key={image.key} className="relative h-20 w-20">
            <PhotoFrame path={image.src} className="h-20 w-20 rounded-xl object-cover" />
            <button
              type="button"
              aria-label="Убрать выбранное фото"
              onClick={() => setPending({ kind: "picked", index })}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center bg-deep text-sm leading-none text-white"
            >
              ×
            </button>
          </div>
        ))}
        {canAdd ? (
          <label className="flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-dashed border-line bg-white text-muted hover:border-navy hover:text-navy">
            <input
              ref={inputRef}
              name="photos"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={(event) => {
                const files = [...(event.currentTarget.files ?? [])];
                if (files.length > room) {
                  event.currentTarget.value = "";
                  showFiles([]);
                  setMessage(room === 1 ? "Можно добавить ещё 1 фото" : `Можно добавить ещё ${room} фото`);
                  return;
                }
                showFiles(files);
                setMessage("");
              }}
            />
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="sr-only">Добавить фото</span>
          </label>
        ) : null}
      </div>
      <span className="mt-1 block text-xs text-muted">
        До 10 фото. JPEG, PNG или WebP, до 20 МБ
        {kept.length > 0 ? `. Сейчас ${kept.length} из 10` : ""}
      </span>
      {message ? <span className="mt-1 block text-xs text-red-700">{message}</span> : null}
      {pending ? (
        <PhotoDeleteDialog
          saved={pending.kind === "saved"}
          onKeep={() => setPending(null)}
          onRemove={confirmRemove}
        />
      ) : null}
    </div>
  );
}

type SavedSlot = { kind: "saved"; id: string; path: string };
type NewSlot = { kind: "new"; key: string; file: File; src: string };
type Slot = SavedSlot | NewSlot;
type Drag = {
  key: string;
  path: string;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  drop: number;
};

function slotKey(slot: Slot) {
  return slot.kind === "saved" ? slot.id : slot.key;
}

function slotPath(slot: Slot) {
  return slot.kind === "saved" ? slot.path : slot.src;
}

function gapIndex(list: HTMLElement | null, x: number, y: number) {
  const nodes = [...(list?.querySelectorAll<HTMLElement>("[data-photo-slot]") ?? [])];
  if (nodes.length === 0) return 0;
  const rows: { items: { index: number; rect: DOMRect }[] }[] = [];
  nodes.forEach((node, index) => {
    const rect = node.getBoundingClientRect();
    const row = rows.find((item) => Math.abs(item.items[0].rect.top - rect.top) < 8);
    if (row) row.items.push({ index, rect });
    else rows.push({ items: [{ index, rect }] });
  });
  const row = rows.find((item) => y <= item.items[0].rect.bottom + 8) ?? rows[rows.length - 1];
  for (const item of row.items) {
    if (x < item.rect.left + item.rect.width / 2) return item.index;
  }
  return row.items[row.items.length - 1].index + 1;
}

function OrderedPhotos({ images, nomenclatureId }: { images: { id: string; path: string }[]; nomenclatureId?: string }) {
  const [message, setMessage] = useState("");
  const [removed, setRemoved] = useState<string[]>([]);
  const [slots, setSlots] = useState<Slot[]>(() => images.map((image) => ({ kind: "saved", id: image.id, path: image.path })));
  const [pending, setPending] = useState<{ kind: "saved"; id: string } | { kind: "new"; key: string } | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const slotsRef = useRef(slots);
  const listRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const savedCount = slots.filter((slot) => slot.kind === "saved").length;
  const room = Math.max(0, maxPhotos - savedCount);

  useEffect(() => {
    return () => {
      for (const slot of slots) if (slot.kind === "new") URL.revokeObjectURL(slot.src);
    };
    // Blob URLs live until the field unmounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pending) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setPending(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending]);

  function syncFiles(next: Slot[]) {
    const input = inputRef.current;
    if (!input) return;
    const transfer = new DataTransfer();
    for (const slot of next) if (slot.kind === "new") transfer.items.add(slot.file);
    input.files = transfer.files;
  }

  function commit(next: Slot[]) {
    slotsRef.current = next;
    setSlots(next);
    syncFiles(next);
  }

  function savedIds(list: Slot[]) {
    return list.flatMap((slot) => (slot.kind === "saved" ? [slot.id] : []));
  }

  function persist(previous: Slot[], next: Slot[]) {
    if (!nomenclatureId) return;
    const ids = savedIds(next);
    if (ids.length < 2 || ids.join() === savedIds(previous).join()) return;
    void reorderNomenclaturePhotosAction(nomenclatureId, ids).then((result) => {
      if (result.error) setMessage(result.error);
    });
  }

  function rememberDrag(next: Drag | null) {
    dragRef.current = next;
    setDrag(next);
  }

  function startDrag(event: ReactPointerEvent<HTMLDivElement>, index: number) {
    if (event.button !== 0 || (event.target as HTMLElement).closest("button")) return;
    const tile = event.currentTarget;
    const slot = slotsRef.current[index];
    if (!slot) return;
    const photo = tile.querySelector("img, [role='img']") ?? tile;
    const rect = photo.getBoundingClientRect();
    const originX = event.clientX;
    const originY = event.clientY;
    function onMove(ev: PointerEvent) {
      const moved = Math.hypot(ev.clientX - originX, ev.clientY - originY) >= 4;
      if (!dragRef.current && !moved) return;
      rememberDrag({
        key: slotKey(slot),
        path: slotPath(slot),
        x: ev.clientX,
        y: ev.clientY,
        offsetX: originX - rect.left,
        offsetY: originY - rect.top,
        width: rect.width,
        height: rect.height,
        drop: gapIndex(listRef.current, ev.clientX, ev.clientY),
      });
    }

    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      const current = dragRef.current;
      rememberDrag(null);
      if (!current) return;
      const source = slotsRef.current;
      const from = source.findIndex((item) => slotKey(item) === current.key);
      if (from < 0) return;
      const rest = source.filter((item) => slotKey(item) !== current.key);
      const at = Math.max(0, Math.min(current.drop, rest.length));
      const next = [...rest.slice(0, at), source[from], ...rest.slice(at)];
      commit(next);
      persist(source, next);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  function confirmRemove() {
    if (!pending) return;
    if (pending.kind === "saved") {
      setRemoved((current) => [...current, pending.id]);
      commit(slots.filter((slot) => slot.kind !== "saved" || slot.id !== pending.id));
    } else {
      const slot = slots.find((item) => item.kind === "new" && item.key === pending.key);
      if (slot?.kind === "new") URL.revokeObjectURL(slot.src);
      commit(slots.filter((item) => item.kind !== "new" || item.key !== pending.key));
    }
    setPending(null);
  }

  function takeFiles(files: File[]) {
    if (files.length > room) {
      setMessage(room === 1 ? "Можно добавить ещё 1 фото" : room === 0 ? "У товара уже 10 фото" : `Можно добавить ещё ${room} фото`);
      return;
    }
    for (const slot of slots) if (slot.kind === "new") URL.revokeObjectURL(slot.src);
    const added: NewSlot[] = files.map((file, index) => ({
      kind: "new",
      key: `${index}-${file.name}-${file.size}-${file.lastModified}`,
      file,
      src: URL.createObjectURL(file),
    }));
    commit([...slots.filter((slot) => slot.kind === "saved"), ...added]);
    setMessage("");
  }

  let newIndex = 0;
  const preview = drag ? slots.filter((slot) => slotKey(slot) !== drag.key) : slots;
  const cells: Array<{ kind: "slot"; slot: Slot } | { kind: "gap" }> = preview.map((slot) => ({ kind: "slot", slot }));
  if (drag) cells.splice(Math.max(0, Math.min(drag.drop, cells.length)), 0, { kind: "gap" });

  return (
    <div className="text-sm">
      Фото
      {removed.map((id) => (
        <input key={id} type="hidden" name="removePhoto" value={id} />
      ))}
      {slots.map((slot) => (
        <input key={slotKey(slot)} type="hidden" name="photoOrder" value={slot.kind === "saved" ? slot.id : `new:${newIndex++}`} />
      ))}
      <div ref={listRef} className="mt-1 flex flex-wrap items-start gap-2">
        {cells.map((cell, index) => {
          if (cell.kind === "gap") {
            return <div key="gap" className="h-20 w-20 shrink-0 rounded-xl border border-dashed border-line bg-foam" />;
          }
          const key = slotKey(cell.slot);
          const sourceIndex = slots.findIndex((slot) => slotKey(slot) === key);
          return (
            <div
              key={key}
              data-photo-slot=""
              onPointerDown={(event) => startDrag(event, sourceIndex)}
              className="relative h-20 w-20 touch-none cursor-grab select-none active:cursor-grabbing"
            >
              <PhotoFrame path={slotPath(cell.slot)} className="h-20 w-20 rounded-xl object-cover" />
              {index === 0 ? (
                <span className="absolute left-1 top-1 rounded-[6px] bg-deep/80 px-1 text-[10px] leading-4 text-white">Главное</span>
              ) : null}
              <button
                type="button"
                aria-label="Удалить фото"
                onClick={() => setPending(cell.slot.kind === "saved" ? { kind: "saved", id: cell.slot.id } : { kind: "new", key: cell.slot.key })}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center bg-deep text-sm leading-none text-white"
              >
                ×
              </button>
            </div>
          );
        })}
        {room > 0 ? (
          <label className="flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-dashed border-line bg-white text-muted hover:border-navy hover:text-navy">
            <input
              ref={inputRef}
              name="photos"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={(event) => {
                const files = [...(event.currentTarget.files ?? [])];
                event.currentTarget.value = "";
                takeFiles(files);
              }}
            />
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="sr-only">Добавить фото</span>
          </label>
        ) : null}
      </div>
      {drag ? (
        <div
          className="pointer-events-none fixed z-[70] overflow-hidden rounded-xl shadow-[0_8px_24px_rgba(15,23,42,0.28)]"
          style={{ left: drag.x - drag.offsetX, top: drag.y - drag.offsetY, width: drag.width, height: drag.height }}
        >
          <PhotoFrame path={drag.path} className="h-full w-full object-cover" />
        </div>
      ) : null}
      <span className="mt-1 block text-xs text-muted">
        Первое фото — главное. Перетащите снимок, чтобы изменить порядок. До 10 фото, JPEG, PNG или WebP, до 20 МБ
        {savedCount > 0 ? `. Сейчас ${savedCount} из 10` : ""}
      </span>
      {message ? <span className="mt-1 block text-xs text-red-700">{message}</span> : null}
      {pending ? (
        <PhotoDeleteDialog
          saved={pending.kind === "saved"}
          onKeep={() => setPending(null)}
          onRemove={confirmRemove}
        />
      ) : null}
    </div>
  );
}

function PhotoDeleteDialog({ saved, onKeep, onRemove }: { saved: boolean; onKeep: () => void; onRemove: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-deep/40 p-4" onClick={onKeep}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="photo-delete-title"
            className="w-full max-w-sm rounded-xl border border-line bg-white p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <p id="photo-delete-title" className="font-semibold text-deep">
              Удалить это фото?
            </p>
            <p className="mt-1 text-muted">
              {saved ? "Оно исчезнет после сохранения." : "Файл будет убран из выбранных."}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className={secondaryClass} onClick={onKeep}>
                Оставить
              </button>
              <button type="button" className={buttonClass} onClick={onRemove}>
                Удалить
              </button>
            </div>
          </div>
        </div>
  );
}

