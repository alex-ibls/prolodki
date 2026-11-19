import { saveNomenclatureAction } from "@/actions/admin";
import { BrandModelFields } from "@/components/brand-model-fields";
import { KitEditor } from "@/components/kit-editor";
import { CategoryFields } from "@/components/category-fields";
import { LimitedText } from "@/components/limited-text";
import { PhotoField } from "@/components/photo-field";
import { buttonClass, inputClass } from "@/components/styles";
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
    <form action={saveNomenclatureAction} className="grid gap-3 rounded-3xl border border-line bg-card p-5">
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          Артикул
          <input name="sku" required defaultValue={item?.sku} className={inputClass} />
        </label>
        <label className="text-sm">
          Название
          <input name="title" required defaultValue={item?.title} className={inputClass} />
        </label>
        <BrandModelFields brands={choices.brands} models={choices.models} brand={item?.brand} model={item?.model} />
        <label className="text-sm">
          Год
          <input name="year" defaultValue={item?.year ?? ""} className={inputClass} />
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
          <input name="price" required defaultValue={item ? item.priceKopeks / 100 : ""} className={inputClass} />
        </label>
        <label className="text-sm">
          Старая цена, ₽
          <input name="compareAt" defaultValue={item?.compareAtKopeks ? item.compareAtKopeks / 100 : ""} className={inputClass} />
        </label>
        <label className="text-sm">
          Логистика до дилерского центра в Москве, ₽
          <input
            name="logistics"
            inputMode="decimal"
            placeholder="по запросу"
            defaultValue={item?.logisticsKopeks ? item.logisticsKopeks / 100 : ""}
            className={inputClass}
          />
        </label>
        <label className="text-sm md:col-span-2">
          Срок поставки (ориентировочно)
          <input
            name="leadTime"
            maxLength={80}
            placeholder="по запросу"
            defaultValue={item?.leadTime ?? ""}
            className={inputClass}
          />
        </label>
        <label className="text-sm">
          Остаток на складе
          <input name="quantity" required defaultValue={item?.quantityOnHand ?? 0} className={inputClass} />
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
      <PhotoField images={item?.images} />
      <KitEditor library={library} initial={kit} />
      <label className="flex items-center gap-2 text-sm">
        <input name="publish" type="checkbox" defaultChecked={item?.isPublished ?? true} />
        Опубликовать на витрине
      </label>
      <button className={buttonClass}>Сохранить</button>
    </form>
  );
}
