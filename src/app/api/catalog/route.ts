import { listingCard } from "@/components/catalog-ui";
import { catalogQueryFromSearchParams, searchCatalog } from "@/lib/catalog";
import { categoryPathMap } from "@/lib/sef";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const result = await searchCatalog(catalogQueryFromSearchParams(params));
  const paths = categoryPathMap(result.categories);
  return Response.json({
    rows: result.rows.map((item) => listingCard(item, paths)),
    page: result.page,
    pages: result.pages,
  });
}
