import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/session";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<main className="px-4 py-8">Загрузка кабинета…</main>}>
      <AccountFrame>{children}</AccountFrame>
    </Suspense>
  );
}

async function AccountFrame({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  return (
    <div className="mx-auto max-w-5xl px-4 py-4 sm:py-8">
      <nav className="-mx-4 mb-6 flex gap-4 overflow-x-auto px-4 text-sm sm:mx-0 sm:flex-wrap sm:px-0">
        <Link href="/account" className="shrink-0">Профиль</Link>
        <Link href="/account/orders" className="shrink-0">Мои заказы</Link>
        <Link href="/account/listings" className="shrink-0">Объявления</Link>
        {user.staffRole === "manager" ? <Link href="/account/sales" className="shrink-0">Продажи</Link> : null}
        <Link href="/account/messages" className="shrink-0">Сообщения</Link>
      </nav>
      {user.emailVerifiedAt ? null : (
        <p className="mb-6 rounded-3xl border border-navy/20 bg-[#e8f4fc] px-4 py-3 text-sm">
          На {user.email} отправлено письмо со ссылкой. Подтвердите адрес из письма, чтобы продавать.
        </p>
      )}
      {children}
    </div>
  );
}
