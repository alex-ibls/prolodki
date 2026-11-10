type YEvent = {
  get: (key: string) => unknown;
};

type YGeometry = {
  setCoordinates: (coords: number[]) => void;
  getCoordinates: () => number[];
};

type YTarget = {
  events: {
    add: (name: string, handler: (event: YEvent) => void) => void;
  };
};

export type YPlacemark = YTarget & {
  geometry: YGeometry;
  options: { set: (key: string, value: unknown) => void };
};

export type YMap = {
  destroy: () => void;
  setCenter: (center: number[], zoom?: number) => void;
  behaviors: { disable: (name: string) => void };
  geoObjects: { add: (object: YTarget) => void };
  events: YTarget["events"];
  controls: {
    get: (name: string) => { events: YTarget["events"] } | null;
  };
};

type YMaps = {
  ready: (callback: () => void) => void;
  Map: new (element: HTMLElement, state: object, options?: object) => YMap;
  Placemark: new (coords: number[], properties?: object, options?: object) => YPlacemark;
};

declare global {
  interface Window {
    ymaps?: YMaps;
  }
}

let loading: Promise<YMaps> | null = null;
let loadingKey = "";

export function loadYmaps(apiKey: string) {
  if (loading && loadingKey === apiKey) return loading;
  loadingKey = apiKey;
  loading = new Promise((resolve, reject) => {
    const finish = () => {
      const api = window.ymaps;
      if (!api) {
        reject(new Error("Яндекс.Карты не загрузились"));
        return;
      }
      api.ready(() => resolve(api));
    };
    if (window.ymaps) {
      finish();
      return;
    }
    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`;
    script.async = true;
    script.onload = finish;
    script.onerror = () => reject(new Error("Яндекс.Карты не загрузились"));
    document.head.appendChild(script);
  });
  return loading;
}

export function eventCoords(value: unknown): [number, number] | null {
  if (Array.isArray(value) && value.length >= 2) {
    const lat = Number(value[0]);
    const lng = Number(value[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
  }
  if (value && typeof value === "object" && "geometry" in value) {
    const coords = (value as { geometry?: { getCoordinates?: () => number[] } }).geometry?.getCoordinates?.();
    return eventCoords(coords);
  }
  return null;
}
