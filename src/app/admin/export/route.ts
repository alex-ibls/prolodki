import { redirect } from "next/navigation";
import { isAdminEntity, loadAdminExport } from "@/lib/admin-records";
import { getCurrentUser } from "@/lib/session";
import { xlsxBuffer } from "@/lib/xlsx-write";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const entity = url.searchParams.get("entity") ?? "";
  const user = await getCurrentUser();
  if (!user?.staffRole) redirect("/login?next=/admin/crm");
  if (!isAdminEntity(entity)) return new Response("Неизвестный раздел", { status: 404 });
  if (entity === "moderation") {
    if (user.staffRole !== "manager" && user.staffRole !== "moderator") redirect("/");
  } else if (user.staffRole !== "manager") {
    redirect("/");
  }
  const one = (key: string) => url.searchParams.get(key) ?? "";
  const sheet = await loadAdminExport(entity, one);
  const file = xlsxBuffer(sheet.headers, sheet.rows);
  const ascii = `${entity}.xlsx`;
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(sheet.filename)}`,
    },
  });
}
