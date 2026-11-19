import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { CrumbTitle } from "@/components/breadcrumbs";
import { SavedNote } from "@/components/catalog-ui";
import { SellerForm } from "@/components/seller-form";
import { listingStats } from "@/lib/activity";
import { readQuery } from "@/lib/query";
import { buyerListingsEnabled, ensureIndividualSeller } from "@/lib/seller";
import { getCurrentUser } from "@/lib/session";

export default async function EditListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!buyerListingsEnabled) redirect("/account");
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
      <h1 className="font-display text-xl font-extrabold tracking-tight text-deep md:text-2xl">Товар</h1>
      <SavedNote saved={one("saved")} />
      <p className="text-sm text-muted">
        Просмотры {stat?.view ?? 0} · в избранном {stat?.favorite ?? 0} · телефон {stat?.phone_reveal ?? 0}
      </p>
      <SellerForm listing={listing} error={one("error")} />
    </main>
  );
}
