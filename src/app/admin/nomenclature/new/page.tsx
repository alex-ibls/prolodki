import { NomenclatureForm } from "@/components/nomenclature-form";
import { requireManager } from "@/lib/guards";
import { readQuery } from "@/lib/query";

export const metadata = { title: "Новая позиция" };

export default async function NewNomenclaturePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireManager();
  const { one } = await readQuery(searchParams);
  return (
    <main>
      <h1 className="mb-4 text-3xl">Новая позиция</h1>
      <NomenclatureForm error={one("error")} />
    </main>
  );
}
