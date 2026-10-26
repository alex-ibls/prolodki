import { db } from "@/db";
import { outboundEmails } from "@/db/schema";
import { confirmEmailLetter } from "@/emails/confirm-email";

export function appOrigin() {
  return (process.env.AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function queueConfirmEmail(user: { id: string; email: string; name: string; emailVerifyToken: string }) {
  const letter = confirmEmailLetter({
    name: user.name,
    confirmUrl: `${appOrigin()}/verify-email?token=${user.emailVerifyToken}`,
  });
  await db.insert(outboundEmails).values({
    userId: user.id,
    kind: "confirm_email",
    toAddress: user.email,
    subject: letter.subject,
    bodyText: letter.text,
    bodyHtml: letter.html,
  });
  return letter;
}
