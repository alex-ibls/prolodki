import { redirect } from "next/navigation";
import { DomainError, isNextNavigation } from "@/lib/errors";
import { getCurrentUser, type CurrentUser } from "@/lib/session";

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireManager() {
  const user = await requireUser();
  if (user.staffRole !== "manager") redirect("/");
  return user;
}

export async function requireModerator() {
  const user = await requireUser();
  if (user.staffRole !== "moderator" && user.staffRole !== "manager") redirect("/");
  return user;
}

export async function runAction(path: string, fn: (user: CurrentUser) => Promise<void>) {
  try {
    const user = await getCurrentUser();
    if (!user) redirect(`/login?next=${encodeURIComponent(path.split("?")[0])}`);
    await fn(user);
  } catch (error) {
    if (isNextNavigation(error)) throw error;
    const message = error instanceof DomainError ? error.message : "Не получилось выполнить действие";
    const join = path.includes("?") ? "&" : "?";
    redirect(`${path}${join}error=${encodeURIComponent(message)}`);
  }
}
