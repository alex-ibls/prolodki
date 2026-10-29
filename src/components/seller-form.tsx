import { saveListingAction } from "@/actions/store";
import { CategoryFields } from "@/components/category-fields";
import { LimitedText } from "@/components/limited-text";
import { PhotoField } from "@/components/photo-field";
import { buttonClass, inputClass, secondaryClass } from "@/components/styles";
import { allCategories } from "@/lib/catalog";
import { defsForCategory } from "@/lib/listings";
import { allBrands, categoryPath, isLeaf } from "@/lib/taxonomy";

type ListingShape = {
  id: string;
  categoryId: number;
  title: string;
  brandId: number | null;
  model: string;
  year: number | null;
  description: string;
  priceKopeks: number;
  compareAtKopeks: number | null;
  city: string;
  registered: boolean | null;
  onOrder: boolean;
  quantity: number;
  status: string;
  images?: { id: string }[];
  attributes?: { attributeDefId: number; valueNumber: number | null; valueText?: string | null; definition?: { code: string } }[];
};

export async function SellerForm({
  listing,
  error,
}: {
  listing?: ListingShape;
  error?: string;
}) {
  const categories = await allCategories();
  const brands = await allBrands();
  const leaves = categories
    .filter((category) => isLeaf(categories, category.id))
    .sort((a, b) => categoryPath(categories, a.id).localeCompare(categoryPath(categories, b.id), "ru"));
  const groups: Record<string, { code: string; name: string; unit: string }[]> = {};
  for (const leaf of leaves) {
    const defs = await defsForCategory(leaf.id);
    groups[String(leaf.id)] = defs.map((def) => ({ code: def.code, name: def.name, unit: def.unit }));
  }
  const values: Record<string, string> = {};
  for (const attr of listing?.attributes ?? []) {
    if (!attr.definition) continue;
    if (attr.definition.code === "material" && attr.valueText) values[attr.definition.code] = attr.valueText;
    else if (attr.valueNumber !== null) values[attr.definition.code] = String(attr.valueNumber);
  }
  const locked = listing?.status === "reserved" || listing?.status === "archived";
  return (
    <form action={saveListingAction} className="grid gap-3 rounded-3xl border border-line bg-card p-5">
      {listing ? <input type="hidden" name="listingId" value={listing.id} /> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <CategoryFields
        categories={leaves.map((category) => ({
          id: category.id,
          name: categoryPath(categories, category.id),
          group: "",
        }))}
        groups={groups}
        categoryId={listing?.categoryId}
        values={values}
      />
      <label className="text-sm">
        Название
        <input name="title" required defaultValue={listing?.title} className={inputClass} disabled={locked} />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          Бренд
          <select name="brandId" defaultValue={listing?.brandId ?? ""} className={inputClass}>
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
          <input name="model" defaultValue={listing?.model} className={inputClass} />
        </label>
        <label className="text-sm">
          Год
          <input name="year" defaultValue={listing?.year ?? ""} className={inputClass} />
        </label>
        <label className="text-sm">
          Город
          <input name="city" defaultValue={listing?.city} className={inputClass} />
        </label>
        <label className="text-sm">
          Регистрация
          <select name="registered" required defaultValue={listing?.registered == null ? "" : listing.registered ? "yes" : "no"} className={inputClass} disabled={locked}>
            <option value="">Выберите</option>
            <option value="yes">Регистрат</option>
            <option value="no">Нерегистрат</option>
          </select>
        </label>
        <label className="text-sm">
          Наличие
          <select name="onOrder" required defaultValue={listing?.onOrder ? "order" : "stock"} className={inputClass} disabled={locked}>
            <option value="stock">В наличии</option>
            <option value="order">На заказ</option>
          </select>
        </label>
        <label className="text-sm">
          Цена, ₽
          <input name="price" required defaultValue={listing ? listing.priceKopeks / 100 : ""} className={inputClass} />
        </label>
        <p className="text-sm text-muted">Частное объявление — одна единица, состояние БУ.</p>
      </div>
      <div className="text-sm">
        Описание
        <LimitedText name="description" defaultValue={listing?.description} />
      </div>
      <PhotoField existing={listing?.images?.length ?? 0} disabled={locked} />
      {locked ? null : (
        <div className="flex gap-2">
          <button name="intent" value="draft" className={secondaryClass}>
            Черновик
          </button>
          <button name="intent" value="submit" className={buttonClass}>
            Отправить на модерацию
          </button>
        </div>
      )}
    </form>
  );
}
