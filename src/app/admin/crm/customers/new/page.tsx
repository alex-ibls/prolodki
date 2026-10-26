import { createCustomerAction } from "@/actions/admin";
import { buttonClass, inputClass } from "@/components/styles";
import { requireManager } from "@/lib/guards";
import { readQuery } from "@/lib/query";

export const metadata = { title: "Новый клиент" };

export default async function NewCustomerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireManager();
  const { one } = await readQuery(searchParams);
  return (
    <main className="max-w-xl">
      <h1 className="text-3xl">Новый клиент</h1>
      {one("error") ? <p className="mt-3 text-sm text-red-700">{one("error")}</p> : null}
      <form action={createCustomerAction} className="mt-4 grid gap-3">
        <label className="text-sm">
          Имя
          <input name="name" required className={inputClass} />
        </label>
        <label className="text-sm">
          Телефон
          <input name="phone" required className={inputClass} />
        </label>
        <label className="text-sm">
          Email
          <input name="email" className={inputClass} />
        </label>
        <label className="text-sm">
          Город
          <input name="city" className={inputClass} />
        </label>
        <label className="text-sm">
          Заметка
          <textarea name="notes" rows={3} className={inputClass} />
        </label>
        <button className={buttonClass}>Создать</button>
      </form>
    </main>
  );
}
