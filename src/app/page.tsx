import { permanentRedirect } from "next/navigation";
import { StorefrontCatalog } from "@/components/storefront-catalog";
import { allCategories } from "@/lib/catalog";
import { readQuery } from "@/lib/query";
import { catalogHref, categoryPathMap, needsCatalogPath, queryFromRecord } from "@/lib/sef";
import { withoutDemo } from "@/lib/taxonomy";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { raw } = await readQuery(searchParams);
  const params = queryFromRecord(raw);
  if (needsCatalogPath(params)) {
    const paths = categoryPathMap(withoutDemo(await allCategories()));
    permanentRedirect(catalogHref(params, paths));
  }
  return <StorefrontCatalog params={params} />;
}
