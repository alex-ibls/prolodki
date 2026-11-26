import { BrandModelFields } from "@/components/brand-model-fields";
import { KitEditor } from "@/components/kit-editor";
import { CategoryFields } from "@/components/category-fields";
import { LimitedText } from "@/components/limited-text";
import { NomenclatureFormShell } from "@/components/nomenclature-form-shell";
import { PhotoField } from "@/components/photo-field";
import { inputClass } from "@/components/styles";
import { CountInput, RubleInput, TextInput, YearInput } from "@/components/validated-inputs";
import { allCategories } from "@/lib/catalog";
import { effectiveCharacteristicsFor } from "@/lib/characteristics";
import { kitForNomenclature, listKitLibrary } from "@/lib/kit";
import { brandModelChoices, categoryPath, isLeaf } from "@/lib/taxonomy";

type Item = {
  id: string;
  sku: string;
  categoryId: number;
  title: string;
  brand: string;
  model: string;
  year: number | null;
  onOrder: boolean;
  description: string;
  priceKopeks: number;
  compareAtKopeks: number | null;
  logisticsKopeks?: number | null;
  leadTime?: string;
  quantityOnHand: number;
  quantityReserved: number;
  isPublished: boolean;
  attributes?: { valueNumber: number | null; valueText?: string | null; definition?: { code: string; dataType?: string } }[];
  images?: { id: string; path: string }[];
};

export async function NomenclatureForm({ item, error }: { item?: Item; error?: string }) {
  const categories = await allCategories();
  const choices = await brandModelChoices(true);
  const library = await listKitLibrary();
  const kit = item ? await kitForNomenclature(item.id) : [];
  const leaves = categories
    .filter((category) => isLeaf(categories, category.id))
    .sort((a, b) => categoryPath(categories, a.id).localeCompare(categoryPath(categories, b.id), "ru"));
  const groups: Record<string, { code: string; name: string; unit: string; dataType: string }[]> = {};
  const defsByCategory = await effectiveCharacteristicsFor(leaves.map((leaf) => leaf.id));
  for (const leaf of leaves) {
    groups[String(leaf.id)] = (defsByCategory.get(leaf.id) ?? []).map((def) => ({
      code: def.code,
      name: def.name,
      unit: def.unit,
      dataType: def.dataType,
    }));
  }
  const values: Record<string, string> = {};
  for (const attr of item?.attributes ?? []) {
    if (!attr.definition) continue;
    if (attr.definition.dataType === "text" && attr.valueText) values[attr.definition.code] = attr.valueText;
    else if (attr.valueNumber !== null) values[attr.definition.code] = String(attr.valueNumber);
  }
  return (
    <NomenclatureFormShell itemId={item?.id} serverError={error}>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          Артикул
          <TextInput name="sku" required defaultValue={item?.sku ?? ""} />
        </label>
        <label className="text-sm">
          Название
          <TextInput name="title" required min={3} defaultValue={item?.title ?? ""} />
        </label>
        <BrandModelFields brands={choices.brands} models={choices.models} brand={item?.brand} model={item?.model} />
        <label className="text-sm">
          Год
          <YearInput name="year" defaultValue={item?.year == null ? "" : String(item.year)} />
        </label>
        <label className="text-sm">
          Наличие
          <select name="onOrder" required defaultValue={item?.onOrder ? "order" : "stock"} className={inputClass}>
            <option value="stock">В наличии</option>
            <option value="order">На заказ</option>
          </select>
        </label>
        <label className="text-sm">
          Цена, ₽
          <RubleInput name="price" required defaultValue={item ? String(item.priceKopeks / 100) : ""} />
        </label>
        <label className="text-sm">
          Старая цена, ₽
          <RubleInput name="compareAt" defaultValue={item?.compareAtKopeks ? String(item.compareAtKopeks / 100) : ""} />
        </label>
        <label className="text-sm">
          Логистика до дилерского центра в Москве, ₽
          <RubleInput
            name="logistics"
            allowZero
            placeholder="по запросу"
            defaultValue={item?.logisticsKopeks == null ? "" : String(item.logisticsKopeks / 100)}
          />
        </label>
        <label className="text-sm md:col-span-2">
          Срок поставки (ориентировочно)
          <TextInput name="leadTime" limit={80} placeholder="по запросу" defaultValue={item?.leadTime ?? ""} />
        </label>
        <label className="text-sm">
          Остаток на складе
          <CountInput name="quantity" defaultValue={String(item?.quantityOnHand ?? 0)} />
        </label>
        {item ? <p className="self-end text-sm text-muted">Резерв: {item.quantityReserved}</p> : null}
      </div>
      <CategoryFields
        categories={leaves.map((category) => ({
          id: category.id,
          name: categoryPath(categories, category.id),
          group: "",
        }))}
        groups={groups}
        categoryId={item?.categoryId}
        values={values}
      />
      <div className="text-sm">
        Описание
        <LimitedText name="description" defaultValue={item?.description} />
      </div>
      <PhotoField images={item?.images} orderable nomenclatureId={item?.id} />
      <KitEditor library={library} initial={kit} />
      <label className="flex items-center gap-2 text-sm">
        <input name="publish" type="checkbox" defaultChecked={item?.isPublished ?? true} />
        Опубликовать на витрине
      </label>
    </NomenclatureFormShell>
  );
}
