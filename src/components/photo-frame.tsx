"use client";

import { useState } from "react";

function photoSrc(path: string) {
  if (path.startsWith("blob:") || path.startsWith("data:") || path.startsWith("/") || path.startsWith("http")) return path;
  return `/media/${path}`;
}

export function PhotoFrame({ path, alt = "", className = "" }: { path?: string | null; alt?: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  const sized = /(?:^|\s)(?:aspect-|h-|w-|size-)/.test(className);
  if (!path || broken) return <PhotoPlaceholder className={sized ? className : `h-64 w-full ${className}`} />;
  return (
    // Local uploads are served by the app route and are not part of the image optimizer.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photoSrc(path)} alt={alt} draggable={false} className={className} onError={() => setBroken(true)} />
  );
}

export function PhotoPlaceholder({ className = "" }: { className?: string }) {
  return (
    <span role="img" aria-label="Нет фото" className={`flex items-center justify-center bg-foam text-muted ${className}`}>
      <svg viewBox="0 0 48 48" className="h-[clamp(1.25rem,32%,3.5rem)] w-[clamp(1.25rem,32%,3.5rem)]" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <rect x="7" y="11" width="34" height="26" rx="3" />
        <circle cx="18" cy="20" r="3" />
        <path d="M7 31.5 17 23l8 6 5-4 11 9" />
      </svg>
    </span>
  );
}
