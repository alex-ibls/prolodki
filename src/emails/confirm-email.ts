import { site } from "@/lib/site";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function confirmEmailLetter(input: { name: string; confirmUrl: string }) {
  const name = input.name.trim() || "здравствуйте";
  const subject = `Подтвердите email — ${site.name}`;
  const text = [
    `${name}, здравствуйте!`,
    "",
    `Чтобы размещать объявления на ${site.name}, подтвердите email. В кабинет можно входить и без этого.`,
    "",
    input.confirmUrl,
    "",
    "Если вы не регистрировались, это письмо можно не открывать.",
    "",
    site.name,
  ].join("\n");

  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(input.confirmUrl);
  const html = `<!doctype html>
<html lang="ru">
  <body style="margin:0;background:#f4f9fd;color:#1c3d5a;font-family:Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f9fd;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="background:#1f6cb5;color:#ffffff;padding:22px 28px;font-size:22px;letter-spacing:0.04em;">
                ${escapeHtml(site.name)}
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 12px;font-size:18px;">${safeName}, здравствуйте!</p>
                <p style="margin:0 0 20px;line-height:1.5;">
                  Чтобы размещать объявления на ${escapeHtml(site.name)}, подтвердите email.
                  В кабинет можно входить и без этого.
                </p>
                <a href="${safeUrl}" style="display:inline-block;background:#2a7ad4;color:#ffffff;text-decoration:none;border-radius:999px;padding:12px 20px;font-weight:700;">
                  Подтвердить email
                </a>
                <p style="margin:20px 0 0;font-size:13px;line-height:1.5;color:#5c7690;">
                  Если кнопка не открывается, скопируйте ссылку:<br />
                  <a href="${safeUrl}" style="color:#1f6cb5;">${safeUrl}</a>
                </p>
              </td>
            </tr>
          </table>
          <p style="max-width:560px;margin:16px 0 0;font-size:12px;color:#5c7690;">
            Если вы не регистрировались на ${escapeHtml(site.name)}, это письмо можно не открывать.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}
