import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { readQuery } from "@/lib/query";
import { grantIndividualSeller } from "@/lib/seller";

export const metadata = { title: "Подтверждение email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { one } = await readQuery(searchParams);
  const token = one("token");
  const invalid = "/account?error=" + encodeURIComponent("Ссылка подтверждения недействительна");
  if (!token) redirect(invalid);
  const user = await db.query.users.findFirst({ where: eq(users.emailVerifyToken, token) });
  if (!user) redirect(invalid);
  await db
    .update(users)
    .set({ emailVerifiedAt: new Date(), emailVerifyToken: null })
    .where(eq(users.id, user.id));
  await grantIndividualSeller(user.id);
  redirect("/account?verified=1");
}
