import { cookies } from "next/headers";
import { captchaCookie, createCaptcha, renderCaptchaPng } from "@/lib/captcha";

export async function GET() {
  const captcha = createCaptcha();
  const jar = await cookies();
  jar.set(captchaCookie.name, captcha.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: captchaCookie.maxAge,
    secure: process.env.NODE_ENV === "production",
  });
  const png = renderCaptchaPng(captcha.code);
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
