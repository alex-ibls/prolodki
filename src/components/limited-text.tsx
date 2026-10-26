"use client";

import { useState } from "react";
import { inputClass } from "@/components/styles";
import { listingDescriptionLimit } from "@/lib/description";

export function LimitedText({
  name,
  defaultValue = "",
  rows = 4,
}: {
  name: string;
  defaultValue?: string;
  rows?: number;
}) {
  const [value, setValue] = useState(defaultValue);
  const used = value.length;
  const full = used >= listingDescriptionLimit;
  const width = Math.min(100, (used / listingDescriptionLimit) * 100);
  return (
    <div>
      <textarea
        name={name}
        aria-label="Описание"
        rows={rows}
        value={value}
        onChange={(event) => setValue(event.target.value.slice(0, listingDescriptionLimit))}
        className={inputClass}
      />
      <div className="mt-2 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper">
          <div
            className={`h-full rounded-full ${full ? "bg-copper" : "bg-navy"}`}
            style={{ width: `${width}%` }}
          />
        </div>
        <span className={`shrink-0 text-xs ${full ? "font-semibold text-copper" : "text-muted"}`}>
          {used} / {listingDescriptionLimit}
        </span>
      </div>
    </div>
  );
}
