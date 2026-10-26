import { SellerForm } from "@/components/seller-form";
import { readQuery } from "@/lib/query";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

export const metadata = { title: "Новое объявление" };

export default async function NewListingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user?.sellerProfile) redirect("/account");
  const { one } = await readQuery(searchParams);
  return (
    <main>
      <h1 className="mb-4 text-3xl">Новое объявление</h1>
      <SellerForm error={one("error")} />
    </main>
  );
}
