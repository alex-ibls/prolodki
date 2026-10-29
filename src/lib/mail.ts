import nodemailer, { type Transporter } from "nodemailer";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { outboundEmails } from "@/db/schema";
import { confirmEmailLetter } from "@/emails/confirm-email";

export function appOrigin() {
  return (process.env.AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

function readSmtp(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD?.trim();
  const from = process.env.SMTP_FROM?.trim();
  if (!host || !user || !pass || !from) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;
  return { host, port: Number.isFinite(port) ? port : 587, secure, user, pass, from };
}

let transport: Transporter | null = null;
let transportKey = "";

function smtpTransport(config: SmtpConfig) {
  const key = `${config.host}:${config.port}:${config.user}:${config.secure}`;
  if (!transport || transportKey !== key) {
    transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
    });
    transportKey = key;
  }
  return transport;
}

export async function latestConfirmEmail(userId: string) {
  return db.query.outboundEmails.findFirst({
    where: and(eq(outboundEmails.userId, userId), eq(outboundEmails.kind, "confirm_email")),
    orderBy: desc(outboundEmails.createdAt),
  });
}

export async function sendConfirmEmail(user: { id: string; email: string; name: string; emailVerifyToken: string }) {
  const letter = confirmEmailLetter({
    name: user.name,
    confirmUrl: `${appOrigin()}/verify-email?token=${user.emailVerifyToken}`,
  });
  const [row] = await db
    .insert(outboundEmails)
    .values({
      userId: user.id,
      kind: "confirm_email",
      toAddress: user.email,
      subject: letter.subject,
      bodyText: letter.text,
      bodyHtml: letter.html,
    })
    .returning({ id: outboundEmails.id });

  const smtp = readSmtp();
  if (!smtp) {
    const error = "Почтовый сервер не настроен";
    await db.update(outboundEmails).set({ sendError: error }).where(eq(outboundEmails.id, row.id));
    return { sent: false, error };
  }

  try {
    await smtpTransport(smtp).sendMail({
      from: smtp.from,
      to: user.email,
      subject: letter.subject,
      text: letter.text,
      html: letter.html,
    });
    await db.update(outboundEmails).set({ sentAt: new Date(), sendError: "" }).where(eq(outboundEmails.id, row.id));
    return { sent: true, error: "" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось отправить письмо";
    await db
      .update(outboundEmails)
      .set({ sendError: message.slice(0, 500) })
      .where(eq(outboundEmails.id, row.id));
    return { sent: false, error: "Не удалось отправить письмо" };
  }
}
