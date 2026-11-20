export const characteristicIcons = [
  { id: "", label: "Круг" },
  { id: "length", label: "Длина" },
  { id: "width", label: "Ширина" },
  { id: "height", label: "Высота" },
  { id: "people", label: "Люди" },
  { id: "power", label: "Мощность" },
  { id: "weight", label: "Вес" },
  { id: "cargo", label: "Груз" },
  { id: "angle", label: "Угол" },
  { id: "layers", label: "Слои" },
  { id: "drop", label: "Капля" },
  { id: "calendar", label: "Календарь" },
  { id: "tag", label: "Метка" },
  { id: "hull", label: "Корпус" },
  { id: "anchor", label: "Якорь" },
  { id: "gauge", label: "Спидометр" },
] as const;

const iconIds = new Set<string>(characteristicIcons.map((item) => item.id));

const codeIcons: Record<string, string> = {
  length_m: "length",
  width_m: "width",
  seats: "people",
  passengers: "people",
  max_hp: "power",
  weight_kg: "weight",
  capacity_kg: "cargo",
  side_height_mm: "height",
  transom_height_mm: "height",
  deadrise_mid: "angle",
  deadrise_transom: "angle",
  bottom_mm: "layers",
  side_thickness_mm: "layers",
  transom_thickness_mm: "layers",
  material: "layers",
  bottom_material: "layers",
  brand: "tag",
  model: "hull",
  year: "calendar",
};

export function readCharacteristicIcon(raw: string) {
  const icon = raw.trim();
  return iconIds.has(icon) ? icon : null;
}

export function SpecIcon({
  icon = "",
  code = "",
  className = "h-4 w-4",
}: {
  icon?: string;
  code?: string;
  className?: string;
}) {
  const key = iconIds.has(icon) && icon ? icon : codeIcons[code] || "";
  const common = {
    viewBox: "0 0 24 24",
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (key === "length") {
    return (
      <svg {...common}>
        <path d="M4 12h16M7 9l-3 3 3 3M17 9l3 3-3 3" />
      </svg>
    );
  }
  if (key === "width") {
    return (
      <svg {...common}>
        <path d="M12 4v16M9 7l3-3 3 3M9 17l3 3 3-3" />
      </svg>
    );
  }
  if (key === "height") {
    return (
      <svg {...common}>
        <path d="M8 4v16M8 4h6M8 12h4M8 20h6" />
      </svg>
    );
  }
  if (key === "people") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 19c1.2-3 3.4-4.5 7-4.5S17.8 16 19 19" />
      </svg>
    );
  }
  if (key === "power") {
    return (
      <svg {...common}>
        <path d="M13 3 6 13h6l-1 8 7-10h-6l1-8z" />
      </svg>
    );
  }
  if (key === "weight") {
    return (
      <svg {...common}>
        <path d="M8 7h8l1 13H7L8 7z" />
        <path d="M9 7a3 3 0 0 1 6 0" />
      </svg>
    );
  }
  if (key === "cargo") {
    return (
      <svg {...common}>
        <path d="M3 8l9-4 9 4-9 4-9-4z" />
        <path d="M3 8v8l9 4 9-4V8" />
        <path d="M12 12v8" />
      </svg>
    );
  }
  if (key === "angle") {
    return (
      <svg {...common}>
        <path d="M5 19h14" />
        <path d="M5 19 16 7" />
        <path d="M8 19a5 5 0 0 1 4-4" />
      </svg>
    );
  }
  if (key === "layers") {
    return (
      <svg {...common}>
        <path d="M4 8h16M4 12h16M4 16h16" />
      </svg>
    );
  }
  if (key === "drop") {
    return (
      <svg {...common}>
        <path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" />
      </svg>
    );
  }
  if (key === "calendar") {
    return (
      <svg {...common}>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3v4M16 3v4M4 10h16" />
      </svg>
    );
  }
  if (key === "tag") {
    return (
      <svg {...common}>
        <path d="M4 12V6h6l8 8-6 6-8-8z" />
        <circle cx="8.5" cy="8.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (key === "hull") {
    return (
      <svg {...common}>
        <path d="M4 16 12 4l8 12H4z" />
      </svg>
    );
  }
  if (key === "anchor") {
    return (
      <svg {...common}>
        <circle cx="12" cy="6" r="2" />
        <path d="M12 8v11" />
        <path d="M7 13h10" />
        <path d="M6 19c1.5-3 3.2-4 6-4s4.5 1 6 4" />
      </svg>
    );
  }
  if (key === "gauge") {
    return (
      <svg {...common}>
        <path d="M5 16a7 7 0 1 1 14 0" />
        <path d="M12 16l4-4" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="7" />
    </svg>
  );
}
