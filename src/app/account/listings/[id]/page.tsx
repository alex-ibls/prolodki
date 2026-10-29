import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { CrumbTitle } from "@/components/breadcrumbs";
import { SavedNote } from "@/components/catalog-ui";
import { SellerForm } from "@/components/seller-form";
import { listingStats } from "@/lib/activity";
import { readQuery } from "@/lib/query";
import { ensureIndividualSeller } from "@/lib/seller";
import { getCurrentUser } from "@/lib/session";

export default async function EditListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const { one } = await readQuery(searchParams);
  const current = await getCurrentUser();
  const user = current ? await ensureIndividualSeller(current) : null;
  if (!user?.emailVerifiedAt || !user.sellerProfile) notFound();
  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, id),
    with: { attributes: { with: { definition: true } }, images: true },
  });
  if (!listing || listing.sellerUserId !== user.id) notFound();
  const stat = (await listingStats([listing.id])).get(listing.id);
  return (
    <main className="grid gap-3">
      <CrumbTitle label={listing.title} />
      <h1 className="text-3xl">Объявление</h1>
      <SavedNote saved={one("saved")} />
      <p className="text-sm text-muted">
        Просмотры {stat?.view ?? 0} · в избранном {stat?.favorite ?? 0} · в корзину {stat?.cart_add ?? 0} · телефон{" "}
        {stat?.phone_reveal ?? 0}
      </p>
      {listing.images.length > 0 ? (
        <div className="flex gap-2">
          {listing.images.map((image) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={image.id} src={`/media/${image.path}`} alt="" className="h-20 w-20 rounded-xl object-cover" />
          ))}
        </div>
      ) : null}
      <SellerForm listing={listing} error={one("error")} />
    </main>
  );
}
