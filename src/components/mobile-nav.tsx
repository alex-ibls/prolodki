"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/history", label: "История просмотра" },
  { href: "/favorites", label: "Избранное" },
  { href: "/cart", label: "Корзина" },
  { href: "/messages", label: "Сообщения" },
  { href: "/account", label: "Кабинет" },
];

export function MobileNav({
  cartCount,
  loggedIn,
}: {
  cartCount: number;
  loggedIn: boolean;
}) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Разделы"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const href =
            item.href === "/account" && !loggedIn ? "/login" : item.href === "/messages" && loggedIn ? "/account/messages" : item.href;
          const active =
            item.href === "/account"
                ? pathname === "/account" || (pathname.startsWith("/account/") && !pathname.startsWith("/account/messages"))
                : item.href === "/messages"
                  ? pathname.startsWith("/messages") || pathname.startsWith("/account/messages")
                  : pathname === href || pathname.startsWith(`${item.href}/`);
          const label = item.href === "/cart" && cartCount > 0 ? `Корзина ${cartCount}` : item.href === "/account" && !loggedIn ? "Войти" : item.label;
          return (
            <li key={item.href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 items-center justify-center px-1 text-center text-[11px] leading-tight ${active ? "font-semibold text-navy" : "text-muted"}`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
