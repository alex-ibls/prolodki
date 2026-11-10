import rows from "@/data/ru-cities.json";
import { DomainError } from "@/lib/errors";

export type RuCity = {
  name: string;
  region: string;
  lat: number;
  lng: number;
  population: number;
};

const cities = rows as RuCity[];

function fold(value: string) {
  return value.trim().toLowerCase().replaceAll("ё", "е").replace(/\s+/g, " ");
}

export function cityLabel(city: RuCity) {
  if (fold(city.name) === fold(city.region)) return city.name;
  return `${city.name}, ${city.region}`;
}

function distanceKm(lat: number, lng: number, city: RuCity) {
  const rad = Math.PI / 180;
  const dLat = (city.lat - lat) * rad;
  const dLng = (city.lng - lng) * rad;
  const lat1 = lat * rad;
  const lat2 = city.lat * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function closest(list: RuCity[], lat: number, lng: number) {
  return list.reduce((best, city) => (distanceKm(lat, lng, city) < distanceKm(lat, lng, best) ? city : best));
}

function rankCities(query: string, limit: number) {
  const needle = fold(query);
  if (!needle) return [];
  return cities
    .flatMap((city) => {
      const name = fold(city.name);
      const words = name.split(/[\s-]+/);
      const score = name === needle ? 400 : name.startsWith(needle) ? 300 : words.some((word) => word.startsWith(needle)) ? 200 : 0;
      return score ? [{ city, score }] : [];
    })
    .sort((a, b) => b.score - a.score || b.city.population - a.city.population || a.city.name.localeCompare(b.city.name, "ru"))
    .slice(0, limit)
    .map((item) => item.city);
}

export function searchCities(query: string, limit = 8) {
  const direct = rankCities(query, limit);
  if (direct.length > 0) return direct;
  const head = query.split(",")[0]?.trim() ?? "";
  if (head && head !== query.trim()) return rankCities(head, limit);
  return [];
}

export function nearestCity(lat: number, lng: number) {
  return closest(cities, lat, lng);
}

export function cityFromText(text: string) {
  const needle = fold(text);
  if (!needle) return null;
  const byLabel = cities.filter((city) => fold(cityLabel(city)) === needle);
  if (byLabel.length === 1) return byLabel[0];
  const byName = cities.filter((city) => fold(city.name) === needle);
  if (byName.length === 1) return byName[0];
  return null;
}

export function cityMatching(name: string, lat: number | null, lng: number | null) {
  const matches = cities.filter((city) => fold(city.name) === fold(name));
  if (!matches.length) return null;
  if (lat === null || lng === null) return matches[0];
  return closest(matches, lat, lng);
}

export function readCityPlace(city: string, latRaw: string, lngRaw: string, required: boolean) {
  const name = city.trim();
  const lat = latRaw.trim() === "" ? null : Number(latRaw);
  const lng = lngRaw.trim() === "" ? null : Number(lngRaw);
  if ((lat !== null && !Number.isFinite(lat)) || (lng !== null && !Number.isFinite(lng))) {
    throw new DomainError("Точка на карте указана неверно");
  }
  if (!name) {
    if (required) throw new DomainError("Выберите город из справочника");
    return { city: "", lat: null, lng: null };
  }
  const matches = cities.filter((item) => fold(item.name) === fold(name));
  if (!matches.length) {
    if (required || lat !== null || lng !== null) throw new DomainError("Выберите город из справочника");
    return { city: name, lat: null, lng: null };
  }
  if (lat === null || lng === null) throw new DomainError("Укажите место на карте");
  if (lat < 41 || lat > 82 || lng < 19 || lng > 192) throw new DomainError("Точка на карте за пределами России");
  const chosen = closest(matches, lat, lng);
  const nearest = nearestCity(lat, lng);
  if (distanceKm(lat, lng, chosen) > distanceKm(lat, lng, nearest) + 1) {
    throw new DomainError("Точка на карте не совпадает с выбранным городом");
  }
  return { city: chosen.name, lat, lng };
}
