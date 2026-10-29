"use server";

import { hash } from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { db } from "@/db";
import { cartItems, customers, users } from "@/db/schema";
import { claimGuestSession, recordListingEvent } from "@/lib/activity";
import { type AuthFormState, captchaError, firstFormError, loginSchema, registerSchema } from "@/lib/auth-fields";
import { verifyCaptcha } from "@/lib/captcha";
import { assertCartQty, getOrCreateCart } from "@/lib/cart";
import { DomainError, isNextNavigation } from "@/lib/errors";
import { readGuestToken } from "@/lib/guest";
import { runAction } from "@/lib/guards";
import { saveSellerListing } from "@/lib/listings";
import { sendConfirmEmail } from "@/lib/mail";
import { cancelGuestOrder, cancelOrder, placeOrder, transitionLine } from "@/lib/orders";
import { getCurrentUser } from "@/lib/session";

function safeNext(value: FormDataEntryValue | null) {
  const next = String(value || "/account");
  return next.startsWith("/") && !next.startsWith("//") ? next : "/account";
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const next = safeNext(formData.get("next"));
  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) return firstFormError(parsed.error.issues);

  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  const { compare } = await import("bcryptjs");
  const ok = user ? await compare(password, user.passwordHash) : false;
  if (!user || !ok) return { error: "Неверный email или пароль" };
  await claimGuestSession(user.id, await readGuestToken());
  try {
    await signIn("credentials", { email, password, redirectTo: next });
  } catch (error) {
    if (isNextNavigation(error)) throw error;
    return { error: "Неверный email или пароль" };
  }
  return null;
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

export async function registerAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: String(formData.get("email") || "").trim(),
    password: formData.get("password"),
  });
  if (!parsed.success) return firstFormError(parsed.error.issues);
  const input = parsed.data;
  const captcha = String(formData.get("captcha") || "");
  const captchaMessage = captchaError(captcha);
  if (captchaMessage) return { error: captchaMessage, field: "captcha" };
  if (!(await verifyCaptcha(captcha))) return { error: "Код с картинки не совпал", field: "captcha" };
  const email = input.email.toLowerCase();
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) return { error: "Такой email уже зарегистрирован", field: "email" };

  const passwordHash = await hash(input.password, 10);
  const [user] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      name: input.name,
      emailVerifyToken: crypto.randomUUID(),
    })
    .returning();
  let sent = false;
  if (user.emailVerifyToken) {
    const delivery = await sendConfirmEmail({
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerifyToken: user.emailVerifyToken,
    });
    sent = delivery.sent;
  }
  await db.insert(customers).values({
    userId: user.id,
    name: input.name,
    phone: "",
    email,
    source: "registration",
  });
  await claimGuestSession(user.id, await readGuestToken());
  await signIn("credentials", {
    email,
    password: input.password,
    redirectTo: sent ? "/account?sent=1" : "/account",
  });
  return null;
}

export async function resendConfirmEmailAction() {
  await runAction("/account", async (user) => {
    if (user.emailVerifiedAt) redirect("/account");
    let token = user.emailVerifyToken;
    if (!token) {
      token = crypto.randomUUID();
      await db.update(users).set({ emailVerifyToken: token }).where(eq(users.id, user.id));
    }
    const delivery = await sendConfirmEmail({
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerifyToken: token,
    });
    if (!delivery.sent) throw new DomainError("Не удалось отправить письмо. Его можно открыть в кабинете.");
    redirect("/account?sent=1");
  });
}

