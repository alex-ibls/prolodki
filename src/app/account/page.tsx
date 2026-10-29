import Link from "next/link";
import { resendConfirmEmailAction, updateProfileAction } from "@/actions/store";
import { SavedNote } from "@/components/catalog-ui";
import { buttonClass, inputClass, panelClass, secondaryClass } from "@/components/styles";
import { readQuery } from "@/lib/query";
import { ensureIndividualSeller } from "@/lib/seller";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Кабинет" };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const current = await getCurrentUser();
  if (!current) return null;
  const user = await ensureIndividualSeller(current);
  const { one } = await readQuery(searchParams);
  return (
    <main className="grid gap-4">
      <h1 className="text-3xl">Профиль</h1>
      <SavedNote saved={one("saved")} />
      {one("verified") ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-moss">Email подтверждён.</p> : null}
      {one("sent") ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-moss">Письмо отправлено на {user.email}.</p> : null}
      {one("error") ? <p className="text-sm text-red-700">{one("error")}</p> : null}
      <form action={updateProfileAction} className={`${panelClass} grid gap-3`}>
        <label className="text-sm">
          Имя
          <input name="name" defaultValue={user.name} className={inputClass} />
        </label>
        <label className="text-sm">
          Телефон
          <input name="phone" defaultValue={user.phone} placeholder="Можно указать позже" className={inputClass} />
        </label>
        <label className="text-sm">
          Город
          <input name="city" defaultValue={user.city} className={inputClass} />
        </label>
        <p className="text-sm text-muted">{user.email}</p>
        <button className={buttonClass}>Сохранить</button>
      </form>
      <section className={panelClass}>
        <h2 className="text-lg">Продажа</h2>
        {user.emailVerifiedAt ? (
          <>
            <p className="mt-2 text-sm text-muted">
              Email подтверждён. Можно публиковать объявления о БУ в этом же кабинете.
            </p>
            <Link href="/account/listings" className={`${buttonClass} mt-4`}>
              Мои объявления
            </Link>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted">
              Продавать можно после подтверждения {user.email}. Письмо со ссылкой уходит сразу после регистрации.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <form action={resendConfirmEmailAction}>
                <button className={secondaryClass}>Отправить письмо ещё раз</button>
              </form>
              <Link href="/account/letter" className={buttonClass}>
                Открыть письмо
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
