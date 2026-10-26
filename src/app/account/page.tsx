import { enablePrivateSellerAction, updateProfileAction } from "@/actions/store";
import { SavedNote } from "@/components/catalog-ui";
import { buttonClass, inputClass, panelClass } from "@/components/styles";
import { readQuery } from "@/lib/query";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Кабинет" };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { one } = await readQuery(searchParams);
  return (
    <main className="grid gap-4">
      <h1 className="text-3xl">Профиль</h1>
      <SavedNote saved={one("saved")} />
      {one("verified") ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-moss">Email подтверждён.</p> : null}
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
      {!user.sellerProfile && !user.staffRole ? (
        <form action={enablePrivateSellerAction} className={panelClass}>
          <h2 className="text-lg">Продавать БУ</h2>
          <p className="mt-2 text-sm text-muted">
            Тот же аккаунт сможет публиковать подержанную технику. Вторую регистрацию заводить не нужно.
          </p>
          <button className={`${buttonClass} mt-4`}>Стать частным продавцом</button>
        </form>
      ) : null}
      {user.sellerProfile ? (
        <p className="text-sm text-muted">Вы можете покупать и продавать БУ в этом кабинете.</p>
      ) : null}
    </main>
  );
}
