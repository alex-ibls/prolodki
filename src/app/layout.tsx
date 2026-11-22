import type { Metadata, Viewport } from "next";
import { Inter_Tight } from "next/font/google";
import { BreadcrumbBar, CrumbProvider } from "@/components/breadcrumbs";
import { SiteFooter, SiteHeaderSlot } from "@/components/shell";
import { allCategories } from "@/lib/catalog";
import { site } from "@/lib/site";
import "./globals.css";

const sans = Inter_Tight({ subsets: ["cyrillic", "latin"], variable: "--font-inter" });

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#ebf1f5",
};

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} — ${site.domain}`, template: `%s — ${site.name}` },
  description: `Моторные лодки, катера, яхты и гидроциклы: компания и частные товары на ${site.domain}.`,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const names = Object.fromEntries((await allCategories()).map((item) => [item.slug, item.name]));
  return (
    <html lang="ru" className={`${sans.variable} h-full`} style={{ colorScheme: "light" }}>
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
