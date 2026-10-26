"use server";

import { hash } from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { db } from "@/db";
import { cartItems, customers, sellerProfiles, users } from "@/db/schema";
import { claimGuestSession, recordListingEvent } from "@/lib/activity";
import { verifyCaptcha } from "@/lib/captcha";
import { assertCartQty, getOrCreateCart } from "@/lib/cart";
import { DomainError, isNextNavigation } from "@/lib/errors";
import { readGuestToken } from "@/lib/guest";
import { runAction } from "@/lib/guards";
import { saveSellerListing } from "@/lib/listings";
import { queueConfirmEmail } from "@/lib/mail";
import { cancelGuestOrder, cancelOrder, placeOrder, transitionLine } from "@/lib/orders";
import { getCurrentUser } from "@/lib/session";

function safeNext(value: FormDataEntryValue | null) {
  const next = String(value || "/account");
  return next.startsWith("/") && !next.startsWith("//") ? next : "/account";
}

const registerSchema = z.object({
  name: z.string().trim().min(2, "Укажите имя"),
  email: z.email("Укажите email"),
  city: z.string().trim().min(2, "Укажите город"),
  password: z.string().min(6, "Пароль от 6 символов"),
});

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const next = safeNext(formData.get("next"));
  const fail = () =>
    redirect(`/login?error=${encodeURIComponent("Неверный email или пароль")}&next=${encodeURIComponent(next)}`);

  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) fail();
  const { compare } = await import("bcryptjs");
  const ok = await compare(password, user!.passwordHash);
  if (!ok) fail();
  await claimGuestSession(user!.id, await readGuestToken());
  try {
    await signIn("credentials", { email, password, redirectTo: next });
  } catch (error) {
    if (isNextNavigation(error)) throw error;
    fail();
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

export async function registerAction(formData: FormData) {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    city: formData.get("city"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    redirect(`/register?error=${encodeURIComponent(parsed.error.issues[0]?.message || "Проверьте форму")}`);
  }
  const input = parsed.data;
  const captcha = String(formData.get("captcha") || "");
  if (!captcha.trim() || !(await verifyCaptcha(captcha))) {
    redirect(`/register?error=${encodeURIComponent("Код с картинки не совпал")}`);
  }
  const email = input.email.toLowerCase();
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) redirect("/register?error=" + encodeURIComponent("Такой email уже зарегистрирован"));

  const passwordHash = await hash(input.password, 10);
  const [user] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      name: input.name,
      city: input.city,
      emailVerifyToken: crypto.randomUUID(),
    })
    .returning();
  if (user.emailVerifyToken) {
    await queueConfirmEmail({
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerifyToken: user.emailVerifyToken,
    });
  }
  await db.insert(customers).values({
    userId: user.id,
    name: input.name,
    phone: "",
    email,
    city: input.city,
    source: "registration",
  });
  await claimGuestSession(user.id, await readGuestToken());
  await signIn("credentials", {
    email,
    password: input.password,
    redirectTo: "/account",
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

export async function enablePrivateSellerAction() {
  await runAction("/account", async (user) => {
    if (user.staffRole) throw new DomainError("Служебный аккаунт не продаёт как частное лицо");
    if (user.sellerProfile) throw new DomainError("У аккаунта уже есть роль продавца");
    await db.insert(sellerProfiles).values({ userId: user.id, type: "individual" });
    redirect("/account/listings");
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
