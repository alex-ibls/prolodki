"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/history", label: "История", icon: "clock" },
  { href: "/favorites", label: "Избранное", icon: "heart" },
  { href: "/cart", label: "Корзина", icon: "bag" },
  { href: "/messages", label: "Чаты", icon: "chat" },
  { href: "/account", label: "Кабинет", icon: "user" },
] as const;

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
          const label = item.href === "/account" && !loggedIn ? "Войти" : item.label;
          return (
            <li key={item.href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[10px] leading-none ${active ? "font-semibold text-navy" : "text-muted"}`}
              >
                <span className="relative">
                  <NavIcon name={item.icon} />
                  {item.href === "/cart" && cartCount > 0 ? (
                    <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-copper px-1 text-[10px] font-semibold text-white">
                      {cartCount}
                    </span>
                  ) : null}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function NavIcon({ name }: { name: (typeof items)[number]["icon"] }) {
  const common = {
    viewBox: "0 0 24 24",
    className: "h-5 w-5",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (name === "clock") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l3 2" />
      </svg>
    );
  }
  if (name === "heart") {
    return (
      <svg {...common}>
        <path d="M12 19s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z" />
      </svg>
    );
  }
  if (name === "bag") {
    return (
      <svg {...common}>
        <path d="M6 8h12l-1 12H7L6 8z" />
        <path d="M9 8V7a3 3 0 0 1 6 0v1" />
      </svg>
    );
  }
  if (name === "chat") {
    return (
      <svg {...common}>
        <path d="M5 16.5 4 20l3.5-1A8 8 0 1 0 5 16.5z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="8" r="3" />
      <path d="M5 19c1.2-3 3.4-4.5 7-4.5S17.8 16 19 19" />
    </svg>
  );
}
