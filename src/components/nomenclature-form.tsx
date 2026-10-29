import { saveNomenclatureAction } from "@/actions/admin";
import { CategoryFields } from "@/components/category-fields";
import { LimitedText } from "@/components/limited-text";
import { PhotoField } from "@/components/photo-field";
import { buttonClass, inputClass } from "@/components/styles";
import { allCategories } from "@/lib/catalog";
import { defsForCategory } from "@/lib/listings";
import { allBrands, categoryPath, isLeaf } from "@/lib/taxonomy";

type Item = {
  id: string;
  sku: string;
  categoryId: number;
  title: string;
  brandId: number | null;
  model: string;
  year: number | null;
  registered: boolean | null;
  onOrder: boolean;
  description: string;
  priceKopeks: number;
  compareAtKopeks: number | null;
  quantityOnHand: number;
  quantityReserved: number;
  isPublished: boolean;
  attributes?: { valueNumber: number | null; valueText?: string | null; definition?: { code: string } }[];
  images?: { id: string; path: string }[];
};

export async function NomenclatureForm({ item, error }: { item?: Item; error?: string }) {
  const categories = await allCategories();
  const brands = await allBrands();
  const leaves = categories
    .filter((category) => isLeaf(categories, category.id))
    .sort((a, b) => categoryPath(categories, a.id).localeCompare(categoryPath(categories, b.id), "ru"));
  const groups: Record<string, { code: string; name: string; unit: string }[]> = {};
  for (const leaf of leaves) {
    groups[String(leaf.id)] = (await defsForCategory(leaf.id)).map((def) => ({
      code: def.code,
      name: def.name,
      unit: def.unit,
    }));
  }
  const values: Record<string, string> = {};
  for (const attr of item?.attributes ?? []) {
    if (!attr.definition) continue;
    if (attr.definition.code === "material" && attr.valueText) values[attr.definition.code] = attr.valueText;
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
        <label className="text-sm">
          Бренд
          <select name="brandId" defaultValue={item?.brandId ?? ""} className={inputClass}>
            <option value="">Не указан</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Модель
          <input name="model" defaultValue={item?.model} className={inputClass} />
        </label>
        <label className="text-sm">
          Год
          <input name="year" defaultValue={item?.year ?? ""} className={inputClass} />
        </label>
        <label className="text-sm">
          Регистрация
          <select name="registered" required defaultValue={item?.registered == null ? "" : item.registered ? "yes" : "no"} className={inputClass}>
            <option value="">Выберите</option>
            <option value="yes">Регистрат</option>
            <option value="no">Нерегистрат</option>
          </select>
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
      {item?.images && item.images.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {item.images.map((image) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={image.id} src={`/media/${image.path}`} alt="" className="h-20 w-20 rounded-xl object-cover" />
          ))}
        </div>
      ) : null}
      <PhotoField existing={item?.images?.length ?? 0} />
      <label className="flex items-center gap-2 text-sm">
        <input name="publish" type="checkbox" defaultChecked={item?.isPublished ?? true} />
        Опубликовать на витрине
      </label>
      <button className={buttonClass}>Сохранить</button>
    </form>
  );
}
