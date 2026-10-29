"use client";

import { useState } from "react";
import { inputClass } from "@/components/styles";

const maxPhotos = 10;

export function PhotoField({ existing = 0, disabled = false }: { existing?: number; disabled?: boolean }) {
  const [message, setMessage] = useState("");
  const room = Math.max(0, maxPhotos - existing);
  return (
    <label className="text-sm">
      Фото
      <input
        name="photos"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={disabled || room === 0}
        className={inputClass}
        onChange={(event) => {
          const count = event.currentTarget.files?.length ?? 0;
          if (count > room) {
            event.currentTarget.value = "";
            setMessage(room === 0 ? "У товара уже 10 фото" : room === 1 ? "Можно добавить ещё 1 фото" : `Можно добавить ещё ${room} фото`);
            return;
          }
          setMessage("");
        }}
      />
      <span className="mt-1 block text-xs text-muted">
        До 10 фото. JPEG, PNG или WebP, до 20 МБ. Файл сохраняется как WebP не шире 1600 px
        {existing > 0 ? `. Сейчас ${existing} из 10` : ""}
      </span>
      {message ? <span className="mt-1 block text-xs text-red-700">{message}</span> : null}
    </label>
  );
}
