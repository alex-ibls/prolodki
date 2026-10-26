import { ImportForm } from "@/components/import-form";
import { requireManager } from "@/lib/guards";

export const metadata = { title: "Загрузка CSV" };

export default async function ImportPage() {
  await requireManager();
  return (
    <main className="max-w-3xl">
      <h1 className="text-3xl">Массовая загрузка</h1>
      <p className="mt-2 text-sm text-muted">
        Загрузка создаёт и обновляет карточки по артикулу. Корректировка меняет только цену и остаток: количество заменяет складской остаток, а не прибавляется к нему. Строка с ошибкой пропускается.
      </p>
      <div className="mt-4">
        <ImportForm />
      </div>
    </main>
  );
}
