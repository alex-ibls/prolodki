import { readUpload, uploadType } from "@/lib/uploads";

export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await context.params;
  try {
    const body = await readUpload(parts.join("/"));
    return new Response(body, {
      headers: {
        "Content-Type": uploadType(parts.at(-1) ?? ""),
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response("Не найдено", { status: 404 });
  }
}
