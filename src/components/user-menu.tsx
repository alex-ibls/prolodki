"use client";

import { logoutAction } from "@/actions/store";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

type StaffRole = "manager" | "moderator" | null;

function MenuLinks({ items, pathname }: { items: { href: string; label: string }[]; pathname: string }) {
  return items.map((item) => {
    const active = item.href === "/account" ? pathname === "/account" : pathname === item.href || pathname.startsWith(`${item.href}/`);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`block px-4 py-2.5 text-sm hover:bg-paper ${active ? "font-semibold text-navy" : "text-ink"}`}
      >
        {item.label}
      </Link>
    );
  });
}

export function UserMenu({
  cartCount,
  loggedIn,
  staffRole,
}: {
  cartCount: number;
  loggedIn: boolean;
  staffRole: StaffRole;
}) {
  const pathname = usePathname();
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const buyer = [
    { href: "/favorites", label: "Избранное" },
    { href: "/history", label: "История" },
    { href: "/cart", label: cartCount > 0 ? `Корзина (${cartCount})` : "Корзина" },
    { href: loggedIn ? "/account/orders" : "/orders", label: "Заказы" },
    { href: loggedIn ? "/account/messages" : "/messages", label: "Сообщения" },
  ];
  const work = [
    { href: loggedIn ? "/account" : "/login", label: loggedIn ? "Кабинет" : "Войти" },
    ...(staffRole === "manager"
      ? [
          { href: "/admin/crm", label: "CRM" },
          { href: "/admin/nomenclature", label: "Склад" },
        ]
      : []),
    ...(staffRole === "manager" || staffRole === "moderator" ? [{ href: "/admin/moderation", label: "Модерация" }] : []),
  ];

  return (
    <div ref={root} className="relative shrink-0">
      <button
        type="button"
        className="btn relative flex h-11 w-11 items-center justify-center border border-line text-navy"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Закрыть меню" : "Меню"}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
            <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
        {cartCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-copper px-1 text-[11px] font-semibold text-white">
            {cartCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <nav
          id={panelId}
          aria-label="Меню"
          className="absolute right-0 top-full z-50 mt-2 max-h-[min(24rem,70vh)] w-60 overflow-auto rounded-2xl border border-line bg-white py-2 shadow-xl"
        >
          <MenuLinks items={buyer} pathname={pathname} />
          <div className="my-1 border-t border-line" role="separator" />
          <MenuLinks items={work} pathname={pathname} />
          {loggedIn ? (
            <form action={logoutAction} className="border-t border-line">
              <button type="submit" className="block w-full px-4 py-2.5 text-left text-sm text-muted hover:bg-paper">
                Выйти
              </button>
            </form>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
