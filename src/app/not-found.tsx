import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl">Страница не найдена</h1>
      <Link href="/catalog" className="mt-4 inline-block text-copper">
        Перейти в каталог
      </Link>
    </main>
  );
}
