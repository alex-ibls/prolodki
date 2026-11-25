"use client";

import { useState } from "react";
import { PhotoFrame } from "@/components/photo-frame";
import { inputClass } from "@/components/styles";

export function KitPhotoField({ path }: { path: string }) {
  const [preview, setPreview] = useState("");
  return (
    <div className="grid max-w-sm gap-3">
      <PhotoFrame path={preview || path} alt="" className="aspect-[4/3] w-full rounded-[6px] bg-foam object-contain" />
      <label className="text-sm">
        {path || preview ? "Заменить изображение" : "Изображение"}
        <input
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className={`${inputClass} py-1`}
          onChange={(event) => {
            const file = event.target.files?.[0];
            setPreview((current) => {
              if (current) URL.revokeObjectURL(current);
              return file ? URL.createObjectURL(file) : "";
            });
          }}
        />
      </label>
    </div>
  );
}
