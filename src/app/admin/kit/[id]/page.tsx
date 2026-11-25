import { notFound } from "next/navigation";
import { deleteKitItemAction, saveKitItemAction } from "@/actions/kit";
import { CrumbTitle } from "@/components/breadcrumbs";
import { KitPhotoField } from "@/components/kit-photo-field";
import { buttonClass, inputClass, secondaryClass } from "@/components/styles";
import { requireManager } from "@/lib/guards";
import { getKitCatalogItem, kitItemUsage } from "@/lib/kit";
import { readQuery } from "@/lib/query";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function KitItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireManager();
  const { id } = await params;
  if (!uuid.test(id)) notFound();
  const item = await getKitCatalogItem(id);
  if (!item) notFound();
  const { one } = await readQuery(searchParams);
  const used = await kitItemUsage(item.id);
  return (
    <main className="grid max-w-3xl gap-6">
      <CrumbTitle label={item.name} />
      <div>
        <h1 className="text-2xl sm:text-3xl">{item.name}</h1>
        <p className="mt-2 text-sm text-muted">Артикул {item.sku}</p>
      </div>
      {one("error") ? <p className="text-sm text-red-700">{one("error")}</p> : null}
      {one("saved") ? <p className="text-sm text-moss">Сохранено.</p> : null}
      <form action={saveKitItemAction} className="grid gap-4 rounded-3xl border border-line bg-card p-4">
        <input type="hidden" name="id" value={item.id} />
        <KitPhotoField path={item.imagePath} />
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            Тип
            <select name="kind" className={inputClass} defaultValue={item.kind === "extra" ? "extra" : "fit"}>
              <option value="fit">Исполнение</option>
              <option value="extra">Доп. оборудование</option>
            </select>
          </label>
          <label className="text-sm">
            Артикул
            <input name="sku" required maxLength={40} defaultValue={item.sku} className={inputClass} />
          </label>
          <label className="text-sm md:col-span-2">
            Название
            <input name="name" required maxLength={80} defaultValue={item.name} className={inputClass} />
          </label>
          <label className="text-sm">
            Цена, ₽
            <input name="priceRub" inputMode="numeric" defaultValue={String(item.priceKopeks / 100)} className={inputClass} />
          </label>
        </div>
        <button className={`${buttonClass} w-fit`}>Сохранить</button>
      </form>
      <div className="grid gap-3">
        <p className="text-sm text-muted">
          {used > 0 ? `Позиция выбрана в карточках (${used}). Удаление доступно, когда её уберут из групп.` : "В карточках не выбрана. Позицию можно удалить."}
        </p>
        {used === 0 ? (
          <form action={deleteKitItemAction}>
            <input type="hidden" name="id" value={item.id} />
            <button className={secondaryClass}>Удалить позицию</button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
