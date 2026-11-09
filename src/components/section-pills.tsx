"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SectionPills({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const current = items.reduce<string | null>((best, item) => {
    const hit = pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (!hit) return best;
    if (!best || item.href.length > best.length) return item.href;
    return best;
  }, null);
  return (
    <nav className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
      {items.map((item) => {
        const active = item.href === current;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-[9999px] px-3.5 py-1.5 text-sm font-semibold ${
              active ? "bg-navy text-white" : "border border-line bg-white text-navy"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
