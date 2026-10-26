"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordView, revealListingPhone, toggleFavorite } from "@/lib/activity";
import { formatPhone } from "@/lib/format";

export async function recordViewAction(listingId: string, slug: string) {
  await recordView(listingId);
  if (slug && !slug.includes("/") && !slug.includes(".")) revalidatePath(`/product/${slug}`);
}

export async function revealPhoneAction(listingId: string) {
  const phone = await revealListingPhone(listingId);
  return phone ? formatPhone(phone) : "";
}

export async function toggleFavoriteAction(formData: FormData) {
  const listingId = String(formData.get("listingId") || "");
  const slug = String(formData.get("slug") || "");
  const backRaw = String(formData.get("back") || (slug ? `/product/${slug}` : "/favorites"));
  const back = backRaw.startsWith("/") && !backRaw.startsWith("//") ? backRaw : "/favorites";
  if (listingId) await toggleFavorite(listingId);
  revalidatePath(back);
  redirect(back);
}
