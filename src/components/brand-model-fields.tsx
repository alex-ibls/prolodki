"use client";

import { useMemo, useState } from "react";
import { NameSuggest } from "@/components/name-suggest";

export function BrandModelFields({
  brands,
  models,
  brand = "",
  model = "",
  disabled = false,
}: {
  brands: string[];
  models: { brand: string; model: string }[];
  brand?: string;
  model?: string;
  disabled?: boolean;
}) {
  const [brandText, setBrandText] = useState(brand);
  const [modelText, setModelText] = useState(model);
  const brandOptions = useMemo(
    () => [...new Set(brands)].sort((a, b) => a.localeCompare(b, "ru")),
    [brands],
  );
  const modelOptions = useMemo(() => {
    const key = brandText.trim().toLocaleLowerCase("ru");
    const exact = key !== "" && brandOptions.some((name) => name.toLocaleLowerCase("ru") === key);
    const rows = !key
      ? models
      : models.filter((item) => {
          const name = item.brand.trim().toLocaleLowerCase("ru");
          return exact ? name === key : name.includes(key);
        });
    return [...new Set(rows.map((item) => item.model.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ru"));
  }, [brandOptions, brandText, models]);

  return (
    <>
      <NameSuggest
        label="Бренд"
        name="brand"
        value={brandText}
        options={brandOptions}
        minLength={2}
        disabled={disabled}
        placeholder="Начните вводить бренд"
        onValue={setBrandText}
      />
      <NameSuggest
        label="Модель"
        name="model"
        value={modelText}
        options={modelOptions}
        disabled={disabled}
        placeholder="Начните вводить модель"
        onValue={setModelText}
      />
    </>
  );
}
