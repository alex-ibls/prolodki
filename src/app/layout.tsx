import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { BreadcrumbBar, CrumbProvider } from "@/components/breadcrumbs";
import { SiteFooter, SiteHeaderSlot } from "@/components/shell";
import { site } from "@/lib/site";
import "./globals.css";

const sans = Inter({ subsets: ["cyrillic", "latin"], variable: "--font-inter" });
const display = Manrope({ subsets: ["cyrillic", "latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: { default: site.name, template: `%s — ${site.name}` },
  description: "Моторные лодки, катера, яхты и гидроциклы: компания и частные объявления.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${sans.variable} ${display.variable} h-full`}>
      <body className="flex min-h-full flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] antialiased lg:pb-0">
        <CrumbProvider>
          <SiteHeaderSlot />
          <BreadcrumbBar />
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </CrumbProvider>
      </body>
    </html>
  );
}
