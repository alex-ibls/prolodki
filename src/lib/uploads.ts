import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DomainError } from "@/lib/errors";

const root = path.join(process.cwd(), "uploads");

export async function saveListingImage(listingId: string, file: File) {
  if (file.size === 0) return null;
  if (file.size > 5 * 1024 * 1024) throw new DomainError("Файл больше 5 МБ");
  const types: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/svg+xml": "svg",
  };
  const ext = types[file.type];
  if (!ext) throw new DomainError("Нужна картинка JPEG, PNG или WebP");
  const name = `${crypto.randomUUID()}.${ext}`;
  const relative = path.join("listings", listingId, name);
  const absolute = path.join(root, relative);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, Buffer.from(await file.arrayBuffer()));
  return relative.split(path.sep).join("/");
}

export async function writeUpload(relativePath: string, body: string | Buffer) {
  const absolute = path.join(root, relativePath);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, body);
  return relativePath.split(path.sep).join("/");
}

export async function readUpload(relativePath: string) {
  const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
  if (normalized.includes("..")) throw new DomainError("Некорректный путь");
  const absolute = path.resolve(root, normalized);
  if (!absolute.startsWith(root + path.sep)) throw new DomainError("Некорректный путь");
  return readFile(absolute);
}

export function uploadType(filePath: string) {
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".webp")) return "image/webp";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  return "image/jpeg";
}
