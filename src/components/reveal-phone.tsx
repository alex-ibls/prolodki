"use client";

import { useState } from "react";
import { revealPhoneAction } from "@/actions/activity";
import { secondaryClass } from "@/components/styles";

export function RevealPhone({ listingId }: { listingId: string }) {
  const [phone, setPhone] = useState("");
  const [pending, setPending] = useState(false);

  if (phone) {
    const href = phone.replace(/[^\d+]/g, "");
    return (
      <p className="mt-4">
        <a href={`tel:${href}`} className="text-lg font-semibold">
          {phone}
        </a>
      </p>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <span className="tracking-wide text-muted" aria-hidden>
        +7 ••• ••• •• ••
      </span>
      <button
        type="button"
        className={secondaryClass}
        disabled={pending}
        onClick={async () => {
          setPending(true);
          try {
            const value = await revealPhoneAction(listingId);
            setPhone(value || "Телефон не указан");
          } catch {
            setPhone("Не удалось показать телефон");
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? "Открываем…" : "Показать телефон"}
      </button>
    </div>
  );
}
