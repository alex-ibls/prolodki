"use client";

import { useState } from "react";
import { secondaryClass } from "@/components/styles";

export function CaptchaField({
  seed,
  value,
  error,
  onChange,
  onBlur,
}: {
  seed: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const [nonce, setNonce] = useState(seed);
  const errorId = "captcha-error";
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-3">
        {/* Картинка приходит с сервера и не кэшируется: в разметке нет текста кода. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/captcha?n=${nonce}`}
          alt="Проверочный код"
          width={220}
          height={72}
          className="h-[72px] w-[220px] rounded-xl border border-line bg-paper object-contain"
        />
        <button
          type="button"
          className={secondaryClass}
          onClick={() => {
            setNonce(crypto.randomUUID());
            onChange("");
          }}
        >
          Другой код
        </button>
      </div>
      <label className="text-sm">
        Код с картинки
        <input
          name="captcha"
          value={value}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          className={`field mt-1 w-full border bg-white px-3 py-2 text-sm outline-none ${
            error ? "border-red-400 focus:border-red-500" : "border-line focus:border-navy"
          }`}
        />
        {error ? (
          <span id={errorId} className="mt-1 block text-xs text-red-700">
            {error}
          </span>
        ) : null}
      </label>
    </div>
  );
}
