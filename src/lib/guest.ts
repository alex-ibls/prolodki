import { cookies } from "next/headers";

export const GUEST_COOKIE = "prolodki_guest";
export const CART_COOKIE = "prolodki_cart";
export const GUEST_MAX_AGE = 60 * 60 * 24 * 365;

export async function readGuestToken() {
  const jar = await cookies();
  return jar.get(GUEST_COOKIE)?.value || jar.get(CART_COOKIE)?.value || null;
}

export async function ensureGuestToken() {
  const jar = await cookies();
  const token = jar.get(GUEST_COOKIE)?.value || jar.get(CART_COOKIE)?.value || crypto.randomUUID();
  jar.set(GUEST_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_MAX_AGE,
  });
  return token;
}
