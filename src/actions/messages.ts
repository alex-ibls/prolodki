"use server";

import { redirect } from "next/navigation";
import { DomainError, isNextNavigation } from "@/lib/errors";
import { replyToThread, sendListingMessage } from "@/lib/messages";
import { getCurrentUser } from "@/lib/session";

function safePath(value: string, fallback: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export async function sendListingMessageAction(formData: FormData) {
  const slug = String(formData.get("slug") || "");
  const listingId = String(formData.get("listingId") || "");
  const back = slug ? `/product/${slug}` : "/";
  try {
    const threadId = await sendListingMessage(
      listingId,
      String(formData.get("contactName") || ""),
      String(formData.get("body") || ""),
    );
    const user = await getCurrentUser();
    redirect(user ? `/account/messages/${threadId}` : `/messages/${threadId}`);
  } catch (error) {
    if (isNextNavigation(error)) throw error;
    const message = error instanceof DomainError ? error.message : "Не удалось отправить сообщение";
    redirect(`${back}?error=${encodeURIComponent(message)}`);
  }
}

export async function replyMessageAction(formData: FormData) {
  const threadId = String(formData.get("threadId") || "");
  const back = safePath(String(formData.get("back") || ""), "/messages");
  try {
    await replyToThread(threadId, String(formData.get("body") || ""));
    redirect(back);
  } catch (error) {
    if (isNextNavigation(error)) throw error;
    const message = error instanceof DomainError ? error.message : "Не удалось отправить сообщение";
    const join = back.includes("?") ? "&" : "?";
    redirect(`${back}${join}error=${encodeURIComponent(message)}`);
  }
}