export async function updateProfileAction(formData: FormData) {
  await runAction("/account", async (user) => {
    const name = String(formData.get("name") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const city = String(formData.get("city") || "").trim();
    if (name.length < 2 || city.length < 2) throw new DomainError("Заполните имя и город");
    if (phone && phone.length < 6) throw new DomainError("Телефон указан неверно");
    await db.update(users).set({ name, phone, city }).where(eq(users.id, user.id));
    await db
      .update(customers)
      .set({ name, phone, city })
      .where(eq(customers.userId, user.id));
    redirect("/account?saved=1");
  });
}

export async function saveListingAction(formData: FormData) {
  const listingId = String(formData.get("listingId") || "") || null;
  const back = listingId ? `/account/listings/${listingId}` : "/account/listings/new";
  await runAction(back, async (user) => {
    const id = await saveSellerListing(user, listingId, formData);
    redirect(`/account/listings/${id}?saved=1`);
  });
}

export async function addToCartAction(formData: FormData) {
  const listingId = String(formData.get("listingId") || "");
  const slug = String(formData.get("slug") || "");
  const qty = Number(formData.get("qty") || 1);
  try {
    const listing = await assertCartQty(listingId, qty);
    const user = await getCurrentUser();
    if (user && listing.sellerUserId === user.id) throw new DomainError("Нельзя купить своё объявление");
    const cart = await getOrCreateCart();
    const [existing] = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.listingId, listingId)));
    const nextQty = (existing?.qty ?? 0) + qty;
    if (nextQty > listing.quantity) throw new DomainError(`Доступно ${listing.quantity}`);
    if (existing) {
      await db
        .update(cartItems)
        .set({ qty: nextQty })
        .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.listingId, listingId)));
    } else {
      await db.insert(cartItems).values({ cartId: cart.id, listingId, qty });
    }
    await recordListingEvent({
      listingId,
      kind: "cart_add",
      userId: user?.id ?? null,
      guestToken: cart.guestToken,
    });
  } catch (error) {
    if (isNextNavigation(error)) throw error;
    const message = error instanceof DomainError ? error.message : "Не удалось добавить в корзину";
    redirect(`/product/${slug}?error=${encodeURIComponent(message)}`);
  }
  redirect("/cart");
}

export async function updateCartAction(formData: FormData) {
  const listingId = String(formData.get("listingId") || "");
  const intent = String(formData.get("intent") || "set");
  try {
    const cart = await getOrCreateCart();
    if (intent === "remove") {
      await db
        .delete(cartItems)
        .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.listingId, listingId)));
    } else {
      const qty = Number(formData.get("qty") || 1);
      const listing = await assertCartQty(listingId, qty);
      await db
        .update(cartItems)
        .set({ qty: Math.min(qty, listing.quantity) })
        .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.listingId, listingId)));
    }
  } catch (error) {
    if (isNextNavigation(error)) throw error;
    const message = error instanceof DomainError ? error.message : "Не получилось выполнить действие";
    redirect(`/cart?error=${encodeURIComponent(message)}`);
  }
  redirect("/cart");
}

export async function checkoutAction(formData: FormData) {
  const user = await getCurrentUser();
  try {
    const payment = String(formData.get("paymentMethod") || "");
    const fulfillment = String(formData.get("fulfillment") || "");
    if (payment !== "invoice" && payment !== "cash" && payment !== "agreement") {
      throw new DomainError("Выберите способ оплаты");
    }
    if (fulfillment !== "pickup" && fulfillment !== "delivery_agreed") {
      throw new DomainError("Выберите получение");
    }
    const contactName = String(formData.get("contactName") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const city = String(formData.get("city") || "").trim();
    if (contactName.length < 2 || phone.length < 6) throw new DomainError("Укажите имя и телефон");
    const cart = await getOrCreateCart();
    const orderId = await placeOrder(user ? { id: user.id, email: user.email } : null, cart.guestToken, cart.id, {
      paymentMethod: payment,
      fulfillment,
      contactName,
      phone,
      city,
      comment: String(formData.get("comment") || "").trim(),
    });
    redirect(user ? `/account/orders/${orderId}` : `/orders/${orderId}`);
  } catch (error) {
    if (isNextNavigation(error)) throw error;
    const message = error instanceof DomainError ? error.message : "Не получилось выполнить действие";
    redirect(`/checkout?error=${encodeURIComponent(message)}`);
  }
}

export async function cancelOrderAction(formData: FormData) {
  const orderId = String(formData.get("orderId") || "");
  const user = await getCurrentUser();
  const back = user ? `/account/orders/${orderId}` : `/orders/${orderId}`;
  try {
    if (user) await cancelOrder(user, orderId);
    else {
      const token = await readGuestToken();
      if (!token) throw new DomainError("Сессия не найдена");
      await cancelGuestOrder(token, orderId);
    }
    redirect(back);
  } catch (error) {
    if (isNextNavigation(error)) throw error;
    const message = error instanceof DomainError ? error.message : "Не получилось выполнить действие";
    redirect(`${back}?error=${encodeURIComponent(message)}`);
  }
}

export async function transitionLineAction(formData: FormData) {
  const orderId = String(formData.get("orderId") || "");
  const itemId = String(formData.get("itemId") || "");
  const next = String(formData.get("next") || "");
  const back = String(formData.get("back") || `/account/orders/${orderId}`);
  await runAction(back, async (user) => {
    if (next !== "confirmed" && next !== "completed" && next !== "cancelled") {
      throw new DomainError("Неизвестное действие");
    }
    await transitionLine(user, itemId, next);
    redirect(back);
  });
}
