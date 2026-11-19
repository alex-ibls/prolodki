import { redirect } from "next/navigation";
import { SellerForm } from "@/components/seller-form";
import { readQuery } from "@/lib/query";
import { buyerListingsEnabled, ensureIndividualSeller } from "@/lib/seller";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Новое объявление" };

export default async function NewListingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!buyerListingsEnabled) redirect("/account");
  const current = await getCurrentUser();
  const user = current ? await ensureIndividualSeller(current) : null;
  if (!user?.emailVerifiedAt || !user.sellerProfile) redirect("/account");
  const { one } = await readQuery(searchParams);
  return (
    <main>
      <h1 className="mb-4 font-display text-xl font-extrabold tracking-tight text-deep md:text-2xl">Новое объявление</h1>
      <SellerForm error={one("error")} />
    </main>
  );
}
