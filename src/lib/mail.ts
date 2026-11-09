import nodemailer, { type Transporter } from "nodemailer";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { outboundEmails } from "@/db/schema";
import { headers } from "next/headers";
import { confirmEmailLetter } from "@/emails/confirm-email";
import { isLoopbackHost, publicAuthUrl } from "@/lib/public-origin";

const productionOrigin = "https://lodki.in.ru.net";

export async function appOrigin() {
  const configured = publicAuthUrl();
  if (configured) return configured;
  try {
    const incoming = await headers();
    const host = (incoming.get("x-forwarded-host") ?? incoming.get("host") ?? "").split(",")[0].trim();
    if (host && !isLoopbackHost(host)) {
      const forwarded = incoming.get("x-forwarded-proto")?.split(",")[0]?.trim();
      const proto = forwarded === "http" || forwarded === "https" ? forwarded : "https";
      return `${proto}://${host}`;
    }
  } catch {
    // Письмо собирается вне запроса.
  }
  if (process.env.NODE_ENV === "production") return productionOrigin;
  return "http://localhost:3000";
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
  const pass = process.env.SMTP_PASSWORD?.trim() || process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM?.trim() || process.env.MAIL_FROM?.trim();
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

export async function sendConfirmEmail(user: { id: string; email: string; name: string; emailVerifyToken: string }) {
  const letter = confirmEmailLetter({
    name: user.name,
    confirmUrl: `${await appOrigin()}/verify-email?token=${user.emailVerifyToken}`,
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
