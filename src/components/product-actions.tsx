"use client";

import { useEffect, useState } from "react";
import { toggleFavoriteAction, toggleFavoriteQuietAction } from "@/actions/activity";
import { HeartIcon, ShareIcon } from "@/components/action-icons";

const iconButtonClass =
  "inline-flex h-10 w-10 items-center justify-center rounded-[6px] border border-moss bg-white text-sm font-semibold text-moss hover:border-moss-hover hover:text-moss-hover";
const photoIconClass =
  "inline-flex h-9 w-9 items-center justify-center text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]";

export function FavoriteButton({
  listingId,
  slug,
  saved,
  back,
  labeled = false,
  stay = false,
}: {
  listingId: string;
  slug: string;
  saved: boolean;
  back?: string;
  labeled?: boolean;
  stay?: boolean;
}) {
  const [pressed, setPressed] = useState(saved);
  useEffect(() => {
    setPressed(saved);
  }, [saved]);
  const shown = stay ? pressed : saved;
  const label = shown ? "В избранном" : "В избранное";
  const className = labeled
    ? `${iconButtonClass} md:h-auto md:w-auto md:gap-2 md:px-3 md:py-2`
    : photoIconClass;

  function keep() {
    const next = !pressed;
    setPressed(next);
    void toggleFavoriteQuietAction(listingId).then(setPressed, () => setPressed(!next));
  }

  if (stay) {
    return (
      <button type="button" className={className} aria-label={label} aria-pressed={shown} onMouseDown={(event) => event.preventDefault()} onClick={keep}>
        <HeartIcon filled={shown} />
      </button>
    );
  }

  return (
    <form action={toggleFavoriteAction} className="inline-flex">
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="slug" value={slug} />
      {back ? <input type="hidden" name="back" value={back} /> : null}
      <button type="submit" className={className} aria-label={label} aria-pressed={shown}>
        <HeartIcon filled={shown} />
        {labeled ? <span className="hidden md:inline">{label}</span> : null}
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
        className={`${iconButtonClass} md:h-auto md:w-auto md:gap-2 md:px-3 md:py-2`}
        aria-label="Поделиться"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setCopied(false);
          setOpen((value) => !value);
        }}
      >
        <ShareIcon />
        <span className="hidden md:inline">Поделиться</span>
      </button>
      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-30" aria-label="Закрыть" onClick={() => setOpen(false)} />
          <div role="menu" className="absolute left-0 top-full z-40 mt-2 grid w-52 gap-1 rounded-[6px] border border-line bg-white p-1">
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
