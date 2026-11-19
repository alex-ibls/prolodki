import Link from "next/link";
import { pageFrame, pageTop } from "@/components/styles";

export default function NotFound() {
  return (
    <main className={`${pageFrame} ${pageTop} max-w-6xl`}>
      <h1 className="text-3xl">Страница не найдена</h1>
      <Link href="/" className="mt-4 inline-block text-copper">
        На главную
      </Link>
    </main>
  );
}
