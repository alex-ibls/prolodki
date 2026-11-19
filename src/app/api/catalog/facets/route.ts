import { catalogFacets } from "@/lib/catalog-facets";
import { allCategories } from "@/lib/catalog";
import { withoutDemo } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("category")?.trim() || "";
  const categories = withoutDemo(await allCategories());
  const known = !slug || categories.some((item) => item.slug === slug);
  const facets = await catalogFacets(known && slug ? slug : undefined, categories);
  return Response.json(facets);
}
