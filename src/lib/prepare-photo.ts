import sharp from "sharp";
import { DomainError } from "@/lib/errors";

const longestSide = 1600;

export async function preparePlatformPhoto(input: Buffer) {
  try {
    return await sharp(input, { failOn: "none", pages: 1 })
      .rotate()
      .resize({ width: longestSide, height: longestSide, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#e8f4fc" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new DomainError("Не удалось обработать фото");
  }
}
