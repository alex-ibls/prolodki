import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SectionPills } from "@/components/section-pills";
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
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-8">
      <SectionPills
        items={[
          ...(user.staffRole === "manager"
            ? [
                { href: "/admin/crm", label: "Клиенты" },
                { href: "/admin/crm/deals", label: "Сделки" },
                { href: "/admin/catalog", label: "Каталог" },
                { href: "/admin/brands", label: "Бренды" },
                { href: "/admin/nomenclature", label: "Номенклатура" },
                { href: "/admin/orders", label: "Заказы 1P" },
              ]
            : []),
          { href: "/admin/moderation", label: "Модерация" },
        ]}
      />
      {children}
    </div>
  );
}
