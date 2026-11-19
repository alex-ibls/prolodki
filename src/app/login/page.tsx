import Link from "next/link";
import { LoginForm } from "@/components/auth-forms";
import { pageFrame } from "@/components/styles";
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
    <main className={`${pageFrame} max-w-6xl`}>
      <div className="mx-auto w-full max-w-md">
      <h1 className="text-3xl">Вход</h1>
      <LoginForm next={one("next") || "/account"} initialError={one("error")} />
      <p className="mt-4 text-sm">
        Нет аккаунта? <Link href="/register">Регистрация</Link>
      </p>
      <div className="mt-4 text-sm text-muted">
        <p>Демо-пароль для всех аккаунтов: {demoPassword}</p>
        <ul className="mt-2 space-y-1">
          {demoAccounts.map(([email, label]) => (
            <li key={email}>
              {email} — {label}
            </li>
          ))}
        </ul>
      </div>
      </div>
    </main>
  );
}
