"use client";

import { useEffect, useState } from "react";
import { toggleFavoriteAction } from "@/actions/activity";
import { HeartIcon, ShareIcon } from "@/components/action-icons";
import { iconActionClass } from "@/components/styles";

export function FavoriteButton({
  listingId,
  slug,
  saved,
  back,
}: {
  listingId: string;
  slug: string;
  saved: boolean;
  back?: string;
}) {
  return (
    <form action={toggleFavoriteAction}>
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="slug" value={slug} />
      {back ? <input type="hidden" name="back" value={back} /> : null}
      <button type="submit" className={iconActionClass} aria-label={saved ? "В избранном" : "В избранное"} aria-pressed={saved}>
        <HeartIcon filled={saved} />
      </button>
    </form>
  );
}

export function ShareButton({ title }: { title: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function copy() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const field = document.createElement("textarea");
      field.value = url;
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
    setCopied(true);
    window.setTimeout(() => {
      setCopied(false);
      setOpen(false);
    }, 1200);
  }

  const url = typeof window === "undefined" ? "" : window.location.href;
  const networks = shareNetworks(title, url);

  return (
    <div className="relative">
      <button
        type="button"
        className={iconActionClass}
        aria-label="Поделиться"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setCopied(false);
          setOpen((value) => !value);
        }}
      >
        <ShareIcon />
      </button>
      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-30" aria-label="Закрыть" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute bottom-full left-0 z-40 mb-2 grid w-52 gap-1 rounded border border-line bg-white p-1 md:bottom-auto md:top-full md:mt-2 md:mb-0"
          >
            {networks.map((item) => (
              <a
                key={item.id}
                role="menuitem"
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-foam"
                onClick={() => setOpen(false)}
              >
                <ShareMark name={item.id} />
                {item.label}
              </a>
            ))}
            <button type="button" role="menuitem" className="flex items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-foam" onClick={() => void copy()}>
              <ShareMark name="copy" />
              {copied ? "Ссылка скопирована" : "Скопировать ссылку"}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function shareNetworks(title: string, url: string) {
  const page = encodeURIComponent(url);
  const text = encodeURIComponent(title);
  return [
    { id: "vk" as const, label: "ВКонтакте", href: `https://vk.com/share.php?url=${page}&title=${text}` },
    { id: "tg" as const, label: "Telegram", href: `https://t.me/share/url?url=${page}&text=${text}` },
    { id: "wa" as const, label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}` },
    { id: "max" as const, label: "MAX", href: `https://max.ru/:share?text=${encodeURIComponent(`${title} ${url}`)}` },
  ];
}

function ShareMark({ name }: { name: "vk" | "tg" | "wa" | "max" | "copy" }) {
  if (name === "copy") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <rect x="8" y="8" width="11" height="11" rx="1.5" />
        <path d="M5 15V5.5A1.5 1.5 0 0 1 6.5 4H15" />
      </svg>
    );
  }
  const label = name === "vk" ? "VK" : name === "tg" ? "TG" : name === "wa" ? "WA" : "MAX";
  return (
    <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center font-bold leading-none ${name === "max" ? "text-[8px]" : "text-[10px]"}`}>
      {label}
    </span>
  );
}
