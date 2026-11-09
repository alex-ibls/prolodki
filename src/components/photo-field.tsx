"use client";

import { useEffect, useRef, useState } from "react";
import { buttonClass, secondaryClass } from "@/components/styles";

const maxPhotos = 10;

type Preview = { key: string; src: string };

export function PhotoField({
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/media/${image.path}`} alt="" className="h-20 w-20 rounded-xl object-cover" />
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.src} alt="" className="h-20 w-20 rounded-xl object-cover" />
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
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-deep/40 p-4" onClick={() => setPending(null)}>
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
              {pending.kind === "saved" ? "Оно исчезнет после сохранения." : "Файл будет убран из выбранных."}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className={secondaryClass} onClick={() => setPending(null)}>
                Оставить
              </button>
              <button type="button" className={buttonClass} onClick={confirmRemove}>
                Удалить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
