import Link from "next/link";
import { loginAction } from "@/actions/store";
import { ErrorNote } from "@/components/catalog-ui";
import { buttonClass, inputClass, panelClass } from "@/components/styles";
import { readQuery } from "@/lib/query";
import { demoAccounts, demoPassword } from "@/lib/site";

export const metadata = { title: "Вход" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { one } = await readQuery(searchParams);
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-3xl">Вход</h1>
      <ErrorNote message={one("error")} />
      <form action={loginAction} className={`${panelClass} mt-4 grid gap-3`}>
        <input type="hidden" name="next" value={one("next") || "/account"} />
        <label className="text-sm">
          Email
          <input name="email" type="email" required className={inputClass} />
        </label>
        <label className="text-sm">
          Пароль
          <input name="password" type="password" required className={inputClass} />
        </label>
        <button className={buttonClass}>Войти</button>
      </form>
      <p className="mt-4 text-sm">
        Нет аккаунта? <Link href="/register">Регистрация</Link>
      </p>
      <div className="mt-6 text-sm text-muted">
        <p>Демо-пароль для всех аккаунтов: {demoPassword}</p>
        <ul className="mt-2 space-y-1">
          {demoAccounts.map(([email, label]) => (
            <li key={email}>
              {email} — {label}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
