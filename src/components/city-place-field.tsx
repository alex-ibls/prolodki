"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { YandexPlaceMap } from "@/components/yandex-place-map";
import { inputClass } from "@/components/styles";
import { cityFromText, cityLabel, cityMatching, nearestCity, searchCities, type RuCity } from "@/lib/ru-cities";

export function CityPlaceField({
  apiKey,
  city = "",
  lat = null,
  lng = null,
  disabled = false,
}: {
  apiKey: string;
  city?: string;
  lat?: number | null;
  lng?: number | null;
  disabled?: boolean;
}) {
  const known = cityMatching(city, lat, lng);
  const [text, setText] = useState(known ? cityLabel(known) : city);
  const [selected, setSelected] = useState<RuCity | null>(known);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(
    lat !== null && lng !== null ? { lat, lng } : known ? { lat: known.lat, lng: known.lng } : null,
  );
  const [zoom, setZoom] = useState(lat !== null && lng !== null ? 14 : 11);
  const [focusKey, setFocusKey] = useState(pinKey(pin));
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const latRef = useRef<HTMLInputElement>(null);
  const lngRef = useRef<HTMLInputElement>(null);
  const storedCity = city.trim();

  function write(name: string, point: { lat: number; lng: number } | null) {
    if (cityRef.current) cityRef.current.value = name;
    if (latRef.current) latRef.current.value = point ? String(point.lat) : "";
    if (lngRef.current) lngRef.current.value = point ? String(point.lng) : "";
  }
  const suggestions = useMemo(() => (open ? searchCities(text) : []), [open, text]);
  const highlighted = suggestions.length ? Math.min(active, suggestions.length - 1) : 0;

  useEffect(() => {
    function onPointer(event: PointerEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, []);

  function commit(next: RuCity) {
    const point = { lat: next.lat, lng: next.lng };
    write(next.name, point);
    setSelected(next);
    setText(cityLabel(next));
    setPin(point);
    setZoom(11);
    setFocusKey(`${next.name}:${next.region}:${next.lat}:${next.lng}:${Date.now()}`);
    setOpen(false);
  }

  function pickPoint(nextLat: number, nextLng: number) {
    if (disabled) return;
    const nearest = nearestCity(nextLat, nextLng);
    const point = { lat: nextLat, lng: nextLng };
    write(nearest.name, point);
    setSelected(nearest);
    setText(cityLabel(nearest));
    setPin(point);
  }

  return (
    <div ref={box} className="md:col-span-2">
      <label className="relative block text-sm">
        Город
        <input
          value={text}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          placeholder="Начните вводить город"
          className={inputClass}
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          onChange={(event) => {
            const nextText = event.target.value;
            setText(nextText);
            setSelected(null);
            setPin(null);
            setActive(0);
            setOpen(true);
            write(nextText.trim() === storedCity ? storedCity : "", null);
          }}
          onBlur={(event) => {
            const match = cityFromText(event.currentTarget.value);
            if (match && (selected?.name !== match.name || selected.region !== match.region)) commit(match);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActive((index) => Math.min(index + 1, Math.max(suggestions.length - 1, 0)));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter") {
              const exact = open ? suggestions[highlighted] : selected ? null : cityFromText(text);
              if (exact) {
                event.preventDefault();
                commit(exact);
              }
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        {open && suggestions.length > 0 && !disabled ? (
          <ul role="listbox" className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-auto rounded-2xl border border-line bg-white py-1 shadow">
            {suggestions.map((item, index) => (
              <li key={`${item.name}-${item.region}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={index === highlighted}
                  className={`block w-full px-3 py-2 text-left text-sm ${index === highlighted ? "bg-foam" : ""}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => commit(item)}
                >
                  {cityLabel(item)}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </label>
      <input ref={cityRef} type="hidden" name="city" value={selected?.name ?? (text.trim() === storedCity ? storedCity : "")} />
      <input ref={latRef} type="hidden" name="lat" value={pin ? String(pin.lat) : ""} />
      <input ref={lngRef} type="hidden" name="lng" value={pin ? String(pin.lng) : ""} />
      <div className="mt-3 overflow-hidden rounded-2xl border border-line">
        {apiKey ? (
          <YandexPlaceMap
            apiKey={apiKey}
            lat={pin?.lat ?? null}
            lng={pin?.lng ?? null}
            zoom={zoom}
            interactive={!disabled}
            focusKey={focusKey}
            onPick={pickPoint}
          />
        ) : (
          <p className="bg-foam p-4 text-sm">Карта недоступна: не задан ключ Яндекс.Карт.</p>
        )}
      </div>
      <p className="mt-1 text-xs text-muted">
        {pin ? "Клик или перетаскивание метки ставит место и подставляет ближайший город." : "Выберите город — метка встанет в его центре, затем её можно сдвинуть."}
      </p>
    </div>
  );
}

function pinKey(pin: { lat: number; lng: number } | null) {
  return pin ? `${pin.lat},${pin.lng}` : "";
}
