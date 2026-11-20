"use client";

import { useState } from "react";
import { SpecIcon, characteristicIcons } from "@/components/spec-icon";

export function IconPicker({ name, value }: { name: string; value: string }) {
  const [icon, setIcon] = useState(value);
  const [open, setOpen] = useState(false);
  const current = characteristicIcons.find((item) => item.id === icon) ?? characteristicIcons[0];

  return (
    <div className="relative">
      <input type="hidden" name={name} value={icon} />
      <button
        type="button"
        className="mt-1 flex h-10 w-full items-center gap-2 border border-line bg-white px-2 text-sm text-ink"
        aria-label={`Иконка: ${current.label}`}
        aria-expanded={open}
        onClick={() => setOpen((next) => !next)}
      >
        <SpecIcon icon={icon} className="h-5 w-5" />
        <span>{current.label}</span>
      </button>
      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-30" aria-label="Закрыть выбор иконки" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 z-40 mb-1 grid w-56 grid-cols-4 gap-1 border border-line bg-white p-1">
            {characteristicIcons.map((item) => (
              <button
                key={item.id || "circle"}
                type="button"
                className={`flex h-10 items-center justify-center text-deep ${item.id === icon ? "bg-deep text-white" : "hover:bg-foam"}`}
                aria-label={item.label}
                aria-pressed={item.id === icon}
                onClick={() => {
                  setIcon(item.id);
                  setOpen(false);
                }}
              >
                <SpecIcon icon={item.id} className="h-5 w-5" />
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
