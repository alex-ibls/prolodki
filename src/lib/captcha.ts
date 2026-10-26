import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt, timingSafeEqual } from "crypto";
import { deflateSync } from "zlib";
import { cookies } from "next/headers";

const COOKIE = "prolodki_captcha";
const TTL_SECONDS = 60 * 10;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const SCALE = 4;
const GLYPH_W = 5;
const GLYPH_H = 7;
const GAP = 10;
const PAD = 18;

/** 5×7, старший бит слева. Без 0/O и 1/I, чтобы код можно было прочитать. */
const FONT: Record<string, number[]> = {
  A: [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  B: [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
  C: [0b01111, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b01111],
  D: [0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110],
  E: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
  F: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
  G: [0b01111, 0b10000, 0b10000, 0b10111, 0b10001, 0b10001, 0b01111],
  H: [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  J: [0b00111, 0b00001, 0b00001, 0b00001, 0b10001, 0b10001, 0b01110],
  K: [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
  L: [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
  M: [0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001],
  N: [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
  P: [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
  Q: [0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101],
  R: [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
  S: [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
  T: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  U: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  V: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  W: [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b10101, 0b01010],
  X: [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
  Y: [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
  Z: [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111],
  "2": [0b01110, 0b10001, 0b00001, 0b00010, 0b00100, 0b01000, 0b11111],
  "3": [0b11110, 0b00001, 0b00001, 0b01110, 0b00001, 0b00001, 0b11110],
  "4": [0b00100, 0b01100, 0b10100, 0b10100, 0b11111, 0b00100, 0b00100],
  "5": [0b11111, 0b10000, 0b10000, 0b11110, 0b00001, 0b00001, 0b11110],
  "6": [0b01110, 0b10000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
  "7": [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
  "8": [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
  "9": [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00001, 0b01110],
};

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET не задан");
  return value;
}

function key() {
  return createHash("sha256").update(secret()).digest();
}

function seal(code: string, exp: number) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(`${code}.${exp}`), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

function readToken(token: string) {
  try {
    const raw = Buffer.from(token, "base64url");
    if (raw.length < 29) return null;
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const encrypted = raw.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    const [code, expRaw] = plain.split(".");
    const exp = Number(expRaw);
    if (!code || !Number.isFinite(exp) || exp < Date.now()) return null;
    return code;
  } catch {
    return null;
  }
}

export function createCaptcha() {
  let code = "";
  for (let i = 0; i < 5; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  const exp = Date.now() + TTL_SECONDS * 1000;
  return { code, token: seal(code.toLowerCase(), exp), maxAge: TTL_SECONDS };
}

export async function verifyCaptcha(answer: string) {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  jar.delete(COOKIE);
  const expected = token ? readToken(token) : null;
  const given = answer.trim().toLowerCase().replace(/\s/g, "");
  if (!expected || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export const captchaCookie = {
  name: COOKIE,
  maxAge: TTL_SECONDS,
};

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(data: Buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = CRC_TABLE[(crc ^ data[i]!) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const name = Buffer.from(type);
  const sum = Buffer.alloc(4);
  sum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, sum]);
}

export function renderCaptchaPng(code: string) {
  const width = PAD * 2 + code.length * GLYPH_W * SCALE + (code.length - 1) * GAP;
  const height = PAD * 2 + GLYPH_H * SCALE;
  const pixels = new Uint8Array(width * height * 4);

  const put = (x: number, y: number, r: number, g: number, b: number, a = 255) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = (y * width + x) * 4;
    const alpha = a / 255;
    pixels[i] = Math.round(pixels[i]! * (1 - alpha) + r * alpha);
    pixels[i + 1] = Math.round(pixels[i + 1]! * (1 - alpha) + g * alpha);
    pixels[i + 2] = Math.round(pixels[i + 2]! * (1 - alpha) + b * alpha);
    pixels[i + 3] = 255;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) put(x, y, 243 + (x % 3) - 1, 239, 230);
  }

  const stroke = (x0: number, y0: number, x1: number, y1: number, color: [number, number, number]) => {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / steps);
      const y = Math.round(y0 + ((y1 - y0) * i) / steps);
      put(x, y, color[0], color[1], color[2], 140);
      put(x, y + 1, color[0], color[1], color[2], 90);
    }
  };

  for (let i = 0; i < 3; i++) {
    stroke(0, randomInt(height), width - 1, randomInt(height), i === 1 ? [196, 98, 45] : [20, 48, 71]);
  }

  for (let i = 0; i < code.length; i++) {
    const glyph = FONT[code[i]!];
    if (!glyph) continue;
    const ox = PAD + i * (GLYPH_W * SCALE + GAP) + randomInt(-2, 3);
    const oy = PAD + randomInt(-2, 3);
    const ink: [number, number, number] = i % 2 === 0 ? [20, 48, 71] : [28, 42, 58];
    for (let gy = 0; gy < GLYPH_H; gy++) {
      const row = glyph[gy]!;
      for (let gx = 0; gx < GLYPH_W; gx++) {
        if ((row & (1 << (GLYPH_W - 1 - gx))) === 0) continue;
        for (let py = 0; py < SCALE; py++) {
          for (let px = 0; px < SCALE; px++) put(ox + gx * SCALE + px, oy + gy * SCALE + py, ink[0], ink[1], ink[2]);
        }
      }
    }
  }

  for (let i = 0; i < 70; i++) {
    put(randomInt(width), randomInt(height), randomInt(80, 180), randomInt(70, 140), randomInt(60, 120), 180);
  }

  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const start = y * (width * 4 + 1);
    raw[start] = 0;
    Buffer.from(pixels.buffer, pixels.byteOffset + y * width * 4, width * 4).copy(raw, start + 1);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
