import { notFound } from "next/navigation";
import { deleteBrandAction, saveBrandAction } from "@/actions/taxonomy";
import { CrumbTitle } from "@/components/breadcrumbs";
import { buttonClass, inputClass, secondaryClass } from "@/components/styles";
import { requireManager } from "@/lib/guards";
import { readQuery } from "@/lib/query";
import { allBrands } from "@/lib/taxonomy";

export default async function BrandDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireManager();
  const { id: raw } = await params;
  const id = Number(raw);
  const { one } = await readQuery(searchParams);
  const brand = (await allBrands()).find((item) => item.id === id);
  if (!brand) notFound();
  return (
    <main className="grid max-w-3xl gap-6">
      <CrumbTitle label={brand.name} />
      <h1 className="text-2xl sm:text-3xl">{brand.name}</h1>
      <p className="text-sm text-muted">{brand.slug}</p>
      {one("error") ? <p className="text-sm text-red-700">{one("error")}</p> : null}
      {one("saved") ? <p className="text-sm text-moss">Сохранено.</p> : null}
      <form action={saveBrandAction} className="grid gap-3 rounded-3xl border border-line bg-card p-5">
        <input type="hidden" name="id" value={brand.id} />
        <label className="text-sm">
          Название
          <input name="name" required defaultValue={brand.name} className={inputClass} />
        </label>
        <label className="text-sm">
          Порядок
          <input name="sort" defaultValue={brand.sort} className={inputClass} />
        </label>
        <button className={`${buttonClass} w-fit`}>Сохранить</button>
      </form>
      <form action={deleteBrandAction}>
        <input type="hidden" name="id" value={brand.id} />
        <button className={secondaryClass}>Удалить бренд</button>
      </form>
    </main>
  );
}
