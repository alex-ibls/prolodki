import { ImportForm } from "@/components/import-form";
import { requireManager } from "@/lib/guards";

export const metadata = { title: "Загрузка Excel" };

export default async function ImportPage() {
  await requireManager();
  return (
    <main className="max-w-3xl">
      <h1 className="text-3xl">Массовая загрузка</h1>
      <p className="mt-2 text-sm text-muted">
        Файл обновляет карточки по артикулу: название, категорию, цену, склад и витрину. Новая строка создаёт карточку. Склад записывается как остаток, а не прибавляется к нему. Строка с ошибкой пропускается.
      </p>
      <div className="mt-4">
        <ImportForm />
      </div>
    </main>
  );
}
