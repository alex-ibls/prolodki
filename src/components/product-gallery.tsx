"use client";

import { useEffect, useRef, useState } from "react";

export function ProductGallery({ title, images }: { title: string; images: { path: string }[] }) {
  const strip = useRef<HTMLDivElement>(null);
  const lightbox = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const drag = useRef({ x: 0, moved: false });
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const photo = images[index] ?? images[0];

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  function shift(delta: number) {
    const node = open ? lightbox.current : strip.current;
    if (!node || images.length < 2) return;
    const next = Math.min(images.length - 1, Math.max(0, indexRef.current + delta));
    node.scrollTo({ left: next * node.clientWidth, behavior: "smooth" });
  }

  function close() {
    setOpen(false);
    const node = strip.current;
    if (node) node.scrollTo({ left: indexRef.current * node.clientWidth });
  }

  useEffect(() => {
    if (!open) return;
    const node = lightbox.current;
    if (node) node.scrollLeft = indexRef.current * node.clientWidth;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") shift(1);
      if (event.key === "ArrowLeft") shift(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function go(next: number) {
    const node = strip.current;
    setIndex(next);
    node?.scrollTo({ left: next * node.clientWidth, behavior: "smooth" });
  }

  function armDrag(event: React.PointerEvent) {
    drag.current = { x: event.clientX, moved: false };
  }

  function noteDrag(event: React.PointerEvent) {
    if (Math.abs(event.clientX - drag.current.x) > 8) drag.current.moved = true;
  }

  function tapped() {
    return !drag.current.moved;
  }

  function noteScroll(event: React.UIEvent<HTMLDivElement>) {
    const node = event.currentTarget;
    if (node.clientWidth === 0) return;
    const next = Math.round(node.scrollLeft / node.clientWidth);
    if (next !== indexRef.current) setIndex(next);
  }

  if (!photo) {
    return <div className="flex h-56 items-end rounded-2xl bg-navy p-6 text-white sm:h-80 sm:rounded-3xl">{title}</div>;
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl bg-[#e8f4fc] sm:rounded-3xl">
        <div
          ref={strip}
          className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={noteScroll}
        >
          {images.map((image) => (
            <div key={image.path} className="relative min-w-full shrink-0 basis-full snap-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/media/${image.path}`} alt="" className="pointer-events-none aspect-[4/3] w-full object-cover" />
              {images.length > 1 ? (
                <Zone label="Предыдущее фото" className="left-0 w-[30%]" onTap={() => shift(-1)} onDown={armDrag} onMove={noteDrag} ready={tapped} />
              ) : null}
              <Zone
                label={`Открыть ${title}`}
                className={images.length > 1 ? "left-[30%] w-[40%]" : "inset-x-0"}
                onTap={() => setOpen(true)}
                onDown={armDrag}
                onMove={noteDrag}
                ready={tapped}
              />
              {images.length > 1 ? (
                <Zone label="Следующее фото" className="right-0 w-[30%]" onTap={() => shift(1)} onDown={armDrag} onMove={noteDrag} ready={tapped} />
              ) : null}
            </div>
          ))}
        </div>
        {images.length > 1 ? (
          <>
            <EdgeHint side="left" hidden={index === 0} />
            <EdgeHint side="right" hidden={index === images.length - 1} />
            <p className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-navy/80 px-2.5 py-1 text-xs font-semibold text-white">
              {index + 1} / {images.length}
            </p>
          </>
        ) : null}
      </div>
      {images.length > 1 ? (
        <div className="mt-2 flex gap-2 overflow-x-auto px-0.5 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {images.map((image, imageIndex) => (
            <button
              key={image.path}
              type="button"
              onClick={() => go(imageIndex)}
              className={`shrink-0 rounded-xl bg-[#e8f4fc] ${imageIndex === index ? "ring-2 ring-navy" : ""}`}
              aria-label={`Фото ${imageIndex + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/media/${image.path}`} alt="" className="h-16 w-16 rounded-xl object-cover sm:h-20 sm:w-20" />
            </button>
          ))}
        </div>
      ) : null}
      {open ? (
        <div className="fixed inset-0 z-[70] bg-black" role="dialog" aria-modal="true" aria-label={title}>
          <div
            ref={lightbox}
            className="flex h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onScroll={noteScroll}
          >
            {images.map((image) => (
              <div key={image.path} className="relative flex h-full min-w-full shrink-0 basis-full snap-center items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/media/${image.path}`} alt="" className="pointer-events-none max-h-full max-w-full object-contain p-4" />
                {images.length > 1 ? (
                  <>
                    <Zone label="Предыдущее фото" className="left-0 w-1/2" onTap={() => shift(-1)} onDown={armDrag} onMove={noteDrag} ready={tapped} />
                    <Zone label="Следующее фото" className="right-0 w-1/2" onTap={() => shift(1)} onDown={armDrag} onMove={noteDrag} ready={tapped} />
                  </>
                ) : null}
              </div>
            ))}
          </div>
          <button
            type="button"
            className="absolute right-3 top-3 z-20 rounded-full bg-white px-3 py-2 text-sm font-semibold text-navy"
            onClick={close}
          >
            Закрыть
          </button>
          {images.length > 1 ? (
            <>
              <EdgeHint side="left" hidden={index === 0} light />
              <EdgeHint side="right" hidden={index === images.length - 1} light />
              <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-1 text-sm font-semibold text-navy">
                {index + 1} / {images.length}
              </p>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Zone({
  label,
  className,
  onTap,
  onDown,
  onMove,
  ready,
}: {
  label: string;
  className: string;
  onTap: () => void;
  onDown: (event: React.PointerEvent) => void;
  onMove: (event: React.PointerEvent) => void;
  ready: () => boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`absolute inset-y-0 z-[1] touch-pan-x ${className}`}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onClick={() => {
        if (ready()) onTap();
      }}
    />
  );
}

function EdgeHint({ side, hidden, light = false }: { side: "left" | "right"; hidden: boolean; light?: boolean }) {
  if (hidden) return null;
  return (
    <span
      className={`pointer-events-none absolute top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full shadow ${side === "left" ? "left-3" : "right-3"} ${light ? "bg-white text-navy" : "bg-white/90 text-navy"}`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        {side === "left" ? <path d="M14 6 8 12l6 6" /> : <path d="M10 6l6 6-6 6" />}
      </svg>
    </span>
  );
}
