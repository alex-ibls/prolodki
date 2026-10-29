import { RegisterForm } from "@/components/auth-forms";
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
      <RegisterForm initialError={one("error")} captchaSeed={crypto.randomUUID()} />
    </main>
  );
}
