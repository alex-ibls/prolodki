import { confirmEmailLetter } from "@/emails/confirm-email";
import { appOrigin, latestConfirmEmail } from "@/lib/mail";
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

  const stored = await latestConfirmEmail(user.id);
  const fresh = user.emailVerifyToken
    ? confirmEmailLetter({
        name: user.name,
        confirmUrl: `${appOrigin()}/verify-email?token=${user.emailVerifyToken}`,
      })
    : null;
  const letter = stored ?? (fresh ? { subject: fresh.subject, bodyHtml: fresh.html, sentAt: null } : null);

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
        {letter.sentAt
          ? `Письмо отправлено на ${user.email}. Тема: ${letter.subject}`
          : `Письмо для ${user.email} можно подтвердить здесь, если оно не пришло на почту. Тема: ${letter.subject}`}
      </p>
      <iframe title={letter.subject} srcDoc={letter.bodyHtml} className="mt-4 h-[640px] w-full rounded-3xl border border-line bg-white" />
    </main>
  );
}
