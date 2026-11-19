import { RegisterForm } from "@/components/auth-forms";
import { pageFrame } from "@/components/styles";
import { readQuery } from "@/lib/query";

export const metadata = { title: "Регистрация" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { one } = await readQuery(searchParams);
  return (
    <main className={`${pageFrame} max-w-6xl`}>
      <div className="max-w-md">
        <h1 className="text-3xl">Регистрация</h1>
        <RegisterForm initialError={one("error")} captchaSeed={crypto.randomUUID()} />
      </div>
    </main>
  );
}
