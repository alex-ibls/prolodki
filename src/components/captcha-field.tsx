"use client";

import { useState } from "react";
import { inputClass, secondaryClass } from "@/components/styles";

export function CaptchaField({ seed }: { seed: string }) {
  const [nonce, setNonce] = useState(seed);
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
        <button type="button" className={secondaryClass} onClick={() => setNonce(crypto.randomUUID())}>
          Другой код
        </button>
      </div>
      <label className="text-sm">
        Код с картинки
        <input name="captcha" required autoComplete="off" spellCheck={false} className={inputClass} />
      </label>
    </div>
  );
}
