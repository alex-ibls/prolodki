"use client";

import { useEffect, useRef, useState } from "react";
import { PhotoFrame } from "@/components/photo-frame";

export function ProductGallery({
  title,
  images,
  attached = false,
}: {
  title: string;
  images: { path: string }[];
  attached?: boolean;
}) {
  const strip = useRef<HTMLDivElement>(null);
  const lightbox = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const drag = useRef({ x: 0, moved: false });
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"one" | "tiles">("tiles");
  const [panning, setPanning] = useState(false);
  const pan = useRef<{ id: number; x: number; left: number; moved: boolean } | null>(null);
  const modeRef = useRef(mode);
  const photo = images[index] ?? images[0];

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

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
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      if (modeRef.current !== "one") return;
      if (event.key === "ArrowRight") shift(1);
      if (event.key === "ArrowLeft") shift(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open || mode !== "one") return;
    const frame = requestAnimationFrame(() => {
      const node = lightbox.current;
      if (node) node.scrollLeft = indexRef.current * node.clientWidth;
    });
    return () => cancelAnimationFrame(frame);
  }, [open, mode]);

  function go(next: number) {
    const node = strip.current;
    setIndex(next);
    node?.scrollTo({ left: next * node.clientWidth, behavior: "smooth" });
  }

  function openViewer() {
    setMode("tiles");
    setOpen(true);
  }

  function showTile(next: number) {
    setIndex(next);
    setMode("one");
    const node = strip.current;
    if (node) node.scrollTo({ left: next * node.clientWidth });
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

  function desktopPointer() {
    return window.matchMedia("(min-width: 768px)").matches;
  }

  function startPan(event: React.PointerEvent<HTMLDivElement>) {
    if (!desktopPointer() || event.button !== 0 || images.length < 2) return;
    const node = event.currentTarget;
    pan.current = { id: event.pointerId, x: event.clientX, left: node.scrollLeft, moved: false };
    setPanning(true);
    try {
      node.setPointerCapture(event.pointerId);
    } catch {
      pan.current = null;
      setPanning(false);
    }
  }

  function movePan(event: React.PointerEvent<HTMLDivElement>) {
    const current = pan.current;
    if (!current || current.id !== event.pointerId) return;
    const dx = event.clientX - current.x;
    if (Math.abs(dx) > 4) {
      current.moved = true;
      drag.current.moved = true;
    }
    event.currentTarget.scrollLeft = current.left - dx;
  }

  function endPan(event: React.PointerEvent<HTMLDivElement>) {
    const current = pan.current;
    if (!current || current.id !== event.pointerId) return;
    pan.current = null;
    setPanning(false);
    const node = event.currentTarget;
    if (!current.moved) {
      if (node === strip.current) openViewer();
      return;
    }
    const width = node.clientWidth || 1;
    const next = Math.min(images.length - 1, Math.max(0, Math.round(node.scrollLeft / width)));
    node.scrollTo({ left: next * node.clientWidth, behavior: "smooth" });
    setIndex(next);
  }

  function noteScroll(event: React.UIEvent<HTMLDivElement>) {
    const node = event.currentTarget;
    if (node.clientWidth === 0) return;
    const next = Math.round(node.scrollLeft / node.clientWidth);
    if (next !== indexRef.current) setIndex(next);
  }

  if (!photo) {
    return (
      <div>
        <div className="relative -mx-3 sm:mx-0">
          <div className={`relative overflow-hidden bg-foam ${attached ? "rounded-b-[6px]" : "rounded-[6px]"}`}>
            <PhotoFrame className="aspect-[4/3] w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="relative -mx-3 sm:mx-0">
      <div className={`relative overflow-hidden bg-foam ${attached ? "rounded-b-[6px]" : "rounded-[6px]"}`}>
        <div
          ref={strip}
          className={`flex select-none overflow-x-auto [scrollbar-width:none] md:cursor-grab [&::-webkit-scrollbar]:hidden ${panning ? "snap-none md:cursor-grabbing" : "snap-x snap-mandatory"}`}
          onScroll={noteScroll}
          onPointerDown={startPan}
          onPointerMove={movePan}
          onPointerUp={endPan}
          onPointerCancel={endPan}
        >
          {images.map((image) => (
            <div key={image.path} className="relative min-w-full shrink-0 basis-full snap-center">
              <PhotoFrame path={image.path} className="pointer-events-none aspect-[4/3] w-full object-cover" />
              <Zone
                label={`Открыть ${title}`}
                className={`inset-x-0 md:cursor-grab ${panning ? "md:cursor-grabbing" : ""}`}
                onTap={openViewer}
                onDown={armDrag}
                onMove={noteDrag}
                ready={tapped}
              />
            </div>
          ))}
        </div>
        {images.length > 1 ? (
          <>
            <PhotoArrow side="left" hidden={index === 0} onClick={() => shift(-1)} />
            <PhotoArrow side="right" hidden={index === images.length - 1} onClick={() => shift(1)} />
            <p className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-moss px-2.5 py-1 text-xs font-semibold text-white">
              {index + 1} / {images.length}
            </p>
          </>
        ) : null}
      </div>
      </div>
      {images.length > 1 ? (
        <div className="mt-2 flex gap-2 overflow-x-auto px-0.5 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {images.map((image, imageIndex) => (
            <button
              key={image.path}
              type="button"
              onClick={() => go(imageIndex)}
              className={`shrink-0 overflow-hidden rounded-[6px] bg-foam ${imageIndex === index ? "ring-2 ring-navy" : ""}`}
              aria-label={`Фото ${imageIndex + 1}`}
            >
              <PhotoFrame path={image.path} className="h-16 w-16 rounded-[6px] object-cover sm:h-20 sm:w-20" />
            </button>
          ))}
        </div>
      ) : null}
      {open ? (
        <div className="fixed inset-0 z-[70] flex flex-col bg-paper text-ink" role="dialog" aria-modal="true" aria-label={title}>
          <div className="flex items-center gap-3 border-b border-line bg-white px-3 py-2">
            {images.length > 1 ? (
              <div className="flex gap-2">
                <button type="button" aria-label="Одно фото" aria-pressed={mode === "one"} className={viewerModeClass(mode === "one")} onClick={() => setMode("one")}>
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <rect x="4" y="5" width="16" height="14" rx="1.5" />
                  </svg>
                </button>
                <button type="button" aria-label="Все фото" aria-pressed={mode === "tiles"} className={viewerModeClass(mode === "tiles")} onClick={() => setMode("tiles")}>
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <rect x="4" y="4" width="7" height="7" />
                    <rect x="13" y="4" width="7" height="7" />
                    <rect x="4" y="13" width="7" height="7" />
                    <rect x="13" y="13" width="7" height="7" />
                  </svg>
                </button>
              </div>
            ) : (
              <span className="text-sm font-semibold text-deep">Фото</span>
            )}
            {mode === "one" && images.length > 1 ? (
              <p className="ml-auto text-sm font-semibold text-deep">
                {index + 1} / {images.length}
              </p>
            ) : (
              <span className="ml-auto" />
            )}
            <button type="button" aria-label="Закрыть" className="flex h-10 w-10 items-center justify-center text-deep" onClick={close}>
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M6 6 18 18M18 6 6 18" />
              </svg>
            </button>
          </div>
          {mode === "tiles" ? (
            <div className="min-h-0 flex-1 overflow-auto p-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {images.map((image, imageIndex) => (
                  <button
                    key={image.path}
                    type="button"
                    onClick={() => showTile(imageIndex)}
                    className={`overflow-hidden rounded-[6px] bg-white ${imageIndex === index ? "ring-2 ring-navy" : ""}`}
                    aria-label={`Открыть фото ${imageIndex + 1}`}
                    aria-current={imageIndex === index ? "true" : undefined}
                  >
                    <PhotoFrame path={image.path} className="aspect-[4/3] w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="relative min-h-0 flex-1">
              <div
                ref={lightbox}
                className={`flex h-full min-h-0 select-none overflow-x-auto [scrollbar-width:none] md:cursor-grab [&::-webkit-scrollbar]:hidden ${panning ? "snap-none md:cursor-grabbing" : "snap-x snap-mandatory"}`}
                onScroll={noteScroll}
                onPointerDown={startPan}
                onPointerMove={movePan}
                onPointerUp={endPan}
                onPointerCancel={endPan}
              >
                {images.map((image) => (
                  <div
                    key={image.path}
                    className="flex h-full min-w-full shrink-0 basis-full snap-center items-center justify-center overflow-y-auto p-4"
                  >
                    <PhotoFrame path={image.path} className="pointer-events-none max-h-full max-w-full rounded-[6px] object-contain" />
                  </div>
                ))}
              </div>
              {images.length > 1 ? (
                <>
                  <PhotoArrow side="left" hidden={index === 0} desktopOnly onClick={() => shift(-1)} />
                  <PhotoArrow side="right" hidden={index === images.length - 1} desktopOnly onClick={() => shift(1)} />
                </>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function viewerModeClass(active: boolean) {
  return `flex h-10 w-10 items-center justify-center ${active ? "text-deep" : "text-deep/45"}`;
}

function PhotoArrow({
  side,
  hidden,
  desktopOnly = false,
  onClick,
}: {
  side: "left" | "right";
  hidden: boolean;
  desktopOnly?: boolean;
  onClick: () => void;
}) {
  if (hidden) return null;
  return (
    <button
      type="button"
      aria-label={side === "left" ? "Предыдущее фото" : "Следующее фото"}
      className={`absolute top-1/2 z-10 h-10 w-10 -translate-y-1/2 items-center justify-center rounded-[6px] bg-white/90 text-navy shadow ${desktopOnly ? "hidden md:flex" : "flex"} ${side === "left" ? "left-3" : "right-3"}`}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        {side === "left" ? <path d="M14 6 8 12l6 6" /> : <path d="M10 6l6 6-6 6" />}
      </svg>
    </button>
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
