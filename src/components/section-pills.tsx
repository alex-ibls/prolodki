"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { actionClass, secondaryClass } from "@/components/styles";

export function SectionPills({
  items,
  activeTone = "navy",
  variant = "tag",
}: {
  items: { href: string; label: string }[];
  activeTone?: "navy" | "deep";
  variant?: "tag" | "button";
}) {
  const pathname = usePathname();
  const current = items.reduce<string | null>((best, item) => {
    const hit = pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (!hit) return best;
    if (!best || item.href.length > best.length) return item.href;
    return best;
  }, null);
  return (
    <nav className="-mx-3 mb-4 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
      {items.map((item) => {
        const active = item.href === current;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              variant === "button"
                ? `${active ? actionClass : secondaryClass} shrink-0`
                : `tag shrink-0 px-3.5 py-1.5 text-sm font-semibold ${
                    active ? `${activeTone === "deep" ? "bg-deep" : "bg-navy"} text-white` : "border border-line bg-white text-ink"
                  }`
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
