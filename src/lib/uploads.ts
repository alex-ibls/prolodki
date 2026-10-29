import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DomainError } from "@/lib/errors";
import { preparePlatformPhoto } from "@/lib/prepare-photo";

const root = path.join(process.cwd(), "uploads");
export const maxPhotoBytes = 20 * 1024 * 1024;
export const maxPhotos = 10;

const types: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

let client: S3Client | null = null;

export function s3Configured() {
  return Boolean(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);
}

function s3() {
  if (!s3Configured()) throw new DomainError("Хранилище фото не настроено");
  if (!client) {
    client = new S3Client({
      region: process.env.S3_REGION || "us-east-1",
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    });
  }
  return client;
}

function bucket() {
  const name = process.env.S3_BUCKET;
  if (!name) throw new DomainError("Хранилище фото не настроено");
  return name;
}

function safeKey(relativePath: string) {
  const key = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!key || key.includes("..")) throw new DomainError("Некорректный путь");
  return key;
}

export async function savePhotoBytes(folder: string, body: Buffer) {
  const key = safeKey(`${folder}/${crypto.randomUUID()}.webp`);
  await s3().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: "image/webp",
      CacheControl: "public, max-age=86400",
    }),
  );
  return key;
}

export async function deleteStored(relativePath: string) {
  if (!s3Configured()) return;
  const key = safeKey(relativePath);
  await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}

export async function savePhoto(folder: string, file: File) {
  if (file.size === 0) return null;
  if (file.size > maxPhotoBytes) throw new DomainError("Файл больше 20 МБ");
  if (!types[file.type]) throw new DomainError("Нужна картинка JPEG, PNG или WebP");
  const prepared = await preparePlatformPhoto(Buffer.from(await file.arrayBuffer()));
  return savePhotoBytes(folder, prepared);
}

export async function saveListingImage(listingId: string, file: File) {
  return savePhoto(`listings/${listingId}`, file);
}

export async function writeUpload(relativePath: string, body: string | Buffer) {
  const absolute = path.join(root, relativePath);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, body);
  return relativePath.split(path.sep).join("/");
}

export async function readUpload(relativePath: string) {
  const key = safeKey(relativePath);
  if (s3Configured()) {
    try {
      const object = await s3().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
      if (object.Body) return Buffer.from(await object.Body.transformToByteArray());
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      if (name !== "NoSuchKey" && name !== "NotFound") throw error;
    }
  }
  const absolute = path.resolve(root, key);
  if (!absolute.startsWith(root + path.sep)) throw new DomainError("Некорректный путь");
  return readFile(absolute);
}

export function uploadType(filePath: string) {
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".webp")) return "image/webp";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  return "image/jpeg";
}

export function photoFiles(formData: FormData) {
  const files = formData
    .getAll("photos")
    .filter((file): file is File => file instanceof File && file.size > 0);
  if (files.length > maxPhotos) throw new DomainError("За один раз можно выбрать не больше 10 фото");
  return files;
}

export function assertPhotoRoom(existing: number, incoming: number) {
  if (existing + incoming <= maxPhotos) return;
  const room = Math.max(0, maxPhotos - existing);
  if (room === 0) throw new DomainError("У товара уже 10 фото");
  throw new DomainError(room === 1 ? "Можно добавить ещё 1 фото" : `Можно добавить ещё ${room} фото`);
}
