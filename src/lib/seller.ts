import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sellerProfiles, users } from "@/db/schema";
import type { CurrentUser } from "@/lib/session";

export async function grantIndividualSeller(userId: string) {
  await db
    .insert(sellerProfiles)
    .values({ userId, type: "individual" })
    .onConflictDoNothing({ target: sellerProfiles.userId });
}

export async function ensureIndividualSeller(user: CurrentUser): Promise<CurrentUser> {
  if (!user.emailVerifiedAt || user.sellerProfile) return user;
  await grantIndividualSeller(user.id);
  const fresh = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    with: { sellerProfile: { with: { organization: true } } },
  });
  return fresh ?? user;
}
