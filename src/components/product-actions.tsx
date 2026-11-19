"use client";

import { useState } from "react";
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
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        return;
      }
      return;
    }
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
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button type="button" className={iconActionClass} aria-label={copied ? "Ссылка скопирована" : "Поделиться"} onClick={share}>
      <ShareIcon />
    </button>
  );
}
