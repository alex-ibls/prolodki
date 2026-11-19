import { catalogQueryFromSearchParams, searchCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const result = await searchCatalog(catalogQueryFromSearchParams(params), { countOnly: true });
  return Response.json({ total: result.total });
}
