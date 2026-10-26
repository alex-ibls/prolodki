import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/session";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<main className="px-4 py-8">Загрузка…</main>}>
      <AdminFrame>{children}</AdminFrame>
    </Suspense>
  );
}

async function AdminFrame({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user?.staffRole) redirect("/login?next=/admin/crm");
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <nav className="mb-6 flex flex-wrap gap-3 text-sm">
        {user.staffRole === "manager" ? <Link href="/admin/crm">Клиенты</Link> : null}
        {user.staffRole === "manager" ? <Link href="/admin/crm/deals">Сделки</Link> : null}
        {user.staffRole === "manager" ? <Link href="/admin/catalog">Каталог</Link> : null}
        {user.staffRole === "manager" ? <Link href="/admin/brands">Бренды</Link> : null}
        {user.staffRole === "manager" ? <Link href="/admin/nomenclature">Номенклатура</Link> : null}
        {user.staffRole === "manager" ? <Link href="/admin/orders">Заказы 1P</Link> : null}
        <Link href="/admin/moderation">Модерация</Link>
      </nav>
      {children}
    </div>
  );
}
