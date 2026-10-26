import { registerAction } from "@/actions/store";
import { CaptchaField } from "@/components/captcha-field";
import { ErrorNote } from "@/components/catalog-ui";
import { buttonClass, inputClass, panelClass } from "@/components/styles";
import { readQuery } from "@/lib/query";

export const metadata = { title: "Регистрация" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { one } = await readQuery(searchParams);
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-3xl">Регистрация</h1>
      <ErrorNote message={one("error")} />
      <form action={registerAction} className={`${panelClass} mt-4 grid gap-3`}>
        <label className="text-sm">
          Имя
          <input name="name" required className={inputClass} />
        </label>
        <label className="text-sm">
          Email
          <input name="email" type="email" required className={inputClass} />
        </label>
        <label className="text-sm">
          Город
          <input name="city" required className={inputClass} />
        </label>
        <label className="text-sm">
          Пароль
          <input name="password" type="password" required minLength={6} className={inputClass} />
        </label>
        <CaptchaField seed={crypto.randomUUID()} />
        <button className={buttonClass}>Создать аккаунт</button>
      </form>
    </main>
  );
}
