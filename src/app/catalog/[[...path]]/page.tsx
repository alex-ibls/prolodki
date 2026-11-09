import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { StorefrontCatalog } from "@/components/storefront-catalog";
import { allCategories } from "@/lib/catalog";
import { readQuery } from "@/lib/query";
import { catalogHref, catalogParamsFromSegments, categoryPathMap, isSameCatalogUrl, mergeCatalogParams, queryFromRecord } from "@/lib/sef";
import { withoutDemo } from "@/lib/taxonomy";

type Props = {
  params: Promise<{ path?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { path = [] } = await params;
  const parsed = catalogParamsFromSegments(path);
  const slug = parsed?.params.get("category");
  if (!slug) return { title: "Каталог" };
  const name = withoutDemo(await allCategories()).find((item) => item.slug === slug)?.name;
  return { title: name ?? "Каталог" };
}

export default async function CatalogPathPage({ params, searchParams }: Props) {
  const { path = [] } = await params;
  const parsed = catalogParamsFromSegments(path);
  if (!parsed) notFound();
  const { raw } = await readQuery(searchParams);
  const query = queryFromRecord(raw);
  const merged = mergeCatalogParams(parsed.params, query);
  const paths = categoryPathMap(withoutDemo(await allCategories()));
  const slug = merged.get("category");
  if (slug && !paths[slug]) notFound();
  const canonical = catalogHref(merged, paths);
  const pathname = path.length ? `/catalog/${path.map(encodeURIComponent).join("/")}` : "/catalog";
  if (!isSameCatalogUrl(pathname, query, canonical)) permanentRedirect(canonical);
  return <StorefrontCatalog params={merged} />;
}
