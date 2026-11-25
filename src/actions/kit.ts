"use server";

import { redirect } from "next/navigation";
import { DomainError, isNextNavigation } from "@/lib/errors";
import { runAction } from "@/lib/guards";
import { getCurrentUser } from "@/lib/session";
import { deleteKitCatalogItem, saveKitCatalogItem } from "@/lib/kit";

export type CreatedKitItem = {
  id: string;
  sku: string;
  kind: string;
  name: string;
  priceKopeks: number;
  imagePath: string;
};

export async function saveKitItemAction(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  const back = id ? `/admin/kit/${id}` : "/admin/kit";
  await runAction(back, async (user) => {
    if (user.staffRole !== "manager") throw new DomainError("Каталог комплектаций доступен менеджеру");
    const saved = await saveKitCatalogItem(formData);
    redirect(`/admin/kit/${saved.id}?saved=1`);
  });
}

export async function deleteKitItemAction(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  await runAction(id ? `/admin/kit/${id}` : "/admin/kit", async (user) => {
    if (user.staffRole !== "manager") throw new DomainError("Каталог комплектаций доступен менеджеру");
    await deleteKitCatalogItem(id);
    redirect("/admin/kit?saved=1");
  });
}

export async function bulkKitAction(formData: FormData) {
  const back = cleanKitBack(formData.get("back"));
  await runAction(back, async (user) => {
    if (user.staffRole !== "manager") throw new DomainError("Каталог комплектаций доступен менеджеру");
    if (formData.get("op") !== "delete") throw new DomainError("Неизвестное действие");
    const ids = [...new Set(formData.getAll("id").map(String).map((item) => item.trim()).filter(Boolean))];
    if (ids.length === 0) throw new DomainError("Выберите строки");
    if (ids.length > 200) throw new DomainError("За один раз можно обработать не больше 200 строк");
    for (const id of ids) await deleteKitCatalogItem(id);
    redirect(withSaved(back));
  });
}

export async function createKitPositionAction(
  formData: FormData,
): Promise<{ ok: true; item: CreatedKitItem } | { ok: false; error: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "Войдите, чтобы продолжить" };
    if (user.staffRole !== "manager") return { ok: false, error: "Каталог комплектаций доступен менеджеру" };
    formData.delete("id");
    const saved = await saveKitCatalogItem(formData);
    return {
      ok: true,
      item: {
        id: saved.id,
        sku: saved.sku,
        kind: saved.kind,
        name: saved.name,
        priceKopeks: saved.priceKopeks,
        imagePath: saved.imagePath,
      },
    };
  } catch (error) {
    if (isNextNavigation(error)) throw error;
    return { ok: false, error: error instanceof DomainError ? error.message : "Не получилось выполнить действие" };
  }
}

function cleanKitBack(raw: unknown) {
  const value = String(raw || "");
  if (!value.startsWith("/admin/kit") || value.startsWith("//") || value.includes("\n") || value.includes("\\")) {
    return "/admin/kit";
  }
  const [path, query = ""] = value.split("?");
  if (path !== "/admin/kit") return "/admin/kit";
  const params = new URLSearchParams(query);
  params.delete("saved");
  params.delete("error");
  const next = params.toString();
  return next ? `${path}?${next}` : path;
}

function withSaved(path: string) {
  return `${path}${path.includes("?") ? "&" : "?"}saved=1`;
}
