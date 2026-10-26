import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { outboundEmails } from "@/db/schema";
import { confirmEmailLetter } from "@/emails/confirm-email";
import { appOrigin } from "@/lib/mail";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Письмо" };

export default async function LetterPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.emailVerifiedAt) {
    return (
      <main>
        <h1 className="text-3xl">Письмо</h1>
        <p className="mt-4">Email подтверждён.</p>
      </main>
    );
  }

  const stored = await db.query.outboundEmails.findFirst({
    where: and(eq(outboundEmails.userId, user.id), eq(outboundEmails.kind, "confirm_email")),
    orderBy: desc(outboundEmails.createdAt),
  });
  const fresh = user.emailVerifyToken
    ? confirmEmailLetter({
        name: user.name,
        confirmUrl: `${appOrigin()}/verify-email?token=${user.emailVerifyToken}`,
      })
    : null;
  const letter = stored ?? (fresh ? { subject: fresh.subject, bodyHtml: fresh.html } : null);

  if (!letter) {
    return (
      <main>
        <h1 className="text-3xl">Письмо</h1>
        <p className="mt-4">Письмо для подтверждения ещё не подготовлено.</p>
      </main>
    );
  }

  return (
    <main>
      <h1 className="text-3xl">Письмо</h1>
      <p className="mt-2 text-sm text-muted">
        Почтовый сервер не подключён, поэтому письмо открывается здесь. Тема: {letter.subject}
      </p>
      <iframe title={letter.subject} srcDoc={letter.bodyHtml} className="mt-4 h-[640px] w-full rounded-3xl border border-line bg-white" />
    </main>
  );
}
