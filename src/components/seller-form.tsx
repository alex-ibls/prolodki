import { saveListingAction } from "@/actions/store";
import { BrandModelFields } from "@/components/brand-model-fields";
import { CategoryFields } from "@/components/category-fields";
import { CityPlaceField } from "@/components/city-place-field";
import { LimitedText } from "@/components/limited-text";
import { PhotoField } from "@/components/photo-field";
import { RubleInput, TextInput, YearInput } from "@/components/validated-inputs";
import { actionClass, inputClass, secondaryClass } from "@/components/styles";
import { allCategories } from "@/lib/catalog";
import { effectiveCharacteristicsFor } from "@/lib/characteristics";
import { brandModelChoices, categoryPath, isLeaf, withoutDemo } from "@/lib/taxonomy";

type ListingShape = {
  id: string;
  categoryId: number;
  title: string;
  brand: string;
  model: string;
  year: number | null;
  description: string;
  priceKopeks: number;
  compareAtKopeks: number | null;
  logisticsKopeks?: number | null;
  leadTime?: string;
  city: string;
  lat?: number | null;
  lng?: number | null;
  onOrder: boolean;
  quantity: number;
  status: string;
  images?: { id: string; path: string }[];
  attributes?: { attributeDefId: number; valueNumber: number | null; valueText?: string | null; definition?: { code: string; dataType?: string } }[];
};

export async function SellerForm({
  listing,
  error,
}: {
  listing?: ListingShape;
  error?: string;
}) {
  const categories = withoutDemo(await allCategories());
  const choices = await brandModelChoices(false);
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
  for (const attr of listing?.attributes ?? []) {
    if (!attr.definition) continue;
    if (attr.definition.dataType === "text" && attr.valueText) values[attr.definition.code] = attr.valueText;
    else if (attr.valueNumber !== null) values[attr.definition.code] = String(attr.valueNumber);
  }
  const locked = listing?.status === "reserved" || listing?.status === "archived";
  return (
    <form action={saveListingAction} className="grid gap-3 rounded-3xl border border-line bg-card p-4">
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
        <TextInput name="title" required min={3} defaultValue={listing?.title} disabled={locked} />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <BrandModelFields
          brands={choices.brands}
          models={choices.models}
          brand={listing?.brand}
          model={listing?.model}
          disabled={locked}
        />
        <label className="text-sm">
          Год
          <YearInput name="year" defaultValue={listing?.year == null ? "" : String(listing.year)} />
        </label>
        <CityPlaceField
          apiKey={process.env.YANDEX_MAPS_API_KEY ?? ""}
          city={listing?.city}
          lat={listing?.lat}
          lng={listing?.lng}
          disabled={locked}
        />
        <label className="text-sm">
          Цена, ₽
          <RubleInput name="price" required defaultValue={listing ? String(listing.priceKopeks / 100) : ""} />
        </label>
        <label className="text-sm">
          Логистика до дилерского центра в Москве, ₽
          <RubleInput
            name="logistics"
            disabled={locked}
            defaultValue={listing?.logisticsKopeks ? String(listing.logisticsKopeks / 100) : ""}
          />
        </label>
        <label className="text-sm md:col-span-2">
          Срок поставки (ориентировочно)
          <input
            name="leadTime"
            maxLength={80}
            placeholder="по запросу"
            defaultValue={listing?.leadTime ?? ""}
            disabled={locked}
            className={inputClass}
          />
        </label>
        <p className="text-sm text-muted">Объявление на доске: лодка БУ. Покупатель напишет или позвонит.</p>
      </div>
      <div className="text-sm">
        Описание
        <LimitedText name="description" defaultValue={listing?.description} />
      </div>
      <PhotoField images={listing?.images} disabled={locked} />
      {locked ? null : (
        <div className="flex gap-2">
          <button name="intent" value="draft" className={secondaryClass}>
            Черновик
          </button>
          <button name="intent" value="submit" className={actionClass}>
            Отправить на модерацию
          </button>
        </div>
      )}
    </form>
  );
}
