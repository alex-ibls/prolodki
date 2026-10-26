import type { Metadata } from "next";
import { Manrope, Unbounded } from "next/font/google";
import { SiteFooter, SiteHeaderSlot } from "@/components/shell";
import { site } from "@/lib/site";
import "./globals.css";

const sans = Manrope({ subsets: ["cyrillic", "latin"], variable: "--font-manrope" });
const display = Unbounded({ subsets: ["cyrillic", "latin"], variable: "--font-unbounded" });

export const metadata: Metadata = {
  title: { default: site.name, template: `%s — ${site.name}` },
  description: "Моторные лодки, катера, яхты и гидроциклы: компания и частные объявления.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${sans.variable} ${display.variable} h-full`}>
      <body className="flex min-h-full flex-col antialiased">
        <SiteHeaderSlot />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
