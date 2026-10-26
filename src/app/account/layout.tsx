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
    <div className="mx-auto max-w-5xl px-4 py-8">
      <nav className="mb-6 flex flex-wrap gap-3 text-sm">
        <Link href="/account">Профиль</Link>
        <Link href="/account/orders">Мои заказы</Link>
        <Link href="/account/listings">Объявления</Link>
        <Link href="/account/sales">Продажи</Link>
        <Link href="/account/messages">Сообщения</Link>
      </nav>
      {user.emailVerifiedAt ? null : (
        <p className="mb-6 rounded-3xl border border-navy/20 bg-[#e8f4fc] px-4 py-3 text-sm">
          Email не подтверждён. В кабинет можно входить без подтверждения. Разместить объявление можно только после
          подтверждения адреса {user.email}.{" "}
          <Link href="/account/letter" className="font-semibold text-copper">
            Открыть письмо
          </Link>
        </p>
      )}
      {children}
    </div>
  );
}
