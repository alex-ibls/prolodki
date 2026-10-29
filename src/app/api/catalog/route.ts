import { listingCard } from "@/components/catalog-ui";
import { catalogQueryFromSearchParams, searchCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const result = await searchCatalog(catalogQueryFromSearchParams(params));
  return Response.json({
    rows: result.rows.map(listingCard),
    page: result.page,
    pages: result.pages,
  });
}
