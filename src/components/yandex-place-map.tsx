"use client";

import { useEffect, useRef, useState } from "react";
import { eventCoords, loadYmaps, type YMap, type YPlacemark } from "@/lib/yandex-maps";

export function YandexPlaceMap({
  apiKey,
  lat,
  lng,
  zoom,
  interactive,
  focusKey,
  onPick,
}: {
  apiKey: string;
  lat: number | null;
  lng: number | null;
  zoom: number;
  interactive: boolean;
  focusKey: string;
  onPick?: (lat: number, lng: number) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<YMap | null>(null);
  const markRef = useRef<YPlacemark | null>(null);
  const onPickRef = useRef(onPick);
  const viewRef = useRef({ lat, lng, zoom });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  onPickRef.current = onPick;
  viewRef.current = { lat, lng, zoom };

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let cancelled = false;
    loadYmaps(apiKey)
      .then((ymaps) => {
        if (cancelled) return;
        const { lat: startLat, lng: startLng, zoom: startZoom } = viewRef.current;
        const hasPoint = startLat !== null && startLng !== null;
        const map = new ymaps.Map(
          element,
          {
            center: hasPoint ? [startLat, startLng] : [61.5, 96],
            zoom: hasPoint ? startZoom : 3,
            controls: interactive ? ["zoomControl", "geolocationControl"] : ["zoomControl"],
          },
          { suppressMapOpenBlock: true, yandexMapDisablePoiInteractivity: true },
        );
        map.behaviors.disable("scrollZoom");
        mapRef.current = map;
        if (interactive) {
          map.events.add("click", (event) => {
            const coords = eventCoords(event.get("coords"));
            if (coords) onPickRef.current?.(coords[0], coords[1]);
          });
          map.controls.get("geolocationControl")?.events.add("locationchange", (event) => {
            const coords = eventCoords(event.get("position"));
            if (coords) onPickRef.current?.(coords[0], coords[1]);
          });
        }
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      mapRef.current?.destroy();
      mapRef.current = null;
      markRef.current = null;
      setReady(false);
    };
  }, [apiKey, interactive]);

  useEffect(() => {
    const map = mapRef.current;
    const ymaps = window.ymaps;
    if (!ready || !map || !ymaps) return;
    const mark = markRef.current;
    if (lat === null || lng === null) {
      mark?.options.set("visible", false);
      return;
    }
    if (mark) {
      mark.options.set("visible", true);
      mark.geometry.setCoordinates([lat, lng]);
      return;
    }
    const created = new ymaps.Placemark([lat, lng], {}, { preset: "islands#blueIcon", draggable: interactive });
    map.geoObjects.add(created);
    markRef.current = created;
    if (interactive) {
      created.events.add("dragend", () => {
        const coords = created.geometry.getCoordinates();
        onPickRef.current?.(coords[0], coords[1]);
      });
    }
  }, [ready, lat, lng, interactive]);

  useEffect(() => {
    if (!ready || !focusKey) return;
    const { lat: nextLat, lng: nextLng, zoom: nextZoom } = viewRef.current;
    if (nextLat === null || nextLng === null) return;
    mapRef.current?.setCenter([nextLat, nextLng], nextZoom);
  }, [ready, focusKey]);

  return (
    <div className="place-map relative h-72 w-full bg-foam">
      <div ref={host} className="h-full w-full" />
      {failed ? <p className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm">Карта не загрузилась</p> : null}
    </div>
  );
}
