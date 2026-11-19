import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SectionPills } from "@/components/section-pills";
import { pageFrame } from "@/components/styles";
import { buyerListingsEnabled } from "@/lib/seller";
import { getCurrentUser } from "@/lib/session";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<main className={`${pageFrame} max-w-6xl`}>Загрузка кабинета…</main>}>
      <AccountFrame>{children}</AccountFrame>
    </Suspense>
  );
}

async function AccountFrame({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  return (
    <div className={`${pageFrame} max-w-6xl`}>
      <SectionPills
        variant="button"
        items={[
          { href: "/account/orders", label: "Мои заказы" },
          { href: "/account", label: "Профиль" },
          ...(buyerListingsEnabled ? [{ href: "/account/listings", label: "Товары" }] : []),
          ...(user.staffRole === "manager" ? [{ href: "/account/sales", label: "Продажи" }] : []),
        ]}
      />
      {buyerListingsEnabled && !user.emailVerifiedAt ? (
        <p className="mb-4 rounded-md border border-line bg-foam px-4 py-3 text-sm text-ink">
          На {user.email} отправлено письмо со ссылкой. Подтвердите адрес из письма, чтобы продавать.
        </p>
      ) : null}
      {children}
    </div>
  );
}
