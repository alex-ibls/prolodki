"use client";

import { useState } from "react";
import { inputClass } from "@/components/styles";

type Def = { code: string; name: string; unit: string };
type Leaf = { id: number; name: string; group: string };

export function CategoryFields({
  categories,
  groups,
  categoryId,
  values,
}: {
  categories: Leaf[];
  groups: Record<string, Def[]>;
  categoryId?: number;
  values: Record<string, string>;
}) {
  const [current, setCurrent] = useState(String(categoryId || categories[0]?.id || ""));
  const defs = groups[current] ?? [];
  return (
    <div className="grid gap-3">
      <label className="text-sm">
        Категория
        <select
          name="categoryId"
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
          className={inputClass}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.group ? `${category.group} / ${category.name}` : category.name}
            </option>
          ))}
        </select>
      </label>
      <div key={current} className="grid gap-3 md:grid-cols-2">
        {defs.map((def) => (
          <label key={def.code} className="text-sm">
            {def.name}
            {def.unit ? `, ${def.unit}` : ""}
            <input
              name={`attr_${def.code}`}
              defaultValue={values[def.code] ?? ""}
              inputMode={def.code === "material" ? "text" : "decimal"}
              className={inputClass}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
