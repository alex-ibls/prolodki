import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function decodeXml(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function unzipEntry(file: string, entry: string) {
  try {
    return execFileSync("unzip", ["-p", file, entry], {
      maxBuffer: 20 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    }).toString("utf8");
  } catch {
    return null;
  }
}

function sharedStrings(xml: string) {
  const rows: string[] = [];
  for (const part of xml.split(/<si[\s>]/).slice(1)) {
    const texts = [...part.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((match) => decodeXml(match[1] ?? ""));
    rows.push(texts.join(""));
  }
  return rows;
}

function headerKey(value: string) {
  return value.trim().toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ");
}

export function readXlsxBuffer(data: Buffer) {
  const dir = mkdtempSync(join(tmpdir(), "prolodki-xlsx-"));
  const file = join(dir, "book.xlsx");
  try {
    writeFileSync(file, data);
    return readXlsxTable(file);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function readXlsxTable(file: string) {
  const sharedXml = unzipEntry(file, "xl/sharedStrings.xml");
  const shared = sharedXml ? sharedStrings(sharedXml) : [];
  const sheet = unzipEntry(file, "xl/worksheets/sheet1.xml");
  if (!sheet) throw new Error("В книге нет первого листа");
  const table: string[][] = [];
  for (const row of sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = new Map<number, string>();
    for (const cell of row[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cell[1] ?? "";
      const inner = cell[2] ?? "";
      const ref = /r="([A-Z]+)\d+"/.exec(attrs)?.[1] ?? "";
      const type = /t="([^"]+)"/.exec(attrs)?.[1];
      const raw = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1] ?? "";
      const inline = [...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((match) => decodeXml(match[1] ?? "")).join("");
      const value = type === "s" ? (shared[Number(raw)] ?? "") : type === "inlineStr" || type === "str" ? inline : decodeXml(raw);
      let index = 0;
      for (const char of ref) index = index * 26 + char.charCodeAt(0) - 64;
      if (index > 0) cells.set(index, value.trim());
    }
    if (cells.size === 0) continue;
    const width = Math.max(...cells.keys());
    table.push(Array.from({ length: width }, (_, index) => cells.get(index + 1) ?? ""));
  }
  if (table.length === 0) throw new Error("В таблице нет строк");
  const headers = table[0].map(headerKey);
  const records = table.slice(1).filter((row) => row.some((cell) => cell.trim())).map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (header) record[header] = row[index] ?? "";
    });
    return record;
  });
  return records;
}
