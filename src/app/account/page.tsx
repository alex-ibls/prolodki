import Link from "next/link";
import { resendConfirmEmailAction, updateProfileAction } from "@/actions/store";
import { SavedNote } from "@/components/catalog-ui";
import { actionClass, inputClass, panelClass, secondaryClass } from "@/components/styles";
import { readQuery } from "@/lib/query";
import { buyerListingsEnabled, ensureIndividualSeller } from "@/lib/seller";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Кабинет" };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const current = await getCurrentUser();
  if (!current) return null;
  const user = buyerListingsEnabled ? await ensureIndividualSeller(current) : current;
  const { one } = await readQuery(searchParams);
  return (
    <main className="grid gap-4">
      <h1 className="font-display text-xl font-extrabold tracking-tight text-deep md:text-2xl">Профиль</h1>
      <SavedNote saved={one("saved")} />
      {one("verified") ? <p className="rounded-md bg-foam px-4 py-3 text-sm text-deep">Email подтверждён.</p> : null}
      {one("sent") ? <p className="rounded-md bg-foam px-4 py-3 text-sm text-deep">Письмо отправлено на {user.email}.</p> : null}
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
        <button className={actionClass}>Сохранить</button>
      </form>
      {buyerListingsEnabled ? <section className={panelClass}>
        <h2 className="text-lg text-deep">Товары</h2>
        {user.emailVerifiedAt ? (
          <>
            <p className="mt-2 text-sm text-muted">
              Email подтверждён. Можно разместить товар БУ: покупатель напишет или позвонит.
            </p>
            <Link href="/account/listings" className={`${actionClass} mt-4`}>
              Мои товары
            </Link>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted">
              Разместить товар можно после подтверждения {user.email}. Письмо со ссылкой уходит сразу после регистрации.
            </p>
            <form action={resendConfirmEmailAction} className="mt-4">
              <button className={secondaryClass}>Отправить письмо ещё раз</button>
            </form>
          </>
        )}
      </section> : null}
    </main>
  );
}
