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
    <div className="mx-auto max-w-5xl px-4 py-4 sm:py-8">
      <nav className="-mx-4 mb-6 flex gap-4 overflow-x-auto px-4 text-sm sm:mx-0 sm:flex-wrap sm:px-0">
        {user.staffRole === "manager" ? <Link href="/admin/crm" className="shrink-0">Клиенты</Link> : null}
        {user.staffRole === "manager" ? <Link href="/admin/crm/deals" className="shrink-0">Сделки</Link> : null}
        {user.staffRole === "manager" ? <Link href="/admin/catalog" className="shrink-0">Каталог</Link> : null}
        {user.staffRole === "manager" ? <Link href="/admin/brands" className="shrink-0">Бренды</Link> : null}
        {user.staffRole === "manager" ? <Link href="/admin/nomenclature" className="shrink-0">Номенклатура</Link> : null}
        {user.staffRole === "manager" ? <Link href="/admin/orders" className="shrink-0">Заказы 1P</Link> : null}
        <Link href="/admin/moderation" className="shrink-0">Модерация</Link>
      </nav>
      {children}
    </div>
  );
}
