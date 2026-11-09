import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { BreadcrumbBar, CrumbProvider } from "@/components/breadcrumbs";
import { SiteFooter, SiteHeaderSlot } from "@/components/shell";
import { allCategories } from "@/lib/catalog";
import { site } from "@/lib/site";
import "./globals.css";

const sans = Inter({ subsets: ["cyrillic", "latin"], variable: "--font-inter" });
const display = Manrope({ subsets: ["cyrillic", "latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} — ${site.domain}`, template: `%s — ${site.name}` },
  description: `Моторные лодки, катера, яхты и гидроциклы: компания и частные объявления на ${site.domain}.`,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const names = Object.fromEntries((await allCategories()).map((item) => [item.slug, item.name]));
  return (
    <html lang="ru" className={`${sans.variable} ${display.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-paper antialiased">
        <CrumbProvider>
          <SiteHeaderSlot />
          <BreadcrumbBar names={names} />
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </CrumbProvider>
      </body>
    </html>
  );
}
