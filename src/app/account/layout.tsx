import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SectionPills } from "@/components/section-pills";
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
      <SectionPills
        items={[
          { href: "/account/orders", label: "Мои заказы" },
          { href: "/account", label: "Профиль" },
          { href: "/account/listings", label: "Объявления" },
          ...(user.staffRole === "manager" ? [{ href: "/account/sales", label: "Продажи" }] : []),
          { href: "/account/messages", label: "Сообщения" },
        ]}
      />
      {user.emailVerifiedAt ? null : (
        <p className="mb-6 rounded-3xl border border-navy/20 bg-[#e8f4fc] px-4 py-3 text-sm">
          На {user.email} отправлено письмо со ссылкой. Подтвердите адрес из письма, чтобы продавать.
        </p>
      )}
      {children}
    </div>
  );
}
